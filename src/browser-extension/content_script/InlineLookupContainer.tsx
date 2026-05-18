import { useCallback, useEffect, useRef, useState } from 'react'
import { detectLang, LangCode } from '@/common/lang'
import { translate } from '@/common/translate'
import { useSettings } from '@/common/hooks/useSettings'
import { actionService } from '@/common/services/action'
import { Action } from '@/common/internal-services/db'
import { InlineLookup } from '@/common/components/InlineLookup'

export interface InlineLookupContainerProps {
    text: string
    onClose?: () => void
}

export function InlineLookupContainer({ text, onClose }: InlineLookupContainerProps) {
    const { settings } = useSettings()
    const [translatedText, setTranslatedText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const abortControllerRef = useRef<AbortController | null>(null)

    const doTranslate = useCallback(
        async (text: string, signal: AbortSignal) => {
            if (!text.trim()) {
                return
            }

            setIsLoading(true)
            setTranslatedText('')

            try {
                const sourceLang = await detectLang(text)
                const targetLang: LangCode =
                    sourceLang === 'zh-Hans' || sourceLang === 'zh-Hant'
                        ? 'en'
                        : (settings.defaultTargetLanguage as LangCode | undefined) ?? 'en'

                let action: Action | undefined
                try {
                    action = (await actionService.getByMode('translate')) ?? undefined
                } catch {
                    // ignore
                }
                if (!action) {
                    action = {
                        idx: 0,
                        name: 'Translate',
                        mode: 'translate',
                        updatedAt: Date.now().toString(),
                        createdAt: Date.now().toString(),
                    }
                }

                await translate({
                    action,
                    signal,
                    text,
                    detectFrom: sourceLang,
                    detectTo: targetLang,
                    onMessage: async (message) => {
                        if (!message.content) {
                            return
                        }
                        setTranslatedText((prev) => {
                            if (message.isFullText) {
                                return message.content
                            }
                            return prev + message.content
                        })
                    },
                    onFinish: () => {
                        setIsLoading(false)
                    },
                    onError: () => {
                        setIsLoading(false)
                    },
                })
            } catch (error: unknown) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return
                }
                setIsLoading(false)
            }
        },
        [settings.defaultTargetLanguage]
    )

    useEffect(() => {
        abortControllerRef.current?.abort()
        const controller = new AbortController()
        abortControllerRef.current = controller
        doTranslate(text, controller.signal)
        return () => {
            controller.abort()
        }
    }, [text, doTranslate])

    return <InlineLookup translatedText={translatedText} isLoading={isLoading} onClose={onClose} />
}
