import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbstractOpenAI } from './abstract-openai'
import { IMessageRequest } from './interfaces'
import { fetchSSE } from '../utils'

vi.mock('../utils', () => {
    return {
        defaultAPIURL: 'https://api.openai.com',
        defaultAPIURLPath: '/v1/chat/completions',
        fetchSSE: vi.fn(),
        getSettings: vi.fn().mockResolvedValue({ noModelsAPISupport: false }),
    }
})

class TestOpenAIEngine extends AbstractOpenAI {
    constructor(
        private readonly model: string,
        private readonly apiURL = 'https://api.openai.com',
        private readonly apiURLPath = '/v1/chat/completions'
    ) {
        super()
    }

    async getAPIModel(): Promise<string> {
        return this.model
    }

    async getAPIKey(): Promise<string> {
        return 'test-api-key'
    }

    async getAPIURL(): Promise<string> {
        return this.apiURL
    }

    async getAPIURLPath(): Promise<string> {
        return this.apiURLPath
    }
}

interface MockFetchSSEOptions {
    body?: BodyInit | null
    onMessage: (data: string) => Promise<void>
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

    return {
        req,
        onMessage,
        onError,
        onFinished,
    }
}

describe('AbstractOpenAI', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('routes GPT-5 models on official endpoint to Responses API and parses response deltas', async () => {
        const engine = new TestOpenAIEngine('gpt-5')
        const { req, onMessage, onFinished } = createMessageRequest()

        vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
            expect(input).toBe('https://api.openai.com/v1/responses')
            expect(typeof options.body).toBe('string')
            const payload = JSON.parse(options.body as string)
            expect(payload.model).toBe('gpt-5')
            expect(payload.stream).toBe(true)
            expect(payload.reasoning).toEqual({ effort: 'minimal' })
            expect(payload.reasoning_effort).toBeUndefined()
            expect(payload.input).toBe('Translate hello to Chinese')
            expect(payload.instructions).toBe('You are a translator')
            expect(payload.messages).toBeUndefined()

            await options.onMessage(JSON.stringify({ type: 'response.output_text.delta', delta: '你好' }))
            await options.onMessage(JSON.stringify({ type: 'response.completed', response: {} }))
        })

        await engine.sendMessage(req)

        expect(onMessage).toHaveBeenCalledWith({ content: '你好', role: 'assistant' })
        expect(onFinished).toHaveBeenCalledWith('stop')
    })

    it('keeps chat completions behavior for GPT-4 models', async () => {
        const engine = new TestOpenAIEngine('gpt-4')
        const { req, onMessage, onFinished } = createMessageRequest()

        vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
            expect(input).toBe('https://api.openai.com/v1/chat/completions')
            expect(typeof options.body).toBe('string')
            const payload = JSON.parse(options.body as string)
            expect(payload.model).toBe('gpt-4')
            expect(payload.messages).toEqual([
                {
                    role: 'user',
                    content: 'You are a translator\n\nTranslate hello to Chinese',
                },
            ])
            expect(payload.temperature).toBe(0)

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

    it('does not send reasoning_effort for GPT-5 code models', async () => {
        const engine = new TestOpenAIEngine('gpt-5-code')
        const { req } = createMessageRequest()

        vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
            expect(input).toBe('https://api.openai.com/v1/responses')
            const payload = JSON.parse(options.body as string)
            expect(payload.model).toBe('gpt-5-code')
            expect(payload.stream).toBe(true)
            expect(payload.reasoning_effort).toBeUndefined()
            expect(payload.reasoning).toBeUndefined()

            await options.onMessage(JSON.stringify({ type: 'response.completed', response: {} }))
        })

        await engine.sendMessage(req)
    })

    it('does not send reasoning_effort for GPT-5 mini code models', async () => {
        const engine = new TestOpenAIEngine('gpt-5-mini-code')
        const { req } = createMessageRequest()

        vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
            expect(input).toBe('https://api.openai.com/v1/responses')
            const payload = JSON.parse(options.body as string)
            expect(payload.model).toBe('gpt-5-mini-code')
            expect(payload.reasoning_effort).toBeUndefined()
            expect(payload.reasoning).toBeUndefined()

            await options.onMessage(JSON.stringify({ type: 'response.completed', response: {} }))
        })

        await engine.sendMessage(req)
    })

    it('sends reasoning effort low for GPT-5 pro models via Responses API', async () => {
        const engine = new TestOpenAIEngine('gpt-5-pro')
        const { req } = createMessageRequest()

        vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
            expect(input).toBe('https://api.openai.com/v1/responses')
            const payload = JSON.parse(options.body as string)
            expect(payload.model).toBe('gpt-5-pro')
            expect(payload.stream).toBe(true)
            expect(payload.reasoning).toEqual({ effort: 'low' })
            expect(payload.reasoning_effort).toBeUndefined()

            await options.onMessage(JSON.stringify({ type: 'response.completed', response: {} }))
        })

        await engine.sendMessage(req)
    })

    it('sends reasoning effort low for GPT-5 mini pro models via Responses API', async () => {
        const engine = new TestOpenAIEngine('gpt-5-mini-pro')
        const { req } = createMessageRequest()

        vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
            expect(input).toBe('https://api.openai.com/v1/responses')
            const payload = JSON.parse(options.body as string)
            expect(payload.model).toBe('gpt-5-mini-pro')
            expect(payload.reasoning).toEqual({ effort: 'low' })
            expect(payload.reasoning_effort).toBeUndefined()

            await options.onMessage(JSON.stringify({ type: 'response.completed', response: {} }))
        })

        await engine.sendMessage(req)
    })

    it('does not send reasoning_effort for GPT-5 chat models', async () => {
        const engine = new TestOpenAIEngine('gpt-5-chat')
        const { req } = createMessageRequest()

        vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
            expect(input).toBe('https://api.openai.com/v1/responses')
            const payload = JSON.parse(options.body as string)
            expect(payload.model).toBe('gpt-5-chat')
            expect(payload.stream).toBe(true)
            expect(payload.reasoning_effort).toBeUndefined()
            expect(payload.reasoning).toBeUndefined()

            await options.onMessage(JSON.stringify({ type: 'response.completed', response: {} }))
        })

        await engine.sendMessage(req)
    })

    describe('modelOverride', () => {
        it('should use modelOverride instead of getAPIModel when provided', async () => {
            const engine = new TestOpenAIEngine('gpt-4o')
            const { req } = createMessageRequest()
            req.modelOverride = 'gpt-3.5-turbo'

            vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
                const body = JSON.parse(options.body as string)
                expect(body.model).toBe('gpt-3.5-turbo')
                await options.onMessage(
                    JSON.stringify({
                        // eslint-disable-next-line camelcase
                        choices: [{ delta: { content: 'hi' }, finish_reason: null }],
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
            expect(vi.mocked(fetchSSE)).toHaveBeenCalled()
        })

        it('should use getAPIModel when modelOverride is not provided', async () => {
            const engine = new TestOpenAIEngine('gpt-4o')
            const { req } = createMessageRequest()

            vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
                const body = JSON.parse(options.body as string)
                expect(body.model).toBe('gpt-4o')
                await options.onMessage(
                    JSON.stringify({
                        // eslint-disable-next-line camelcase
                        choices: [{ delta: {}, finish_reason: 'stop' }],
                    })
                )
            })

            await engine.sendMessage(req)
            expect(vi.mocked(fetchSSE)).toHaveBeenCalled()
        })

        it('should ignore empty string modelOverride and use getAPIModel', async () => {
            const engine = new TestOpenAIEngine('gpt-4o')
            const { req } = createMessageRequest()
            req.modelOverride = ''

            vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
                const body = JSON.parse(options.body as string)
                expect(body.model).toBe('gpt-4o')
                await options.onMessage(
                    JSON.stringify({
                        // eslint-disable-next-line camelcase
                        choices: [{ delta: {}, finish_reason: 'stop' }],
                    })
                )
            })

            await engine.sendMessage(req)
            expect(vi.mocked(fetchSSE)).toHaveBeenCalled()
        })

        it('should apply correct request params for overridden model', async () => {
            // Engine is configured with gpt-4o, but override to o1
            // o1 is routed to Responses API, so reasoning_effort becomes reasoning.effort
            const engine = new TestOpenAIEngine('gpt-4o')
            const { req } = createMessageRequest()
            req.modelOverride = 'o1'

            vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
                expect(input).toBe('https://api.openai.com/v1/responses')
                const body = JSON.parse(options.body as string)
                expect(body.model).toBe('o1')
                // o-series reasoning_effort is transformed to reasoning.effort for Responses API
                expect(body.reasoning).toEqual({ effort: 'low' })
                expect(body.reasoning_effort).toBeUndefined()
                expect(body.temperature).toBeUndefined()
                await options.onMessage(JSON.stringify({ type: 'response.completed', response: {} }))
            })

            await engine.sendMessage(req)
        })
    })
})
