import { useEffect, useRef, useState } from 'react'
import { listen, type Event, type UnlistenFn } from '@tauri-apps/api/event'
import { InlineLookup } from '../../common/components/InlineLookup'
import { Window } from '../components/Window'
import { setupAnalysis } from '../../common/analysis'
import { commands } from '../bindings'
import '../../common/i18n.js'

export function InlineLookupWindow() {
    const [translatedText, setTranslatedText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const lastTextRef = useRef('')

    useEffect(() => {
        setupAnalysis()
    }, [])

    // Listen for new text selection -> reset display
    useEffect(() => {
        let unlisten: UnlistenFn | undefined
        ;(async () => {
            unlisten = await listen('change-text', (event: Event<string>) => {
                const selectedText = event.payload
                if (selectedText && selectedText !== lastTextRef.current) {
                    lastTextRef.current = selectedText
                    setTranslatedText('')
                    setIsLoading(true)
                }
            })
        })()
        return () => {
            unlisten?.()
        }
    }, [])

    // Listen for streaming translated text from Translator
    useEffect(() => {
        let unlisten: UnlistenFn | undefined
        ;(async () => {
            unlisten = await listen('translated-text-chunk', (event: Event<{ text: string; done: boolean }>) => {
                const { text, done } = event.payload
                setTranslatedText(text)
                if (done) {
                    setIsLoading(false)
                }
            })
        })()
        return () => {
            unlisten?.()
        }
    }, [])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                commands.hideInlineLookupWindow()
            }
        }
        document.addEventListener('keydown', handler)
        return () => {
            document.removeEventListener('keydown', handler)
        }
    }, [])

    useEffect(() => {
        let unlisten: UnlistenFn | undefined
        ;(async () => {
            const appWindow = (await import('@tauri-apps/api/webviewWindow')).WebviewWindow.getCurrent()
            appWindow
                .onFocusChanged(({ payload: focused }: Event<boolean>) => {
                    if (!focused) {
                        commands.hideInlineLookupWindow()
                    }
                })
                .then((cb: UnlistenFn) => {
                    unlisten = cb
                })
        })()
        return () => {
            unlisten?.()
        }
    }, [])

    const handleClose = () => {
        commands.hideInlineLookupWindow()
    }

    return (
        <Window>
            <InlineLookup translatedText={translatedText} isLoading={isLoading} onClose={handleClose} />
        </Window>
    )
}
