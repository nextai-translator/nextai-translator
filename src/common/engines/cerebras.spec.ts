import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Cerebras } from './cerebras'
import { IMessageRequest } from './interfaces'
import { fetchSSE } from '../utils'

vi.mock('../utils', () => {
    return {
        fetchSSE: vi.fn(),
        getSettings: vi.fn().mockResolvedValue({
            cerebrasAPIKey: 'test-api-key',
            cerebrasAPIModel: 'test-model',
            noModelsAPISupport: false,
        }),
    }
})

interface MockFetchSSEOptions {
    body?: BodyInit | null
    onMessage: (data: string) => Promise<void>
    onError?: (err: unknown) => void
}

function createMessageRequest() {
    const onMessage = vi.fn().mockResolvedValue(undefined)
    const onError = vi.fn()
    const onFinished = vi.fn()
    const req: IMessageRequest = {
        rolePrompt: 'You are a translator',
        commandPrompt: 'Translate hello to Chinese',
        onMessage,
        onError,
        onFinished,
        signal: new AbortController().signal,
    }
    return { req, onMessage, onError, onFinished }
}

describe('Cerebras', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('emits streamed content and finishes on a trailing chunk', async () => {
        const engine = new Cerebras()
        const { req, onMessage, onFinished } = createMessageRequest()

        vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
            expect(input).toBe('https://api.cerebras.ai/v1/chat/completions')
            expect(typeof options.body).toBe('string')
            const payload = JSON.parse(options.body as string)
            expect(payload.model).toBe('test-model')
            expect(payload.stream).toBe(true)

            await options.onMessage(
                JSON.stringify({
                    choices: [{ delta: { content: '你好', role: 'assistant' } }],
                })
            )
            await options.onMessage(
                JSON.stringify({
                    // eslint-disable-next-line camelcase
                    choices: [{ delta: {}, finish_reason: 'stop' }],
                })
            )
        })

        await engine.sendMessage(req)

        expect(onMessage).toHaveBeenCalledWith({ content: '你好', role: 'assistant' })
        expect(onFinished).toHaveBeenCalledWith('stop')
    })

    it('emits the final text segment when content and finish_reason arrive together in one chunk', async () => {
        const engine = new Cerebras()
        const { req, onMessage, onFinished } = createMessageRequest()

        vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
            expect(input).toBe('https://api.cerebras.ai/v1/chat/completions')

            // OpenRouter forwarding Cerebras emits the last text segment
            // together with finish_reason in the same SSE chunk instead of
            // sending an empty delta on a trailing chunk like the OpenAI API
            // does. The content must still be emitted and must not be dropped.
            await options.onMessage(
                JSON.stringify({
                    // eslint-disable-next-line camelcase
                    choices: [{ delta: { content: '最后一段', role: 'assistant' }, finish_reason: 'stop' }],
                })
            )
        })

        await engine.sendMessage(req)

        expect(onMessage).toHaveBeenCalledWith({ content: '最后一段', role: 'assistant' })
        expect(onFinished).toHaveBeenCalledWith('stop')
    })
})
