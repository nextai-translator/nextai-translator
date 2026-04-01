import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from 'baseui-sd/input'
import { Button } from 'baseui-sd/button'
import { Checkbox } from 'baseui-sd/checkbox'
import { Select, type Value } from 'baseui-sd/select'
import { useTheme } from '../hooks/useTheme'
import type { ISettings, ThemeType } from '../types'
import { getSettings, setSettings } from '../utils'
import { CUSTOM_MODEL_ID } from '../constants'

export interface InnerSettingsProps {
    showFooter?: boolean
    onSave?: (oldSettings: ISettings) => void
}

const THEME_OPTIONS: Array<{ label: string; id: ThemeType }> = [
    { label: 'Follow system', id: 'followTheSystem' },
    { label: 'Light', id: 'light' },
    { label: 'Dark', id: 'dark' },
]

export function InnerSettings({ showFooter, onSave }: InnerSettingsProps) {
    const { t } = useTranslation()
    const { theme } = useTheme()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [oldSettings, setOldSettings] = useState<ISettings | null>(null)
    const [draft, setDraft] = useState<Partial<ISettings>>({})

    useEffect(() => {
        let mounted = true
        ;(async () => {
            const s = await getSettings()
            if (!mounted) return
            setOldSettings(s)
            setDraft(s)
            setLoading(false)
        })().catch(console.error)
        return () => {
            mounted = false
        }
    }, [])

    const themeValue: Value = useMemo(() => {
        const id = (draft.themeType ?? 'followTheSystem') as ThemeType
        const label = THEME_OPTIONS.find((o) => o.id === id)?.label ?? id
        return [{ id, label }]
    }, [draft.themeType])

    const save = useCallback(async () => {
        if (!oldSettings) return
        setSaving(true)
        try {
            await setSettings({
                provider: 'Ollama',
                themeType: draft.themeType ?? oldSettings.themeType,
                enableBackgroundBlur: !!draft.enableBackgroundBlur,
                hotkey: draft.hotkey ?? '',
                displayWindowHotkey: draft.displayWindowHotkey ?? '',
                autoHideWindowWhenOutOfFocus: !!draft.autoHideWindowWhenOutOfFocus,
                ollamaAPIURL: draft.ollamaAPIURL ?? 'http://127.0.0.1:11434',
                ollamaAPIModel: draft.ollamaAPIModel ?? 'llama2',
                ollamaCustomModelName: draft.ollamaCustomModelName ?? '',
                ollamaModelLifetimeInMemory: draft.ollamaModelLifetimeInMemory ?? '5m',
            })
            onSave?.(oldSettings)
            const updated = await getSettings()
            setOldSettings(updated)
            setDraft(updated)
        } finally {
            setSaving(false)
        }
    }, [draft, oldSettings, onSave])

    if (loading || !oldSettings) {
        return <div style={{ padding: 16, color: theme.colors.contentSecondary }}>{t('Loading')}...</div>
    }

    return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{t('Provider')}</div>
                <div style={{ color: theme.colors.contentSecondary }}>Ollama</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>Ollama URL</div>
                <Input
                    value={draft.ollamaAPIURL ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, ollamaAPIURL: (e.target as HTMLInputElement).value }))}
                    placeholder='http://127.0.0.1:11434'
                    clearOnEscape
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>Ollama Model</div>
                <Input
                    value={draft.ollamaAPIModel ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, ollamaAPIModel: (e.target as HTMLInputElement).value }))}
                    placeholder='llama3.1'
                    clearOnEscape
                />
                <div style={{ color: theme.colors.contentSecondary, fontSize: 12 }}>
                    {t('Tip')}: {t('You can also use')} <code>{CUSTOM_MODEL_ID}</code> + custom model name.
                </div>
            </div>

            {(draft.ollamaAPIModel ?? '') === CUSTOM_MODEL_ID && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontWeight: 600 }}>Custom model name</div>
                    <Input
                        value={draft.ollamaCustomModelName ?? ''}
                        onChange={(e) =>
                            setDraft((d) => ({ ...d, ollamaCustomModelName: (e.target as HTMLInputElement).value }))
                        }
                        placeholder='llama3.1:8b'
                        clearOnEscape
                    />
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{t('The survival time of the Ollama model in memory')}</div>
                <Input
                    value={draft.ollamaModelLifetimeInMemory ?? ''}
                    onChange={(e) =>
                        setDraft((d) => ({ ...d, ollamaModelLifetimeInMemory: (e.target as HTMLInputElement).value }))
                    }
                    placeholder='5m'
                    clearOnEscape
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{t('Hotkey')}</div>
                <Input
                    value={draft.hotkey ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, hotkey: (e.target as HTMLInputElement).value }))}
                    placeholder='CmdOrCtrl+Shift+E'
                    clearOnEscape
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{t('Display Window Hotkey')}</div>
                <Input
                    value={draft.displayWindowHotkey ?? ''}
                    onChange={(e) =>
                        setDraft((d) => ({ ...d, displayWindowHotkey: (e.target as HTMLInputElement).value }))
                    }
                    placeholder='CmdOrCtrl+Shift+D'
                    clearOnEscape
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{t('Theme')}</div>
                <Select
                    size='compact'
                    searchable={false}
                    clearable={false}
                    value={themeValue}
                    options={THEME_OPTIONS as unknown as Array<{ label: string; id: string }>}
                    onChange={(params) => {
                        const id = params.value[0]?.id
                        if (typeof id !== 'string') {
                            return
                        }
                        setDraft((d) => ({ ...d, themeType: id as ThemeType }))
                    }}
                />
            </div>

            <Checkbox
                checked={!!draft.enableBackgroundBlur}
                onChange={(e) =>
                    setDraft((d) => ({ ...d, enableBackgroundBlur: (e.target as HTMLInputElement).checked }))
                }
            >
                {t('Enable Background Blur')}
            </Checkbox>

            <Checkbox
                checked={!!draft.autoHideWindowWhenOutOfFocus}
                onChange={(e) =>
                    setDraft((d) => ({ ...d, autoHideWindowWhenOutOfFocus: (e.target as HTMLInputElement).checked }))
                }
            >
                {t('Auto hide window when out of focus')}
            </Checkbox>

            {showFooter && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
                    <Button isLoading={saving} onClick={save}>
                        {t('Save')}
                    </Button>
                </div>
            )}
        </div>
    )
}
