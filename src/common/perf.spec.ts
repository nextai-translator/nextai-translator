import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
    beginPerfTrace,
    clearPerfTraces,
    finishPerfTrace,
    getActivePerfTrace,
    getFinishedPerfTraces,
    getLastPerfTrace,
    markPerf,
    markPerfOnce,
    recordPerfServerTimings,
    setPerfTracingEnabled,
} from './perf'

describe('perf traces', () => {
    beforeEach(() => {
        setPerfTracingEnabled(false)
        clearPerfTraces()
        finishPerfTrace('cleanup', { silent: true })
        vi.restoreAllMocks()
    })

    it('does nothing without an active trace', () => {
        expect(getActivePerfTrace()).toBeUndefined()
        expect(() => markPerf('paint')).not.toThrow()
        expect(finishPerfTrace('nowhere')).toBeUndefined()
    })

    it('turns marks into cumulative phases', () => {
        beginPerfTrace('translate', { provider: 'DeepSeek' })
        markPerf('prompt')
        markPerf('settings')
        markPerf('first-token')
        const summary = finishPerfTrace('stop')

        expect(summary?.name).toBe('translate')
        expect(summary?.reason).toBe('stop')
        expect(summary?.phases.map((phase) => phase.label)).toEqual([
            'start->prompt',
            'prompt->settings',
            'settings->first-token',
        ])
        expect(summary?.line).toContain('provider=DeepSeek')
        expect(summary?.line).toContain('reason=stop')
        expect(summary?.total).toBeGreaterThanOrEqual(0)
    })

    it('keeps a server timing breakdown in the summary', () => {
        beginPerfTrace('translate')
        markPerf('headers')
        recordPerfServerTimings({ clientMs: 1, headersMs: 42, firstChunkMs: 1300 })
        const summary = finishPerfTrace('stop')

        expect(summary?.meta['rust.client']).toBe(1)
        expect(summary?.meta['rust.send']).toBe(42)
        expect(summary?.meta['rust.first-chunk']).toBe(1300)
        expect(summary?.line).toContain('rust.first-chunk=1300')
    })

    it('marks the first paint only once', () => {
        beginPerfTrace('translate')
        markPerfOnce('paint')
        markPerfOnce('paint')
        markPerfOnce('paint')
        const summary = finishPerfTrace('stop')

        expect(summary?.marks.filter((mark) => mark.label === 'paint')).toHaveLength(1)
    })

    it('closes the previous trace when a new one starts', () => {
        beginPerfTrace('first')
        beginPerfTrace('second')

        expect(getFinishedPerfTraces().map((trace) => trace.reason)).toEqual(['superseded'])
        expect(getActivePerfTrace()?.name).toBe('second')
    })

    it('never closes a newer trace from a stale caller', () => {
        const stale = beginPerfTrace('first')
        const current = beginPerfTrace('second')

        // An aborted request settling late must not steal the next one's trace.
        expect(finishPerfTrace('aborted', { trace: stale })).toBeUndefined()
        expect(getActivePerfTrace()).toBe(current)
    })

    it('keeps the newest traces in a bounded ring buffer', () => {
        for (let i = 0; i < 30; i++) {
            beginPerfTrace(`translate-${i}`)
            finishPerfTrace('stop')
        }
        const traces = getFinishedPerfTraces()
        expect(traces).toHaveLength(20)
        expect(traces[traces.length - 1].name).toBe('translate-29')
        expect(getLastPerfTrace()?.name).toBe('translate-29')
    })
})
