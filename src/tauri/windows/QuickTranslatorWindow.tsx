import { useCallback, useEffect, useState } from 'react'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider } from 'baseui-sd'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '../../common/components/ErrorFallback'
import { GlobalSuspense } from '../../common/components/GlobalSuspense'
import { QuickTranslator, AxContext } from '../../common/components/QuickTranslator'
import { setupAnalysis } from '../../common/analysis'
import { useTheme } from '../../common/hooks/useTheme'
import { PREFIX } from '../../common/constants'
import { commands } from '../bindings'
import '../../common/i18n.js'

const engine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

export function QuickTranslatorWindow() {
    const { theme } = useTheme()

    useEffect(() => {
        setupAnalysis()
        document.body.style.margin = '0'
        document.body.style.background = 'transparent'
    }, [])

    const fetchContext = useCallback(async (wide: boolean): Promise<AxContext> => {
        const ctx = wide ? await commands.readAxContextWide() : await commands.readAxContextNarrow()
        return ctx as AxContext
    }, [])

    const hide = useCallback(() => {
        commands.hideQuickTranslatorWindow()
    }, [])

    const [tick, setTick] = useState(0)

    useEffect(() => {
        let unlisten: UnlistenFn | undefined
        let cancelled = false
        ;(async () => {
            unlisten = await listen('quick-translator-shown', () => {
                setTick((n) => n + 1)
            })
            // Race recovery: on Windows this window is created lazily on the
            // first hotkey press, so the first `quick-translator-shown` emit
            // happens before this listener is wired up. If the window is
            // already visible at mount, treat that as the missed first show.
            try {
                const visible = await WebviewWindow.getCurrent().isVisible()
                if (!cancelled && visible) {
                    setTick((n) => (n === 0 ? 1 : n))
                }
            } catch {
                // ignore — worst case the panel stays empty until the next show
            }
        })()
        return () => {
            cancelled = true
            unlisten?.()
        }
    }, [])

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <StyletronProvider value={engine}>
                <BaseProvider theme={theme}>
                    <GlobalSuspense>
                        {/* This window is pre-created (hidden) at app startup; don't
                            mount QuickTranslator — which immediately runs the context
                            picker (AX reads, history query, model call) — until the
                            panel is actually shown for the first time (#1883). Rust
                            emits `quick-translator-shown` on every show, so tick > 0
                            exactly means "has been shown at least once". */}
                        {tick > 0 && (
                            <QuickTranslator key={tick} fetchContext={fetchContext} onClose={hide} onHide={hide} />
                        )}
                    </GlobalSuspense>
                </BaseProvider>
            </StyletronProvider>
        </ErrorBoundary>
    )
}
