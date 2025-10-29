type LegacyInvokePayload = {
    cmd: string
    callback: string
    error: string
    [key: string]: unknown
}

type TauriInternals = {
    invoke: (cmd: string, args: Record<string, unknown>) => Promise<unknown>
}

type TauriWindow = (Window & typeof globalThis) & {
    __TAURI_IPC__?: (payload: LegacyInvokePayload) => void
    __TAURI_INTERNALS__?: TauriInternals
    [key: `_${string}`]: unknown
}

const isTauriWindow = (value: Window & typeof globalThis): value is TauriWindow => {
    return typeof (value as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ === 'object'
}

const globalWindow: (Window & typeof globalThis) | undefined = typeof window !== 'undefined' ? window : undefined

if (
    globalWindow &&
    isTauriWindow(globalWindow) &&
    globalWindow.__TAURI_INTERNALS__ &&
    typeof globalWindow.__TAURI_IPC__ !== 'function'
) {
    const windowWithTauri = globalWindow
    windowWithTauri.__TAURI_IPC__ = ({ cmd, callback, error, ...args }: LegacyInvokePayload) => {
        const invoke = windowWithTauri.__TAURI_INTERNALS__?.invoke
        if (typeof invoke !== 'function') {
            return
        }

        const resolveCallback = windowWithTauri[`_${callback}`]
        const rejectCallback = windowWithTauri[`_${error}`]

        invoke(cmd, args as Record<string, unknown>)
            .then((result) => {
                if (typeof resolveCallback === 'function') {
                    ;(resolveCallback as (value: unknown) => void)(result)
                }
            })
            .catch((err) => {
                if (typeof rejectCallback === 'function') {
                    ;(rejectCallback as (value: unknown) => void)(err)
                }
            })
    }
}

export {}
