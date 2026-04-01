import type { Action } from '../internal-services/db'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider } from 'baseui-sd'
import { Textarea } from 'baseui-sd/textarea'
import { Button } from 'baseui-sd/button'
import { Select, Value } from 'baseui-sd/select'
import toast from 'react-hot-toast/headless'
import { useTranslation } from 'react-i18next'
import type { Client as Styletron } from 'styletron-engine-atomic'
import { translate, type TranslateQuery } from '../translate'
import { detectLang, targetLanguages, intoLangCode, type LangCode } from '../lang'
import { useSettings } from '../hooks/useSettings'
import { InnerSettings } from './Settings'
import { historyService } from '../services/history'
import { isTauri } from '../utils'
import { commands } from '@/tauri/bindings'
import type { ISettings } from '../types'
import { useTheme } from '../hooks/useTheme'

export interface TranslatorProps {
    uuid: string
    engine: Styletron
    showLogo?: boolean
    showSettingsIcon?: boolean
    showSettings?: boolean
    autoFocus?: boolean
    defaultShowSettings?: boolean
    editorRows?: number
    containerStyle?: React.CSSProperties
    onSettingsSave?: (oldSettings: ISettings) => void
    onSettingsShow?: (isShow: boolean) => void
}

export function Translator(props: TranslatorProps) {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { settings } = useSettings()

    const [text, setText] = useState('')
    const [result, setResult] = useState('')
    const [isTranslating, setIsTranslating] = useState(false)
    const [showSettings, setShowSettings] = useState(!!props.defaultShowSettings)

    const abortRef = useRef<AbortController | null>(null)

    useEffect(() => {
        if (props.showSettings !== undefined) {
            setShowSettings(!!props.showSettings)
        }
    }, [props.showSettings])

    useEffect(() => {
        props.onSettingsShow?.(showSettings)
    }, [props, showSettings])

    const sourceValue: Value = useMemo(() => {
        const id = 'auto'
        return [{ id, label: t('Auto') }]
    }, [t])

    const targetValue: Value = useMemo(() => {
        const id = (settings.defaultTargetLanguage ?? 'zh-Hans') as LangCode
        const item = targetLanguages.find(([code]) => code === id)
        return [{ id, label: item?.[1] ?? id }]
    }, [settings.defaultTargetLanguage])

    const startTranslate = useCallback(async () => {
        const input = text.trim()
        if (!input) return
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setIsTranslating(true)
        setResult('')
        console.debug('[translator] startTranslate', {
            inputLen: input.length,
            provider: 'Ollama',
            ollamaAPIURL: settings.ollamaAPIURL,
            ollamaAPIModel: settings.ollamaAPIModel,
            ollamaCustomModelName: settings.ollamaCustomModelName,
        })

        const targetLang = intoLangCode((settings.defaultTargetLanguage ?? 'zh-Hans') as LangCode)
        let sourceLang: LangCode
        try {
            sourceLang = await detectLang(input)
        } catch (e) {
            console.error(e)
            sourceLang = 'en'
        }

        const chunks: string[] = []
        try {
            const action = {
                idx: 0,
                name: 'default',
                mode: 'translate',
                updatedAt: String(Date.now()),
                createdAt: String(Date.now()),
                provider: 'Ollama',
            } satisfies Action
            const query: TranslateQuery = {
                mode: 'translate',
                text: input,
                signal: controller.signal,
                detectFrom: sourceLang,
                detectTo: targetLang,
                action,
                onStatusCode: (statusCode: number) => {
                    console.debug('[translator] ollama status', statusCode)
                },
                onMessage: async (msg: { content?: string }) => {
                    if (!msg.content) return
                    chunks.push(msg.content)
                    setResult(chunks.join(''))
                },
                onFinish: () => undefined,
                onError: (err: unknown) => {
                    console.error(err)
                    const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : JSON.stringify(err)
                    setResult(msg)
                },
            } as unknown as TranslateQuery

            await translate(query)

            const finalText = chunks.join('').trim()
            if (finalText) {
                await historyService.create({
                    text: input,
                    translatedText: finalText,
                    sourceLang,
                    targetLang,
                    provider: 'Ollama',
                })
            }
        } catch (e) {
            if ((e as { name?: string })?.name !== 'AbortError') {
                console.error(e)
                const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e)
                setResult(msg)
                toast.error(t('Translate failed'))
            }
        } finally {
            setIsTranslating(false)
        }
    }, [
        settings.defaultTargetLanguage,
        settings.ollamaAPIModel,
        settings.ollamaAPIURL,
        settings.ollamaCustomModelName,
        t,
        text,
    ])

    const stop = useCallback(() => {
        abortRef.current?.abort()
        abortRef.current = null
        setIsTranslating(false)
    }, [])

    const openHistory = useCallback(() => {
        if (!isTauri()) return
        commands.showHistoryWindow().catch(console.error)
    }, [])

    return (
        <StyletronProvider value={props.engine}>
            <BaseProvider theme={theme}>
                <div style={{ padding: 16, ...(props.containerStyle ?? {}) }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                            <div style={{ minWidth: 140 }}>
                                <Select
                                    size='compact'
                                    searchable={false}
                                    clearable={false}
                                    value={sourceValue}
                                    options={[{ id: 'auto', label: t('Auto') }]}
                                    onChange={() => {}}
                                />
                            </div>
                            <div style={{ minWidth: 180 }}>
                                <Select
                                    size='compact'
                                    searchable
                                    clearable={false}
                                    value={targetValue}
                                    options={
                                        targetLanguages.map(([code, name]) => ({
                                            id: code,
                                            label: name,
                                        })) as unknown as Array<{
                                            id: string
                                            label: string
                                        }>
                                    }
                                    onChange={(params) => {
                                        const id = params.value[0]?.id
                                        if (!id) return
                                        // persist to settings
                                        import('../utils')
                                            .then(({ setSettings }) =>
                                                setSettings({ defaultTargetLanguage: String(id) as LangCode })
                                            )
                                            .catch(console.error)
                                    }}
                                />
                            </div>
                        </div>

                        <Button kind='secondary' size='compact' onClick={openHistory}>
                            {t('History')}
                        </Button>

                        <Button kind='secondary' size='compact' onClick={() => setShowSettings((v) => !v)}>
                            {t('Settings')}
                        </Button>
                    </div>

                    {showSettings ? (
                        <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10 }}>
                            <InnerSettings
                                showFooter
                                onSave={(old) => {
                                    props.onSettingsSave?.(old)
                                }}
                            />
                        </div>
                    ) : (
                        <>
                            <Textarea
                                autoFocus={props.autoFocus}
                                rows={props.editorRows ?? 10}
                                value={text}
                                onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
                                placeholder={t('Enter text to translate')}
                                clearOnEscape
                            />

                            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                <Button onClick={startTranslate} isLoading={isTranslating}>
                                    {t('Translate')}
                                </Button>
                                <Button kind='secondary' onClick={stop} disabled={!isTranslating}>
                                    {t('Stop')}
                                </Button>
                                <Button kind='tertiary' onClick={() => setText('')} disabled={isTranslating}>
                                    {t('Clear')}
                                </Button>
                            </div>

                            <div style={{ marginTop: 14 }}>
                                <Textarea
                                    rows={props.editorRows ?? 10}
                                    value={result}
                                    onChange={() => {}}
                                    placeholder={t('Translation result')}
                                    readOnly
                                />
                            </div>
                        </>
                    )}
                </div>
            </BaseProvider>
        </StyletronProvider>
    )
}
