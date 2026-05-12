import { useEffect, useRef, useState } from 'react'
import { listen, type Event, type UnlistenFn } from '@tauri-apps/api/event'
import { InlineLookup } from '../../common/components/InlineLookup'
import { setupAnalysis } from '../../common/analysis'
import { commands } from '../bindings'
import '../../common/i18n.js'
import { useTheme } from '../../common/hooks/useTheme'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider } from 'baseui-sd'
import { PREFIX } from '../../common/constants'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '../../common/components/ErrorFallback'

const engine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

export function InlineLookupWindow() {
    const { theme } = useTheme()
    const [translatedText, setTranslatedText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const lastTextRef = useRef('')

    useEffect(() => {
        setupAnalysis()
    }, [])

    useEffect(() => {
        document.body.style.margin = '0'
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

    const handleClose = () => {
        commands.hideInlineLookupWindow()
    }

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <StyletronProvider value={engine}>
                <BaseProvider theme={theme}>
                    <div
                        style={{
                            position: 'relative',
                            background: theme.colors.backgroundPrimary,
                            font: '14px/1.6 "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"',
                            letterSpacing: '-0.01em',
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            textRendering: 'optimizeLegibility',
                            minHeight: '100vh',
                        }}
                    >
                        <InlineLookup translatedText={translatedText} isLoading={isLoading} onClose={handleClose} />
                    </div>
                </BaseProvider>
            </StyletronProvider>
        </ErrorBoundary>
    )
}
