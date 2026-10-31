/**
 * Latency tracing for the translation hot path.
 *
 * When a translation "feels slow", the time is spread over hops that live in
 * different processes, so guessing which one is guilty is hopeless:
 *
 *   submit -> prompt build -> settings read -> engine setup -> HTTP dispatch
 *     -> DNS/TCP/TLS -> provider thinking -> first byte -> IPC -> first paint
 *
 * Every hop below is stamped with a monotonic clock, and a finished trace is
 * printed as one line that attributes the whole latency:
 *
 *   [ttft] translate total=1487ms reason=stop provider=DeepSeek
 *          model=deepseek-flash chars=42
 *          | submit->prompt 1.2 | prompt->settings 0.5 | ... | headers->first-token 1360.0
 *          | rust client 1.2 send 96.4 first-chunk 841.0
 *
 * That makes the difference between "our network code is slow" and "the
 * provider itself took 1.3s to think" obvious at a glance.
 *
 * Finished traces are kept in a small ring buffer and exposed on
 * `window.__translatePerf` (`last()`, `all()`, `csv()`, `enable()`,
 * `disable()`), so a slow run can still be inspected after the fact. On the
 * desktop build the line is also forwarded to the Rust side, which prints it to
 * the app's stdout.
 *
 * Tracing is always on for the desktop app and can be switched on for the
 * browser extension with `localStorage.setItem('translate-perf', 'on')`.
 */

export const perfTraceStorageKey = 'translate-perf'

const MAX_FINISHED_TRACES = 20

export type PerfMeta = Record<string, string | number | boolean | undefined>

export interface PerfMark {
    label: string
    /** Milliseconds since the trace started, rounded to 0.1ms. */
    at: number
}

export interface PerfPhase {
    /** `from->to` when both marks are known, otherwise the mark label. */
    label: string
    delta: number
}

export interface PerfTraceSummary {
    name: string
    reason: string
    total: number
    phases: PerfPhase[]
    marks: PerfMark[]
    meta: PerfMeta
    /** Single-line summary, convenient for grepping logs. */
    line: string
    /** Human-readable multi-line report for the devtools console. */
    report: string
}

function now(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now()
    }
    return Date.now()
}

function round(value: number): number {
    return Math.round(value * 10) / 10
}

function isDesktopApp(): boolean {
    return typeof window !== 'undefined' && (window as unknown as Record<string, unknown>)['__TAURI__'] !== undefined
}

let tracingEnabledOverride: boolean | undefined

function isTracingEnabled(): boolean {
    if (tracingEnabledOverride !== undefined) {
        return tracingEnabledOverride
    }
    try {
        const flag = globalThis.localStorage?.getItem(perfTraceStorageKey)
        if (flag === 'off') {
            return false
        }
        if (flag === 'on') {
            return true
        }
        // eslint-disable-next-line no-empty
    } catch (e) {}
    // The desktop app has no open devtools by default, so its traces are
    // forwarded to the Rust side and printed to stdout instead.
    return isDesktopApp()
}

function formatValue(value: string | number | boolean | undefined): string {
    if (typeof value === 'number') {
        return Number.isInteger(value) ? String(value) : String(round(value))
    }
    return String(value)
}

function formatMeta(meta: PerfMeta): string {
    return Object.entries(meta)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => `${key}=${formatValue(value)}`)
        .join(' ')
}

export class PerfTrace {
    readonly name: string
    readonly startedAt: number
    readonly meta: PerfMeta
    private marks: PerfMark[] = []
    private finished = false

    constructor(name: string, meta: PerfMeta = {}) {
        this.name = name
        this.meta = { ...meta }
        this.startedAt = now()
        this.marks.push({ label: 'start', at: 0 })
    }

    mark(label: string): this {
        if (this.finished) {
            return this
        }
        this.marks.push({ label, at: round(now() - this.startedAt) })
        return this
    }

    setMeta(key: string, value: string | number | boolean | undefined): this {
        if (value !== undefined) {
            this.meta[key] = value
        }
        return this
    }

    hasMark(label: string): boolean {
        return this.marks.some((mark) => mark.label === label)
    }

    private buildPhases(): PerfPhase[] {
        const phases: PerfPhase[] = []
        for (let i = 1; i < this.marks.length; i++) {
            const from = this.marks[i - 1]
            const to = this.marks[i]
            // Repeated marks (e.g. chunk counters) are skipped: they are not
            // phases and would only add noise.
            if (from.label === to.label) {
                continue
            }
            phases.push({
                label: `${from.label}->${to.label}`,
                delta: round(to.at - from.at),
            })
        }
        return phases
    }

    summary(reason: string): PerfTraceSummary {
        const phases = this.buildPhases()
        const total = round(this.marks[this.marks.length - 1].at)
        const phaseLine = phases.map((phase) => `${phase.label} ${phase.delta}`).join(' | ')
        const metaLine = formatMeta(this.meta)
        const line = `[ttft] ${this.name} total=${total}ms reason=${reason}${metaLine ? ' ' + metaLine : ''}${
            phaseLine ? ' | ' + phaseLine : ''
        }`
        const reportLines = [
            `[ttft] ${this.name} total=${total}ms reason=${reason} ${metaLine}`.trimEnd(),
            ...phases.map((phase) => `    ${phase.label.padEnd(34)} ${String(phase.delta).padStart(8)}ms`),
        ]
        return {
            name: this.name,
            reason,
            total,
            phases,
            marks: this.marks,
            meta: { ...this.meta },
            line,
            report: reportLines.join('\n'),
        }
    }

