import * as Sentry from '@sentry/react'
import ReactGA from 'react-ga4'
import { getSettings, isDesktopApp, isUserscript } from './utils'

export async function setupAnalysis() {
    if (isUserscript()) {
        return
    }
    doSetupAnalysis()
}

let isAnalysisSetupped = false

export async function doSetupAnalysis() {
    if (isAnalysisSetupped) {
        return
    }
    isAnalysisSetupped = true
    const settings = await getSettings()
    if (settings.disableCollectingStatistics) {
        return
    }
    if (isDesktopApp()) {
        Sentry.init({
            dsn: 'https://477519542bd6491cb347ca3f55fcdce6@o441417.ingest.sentry.io/4505051776090112',
            // Session Replay is deliberately NOT enabled: this UI mutates the
            // DOM at a very high rate (streaming translations, per-word
            // reading highlights), and Replay's recording pipeline in
            // @sentry/react 7.x leaks a worker message listener per flush
            // under that load - sessions sampled for replay degraded into an
            // unusable, CPU-burning UI within hours (~83k leaked listeners
            // measured). Do not re-add without upgrading the SDK and load
            // testing against streaming translations.
            integrations: [
                new Sentry.BrowserTracing({
                    traceFetch: false,
                }),
            ],
            // Performance Monitoring
            tracesSampleRate: 0.1,
        })
        ReactGA.initialize('G-D7054DX333')
    }
}
