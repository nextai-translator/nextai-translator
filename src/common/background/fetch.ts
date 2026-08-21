import { isFirefox } from '../utils'
import { BackgroundEventNames } from './eventnames'
import { ReadableStream as ReadableStreamPolyfill } from 'web-streams-polyfill/ponyfill'

export interface BackgroundFetchRequestMessage {
    type: 'open' | 'abort'
    details?: { url: string; options: RequestInit }
}

export interface BackgroundFetchResponseMessage
    extends Pick<Response, 'ok' | 'status' | 'statusText' | 'redirected' | 'type' | 'url'> {
    error?: { message: string; name: string }
    status: number
    data?: string
}

async function readText(stream: ReadableStream) {
    const reader = stream.getReader()
    let text = ''
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { done, value } = await reader.read()
        if (done) {
            break
        }
        const str = new TextDecoder().decode(value)
        text += str
    }
    return text
}

export async function backgroundFetch(input: string, options: RequestInit) {
    return new Promise<Response>((resolve, reject) => {
        ;(async () => {
            const { signal, ...fetchOptions } = options
            if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'))
                return
            }

            const ReadableStream = isFirefox()
                ? (ReadableStreamPolyfill as typeof window.ReadableStream)
                : window.ReadableStream
            const textEncoder = new TextEncoder()
            // Guards the promise, not just the resolve path: every exit of this
            // bridge (data, error, disconnect) has to settle it exactly once,
            // otherwise the caller awaits forever.
            let settled = false
            const browser = (await import('webextension-polyfill')).default
            const port = browser.runtime.connect({ name: BackgroundEventNames.fetch })
            const message: BackgroundFetchRequestMessage = {
                type: 'open',
                details: { url: input, options: fetchOptions },
            }

            const readableStream = new ReadableStream({
                start(controller) {
                    port.onMessage.addListener((msg: BackgroundFetchResponseMessage) => {
                        const { data, error, ...restResp } = msg
                        if (error) {
                            const e = new Error()
                            e.message = error.message
                            e.name = error.name
                            // Erroring the stream only reaches a caller that
                            // already has the Response; before that the
                            // rejection is the only signal it can observe.
                            if (!settled) {
                                settled = true
                                reject(e)
                            }
                            controller.error(e)
                            return
                        }
                        controller.enqueue(textEncoder.encode(data))
                        if (!settled) {
                            resolve({
                                ...restResp,
                                body: readableStream,
                                text: () => readText(readableStream),
                                json: async () => {
                                    const text = await readText(readableStream)
                                    return JSON.parse(text)
                                },
                            } as unknown as Response)
                            settled = true
                        }
                    })

                    port.onDisconnect.addListener(() => {
                        signal?.removeEventListener('abort', handleAbort)
                        // The background disconnects on every terminal path,
                        // including ones that never posted a message (an abort,
                        // or the service worker being torn down mid-request).
                        if (!settled) {
                            settled = true
                            reject(
                                signal?.aborted
                                    ? new DOMException('Aborted', 'AbortError')
                                    : new Error('The connection to the background was closed before any response')
                            )
                        }
                        try {
                            controller.close()
                        } catch (e) {
                            // may throw if controller is errored
                        }
                    })

                    port.postMessage(message)
                },
            })

            function handleAbort() {
                port.postMessage({ type: 'abort' })
            }
            signal?.addEventListener('abort', handleAbort)
        })()
    })
}