    finish(reason: string): PerfTraceSummary {
        this.finished = true
        return this.summary(reason)
    }

    /** Marks the trace as closed without producing a summary. */
    discard(): void {
        this.finished = true
    }
}

let activeTrace: PerfTrace | undefined
const finishedTraces: PerfTraceSummary[] = []

export function getActivePerfTrace(): PerfTrace | undefined {
    return activeTrace
}

/** Starts a trace, closing any trace that is still open as `superseded`. */
export function beginPerfTrace(name: string, meta: PerfMeta = {}): PerfTrace {
    if (activeTrace) {
        finishPerfTrace('superseded', { silent: true })
    }
    activeTrace = new PerfTrace(name, meta)
    return activeTrace
}

/** Starts a trace only when none is active, so any caller can be the first. */
export function ensurePerfTrace(name: string, meta: PerfMeta = {}): PerfTrace {
    if (activeTrace) {
        return activeTrace
    }
    return beginPerfTrace(name, meta)
}

/** Adds a mark to the active trace. A no-op when no trace is active. */
export function markPerf(label: string): void {
    activeTrace?.mark(label)
}

/** Adds a mark only if the trace does not have it yet (e.g. the first paint). */
export function markPerfOnce(label: string): void {
    if (activeTrace && !activeTrace.hasMark(label)) {
        activeTrace.mark(label)
    }
}

export function setPerfMeta(key: string, value: string | number | boolean | undefined): void {
    activeTrace?.setMeta(key, value)
}

/**
 * Merges timings reported by the Rust fetch layer into the active trace.
 * These are the only numbers that separate "the network was slow" from
 * "the model was thinking".
 */
export interface FetchStreamTimings {
    /** Time spent building/looking up the HTTP client (DNS/TCP/TLS happens on send). */
    clientMs?: number
    /** Time from `send()` to response headers: connect + TLS + provider queueing. */
    headersMs?: number
    /** Time from the command start to the first response body chunk. */
    firstChunkMs?: number
}

export function recordPerfServerTimings(timings: FetchStreamTimings): void {
    if (!activeTrace) {
        return
    }
    activeTrace.setMeta('rust.client', timings.clientMs)
    activeTrace.setMeta('rust.send', timings.headersMs)
    activeTrace.setMeta('rust.first-chunk', timings.firstChunkMs)
}

function pushFinished(summary: PerfTraceSummary): void {
    finishedTraces.push(summary)
    while (finishedTraces.length > MAX_FINISHED_TRACES) {
        finishedTraces.shift()
    }
}

function forwardToDesktopApp(line: string): void {
    if (!isDesktopApp()) {
        return
    }
    import('@/tauri/bindings')
        .then(({ commands }) => commands.logPerfLine(line))
        .catch(() => {
            // Tracing must never break a translation.
        })
}

export interface FinishPerfOptions {
    silent?: boolean
    /** Only finish the trace when it is still the active one. */
    trace?: PerfTrace
}

/** Closes the active trace, logs it, and returns its summary. */
export function finishPerfTrace(reason = 'done', options: FinishPerfOptions = {}): PerfTraceSummary | undefined {
    if (!activeTrace) {
        return undefined
    }
    if (options.trace && options.trace !== activeTrace) {
        return undefined
    }
    const trace = activeTrace
    activeTrace = undefined
    const summary = trace.finish(reason)
    pushFinished(summary)
    if (options.silent || !isTracingEnabled()) {
        return summary
    }
    try {
        // eslint-disable-next-line no-console
        console.info(summary.report)
        forwardToDesktopApp(summary.line)
        // eslint-disable-next-line no-empty
    } catch (e) {}
    return summary
}

export function getFinishedPerfTraces(): PerfTraceSummary[] {
    return [...finishedTraces]
}

export function getLastPerfTrace(): PerfTraceSummary | undefined {
    return finishedTraces[finishedTraces.length - 1]
}

export function clearPerfTraces(): void {
    finishedTraces.length = 0
}

export function setPerfTracingEnabled(enabled: boolean | undefined): void {
    tracingEnabledOverride = enabled
    try {
        if (enabled === undefined) {
            globalThis.localStorage?.removeItem(perfTraceStorageKey)
        } else {
            globalThis.localStorage?.setItem(perfTraceStorageKey, enabled ? 'on' : 'off')
        }
        // eslint-disable-next-line no-empty
    } catch (e) {}
}

function tracesToCsv(traces: PerfTraceSummary[]): string {
    const header = 'name,reason,total,phases,meta'
    const rows = traces.map((trace) =>
        [
            trace.name,
            trace.reason,
            trace.total,
            JSON.stringify(trace.phases.map((phase) => `${phase.label}=${phase.delta}`)),
            JSON.stringify(trace.meta),
        ]
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(',')
    )
    return [header, ...rows].join('\n')
}

interface PerfConsoleApi {
    enable: () => void
    disable: () => void
    last: () => PerfTraceSummary | undefined
    all: () => PerfTraceSummary[]
    csv: () => string
    clear: () => void
    active: () => PerfTrace | undefined
}

if (typeof window !== 'undefined') {
    ;(window as unknown as Record<string, unknown>)['__translatePerf'] = {
        enable: () => setPerfTracingEnabled(true),
        disable: () => setPerfTracingEnabled(false),
        last: () => getLastPerfTrace(),
        all: () => getFinishedPerfTraces(),
        csv: () => tracesToCsv(getFinishedPerfTraces()),
        clear: () => clearPerfTraces(),
        active: () => getActivePerfTrace(),
    } satisfies PerfConsoleApi
}
