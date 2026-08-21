import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../utils', () => ({
    isFirefox: () => false,
}))

type MessageListener = (msg: Record<string, unknown>) => void

function createMockPort() {
    const messageListeners: MessageListener[] = []
    const disconnectListeners: (() => void)[] = []
    return {
        onMessage: {
            addListener: (listener: MessageListener) => messageListeners.push(listener),
        },
        onDisconnect: {
            addListener: (listener: () => void) => disconnectListeners.push(listener),
        },
        postMessage: vi.fn(),
        disconnect: vi.fn(),
        emitMessage: (msg: Record<string, unknown>) => messageListeners.forEach((listener) => listener(msg)),
        emitDisconnect: () => disconnectListeners.forEach((listener) => listener()),
    }
}

let port: ReturnType<typeof createMockPort>
const connect = vi.fn(() => port)

vi.mock('webextension-polyfill', () => ({
    default: {
        runtime: {
            connect: (...args: unknown[]) => connect(...(args as [])),
        },
    },
}))

// The port is only created after an awaited dynamic import, so tests have to
// wait for the connection before they can drive it.
async function waitForConnect() {
    for (let i = 0; i < 100; i++) {
        if (port.postMessage.mock.calls.length > 0) {
            return
        }
        await new Promise((resolve) => setTimeout(resolve, 0))
    }
    throw new Error('backgroundFetch never opened the port')
}

const okResponse = { ok: true, status: 200, statusText: 'OK', redirected: false, type: 'basic', url: 'https://x' }

describe('backgroundFetch', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        port = createMockPort()
    })

    it('rejects when the background reports an error before any data', async () => {
        const { backgroundFetch } = await import('./fetch')
        const promise = backgroundFetch('https://x', {})
        await waitForConnect()

        port.emitMessage({ error: { message: 'Failed to fetch', name: 'TypeError' } })
        port.emitDisconnect()

        await expect(promise).rejects.toMatchObject({ message: 'Failed to fetch', name: 'TypeError' })
    })

    it('rejects when the port disconnects without sending anything', async () => {
        const { backgroundFetch } = await import('./fetch')
        const promise = backgroundFetch('https://x', {})
        await waitForConnect()

        port.emitDisconnect()

        await expect(promise).rejects.toThrow(/closed before any response/)
    })

    it('rejects with an AbortError when the signal is already aborted', async () => {
        const { backgroundFetch } = await import('./fetch')
        const controller = new AbortController()
        controller.abort()

        await expect(backgroundFetch('https://x', { signal: controller.signal })).rejects.toMatchObject({
            name: 'AbortError',
        })
    })

    it('rejects with an AbortError when the request is aborted mid-flight', async () => {
        const { backgroundFetch } = await import('./fetch')
        const controller = new AbortController()
        const promise = backgroundFetch('https://x', { signal: controller.signal })
        await waitForConnect()

        controller.abort()
        port.emitDisconnect()

        await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    })

    it('resolves with a readable response for a normal stream', async () => {
        const { backgroundFetch } = await import('./fetch')
        const promise = backgroundFetch('https://x', {})
        await waitForConnect()

        port.emitMessage({ ...okResponse, data: 'hello ' })
        port.emitMessage({ ...okResponse, data: 'world' })

        const response = await promise
        expect(response.status).toBe(200)

        port.emitDisconnect()
        await expect(response.text()).resolves.toBe('hello world')
    })

    it('keeps an already resolved response resolved and surfaces a late error on the stream', async () => {
        const { backgroundFetch } = await import('./fetch')
        const promise = backgroundFetch('https://x', {})
        await waitForConnect()

        port.emitMessage({ ...okResponse, data: 'partial' })
        const response = await promise

        port.emitMessage({ error: { message: 'Network error', name: 'TypeError' } })
        await expect(response.text()).rejects.toMatchObject({ message: 'Network error' })
    })
})
