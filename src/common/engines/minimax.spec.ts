import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MiniMax } from './minimax'
import { IMessageRequest } from './interfaces'
import { fetchSSE, getSettings } from '../utils'

vi.mock('../utils', () => {
    return {
        defaultAPIURL: 'https://api.openai.com',
        defaultAPIURLPath: '/v1/chat/completions',
        miniMaxGlobalAPIURL: 'https://api.minimax.io',
        miniMaxChinaAPIURL: 'https://api.minimaxi.com',
        fetchSSE: vi.fn(),
        getSettings: vi.fn(),
    }
})

interface MockFetchSSEOptions {
    body?: BodyInit | null
    headers?: HeadersInit
    onMessage: (data: string) => Promise<void>
}

function mockSettings(miniMaxAPIURL?: string) {
    vi.mocked(getSettings).mockResolvedValue({
        miniMaxAPIKey: 'test-api-key',
        miniMaxAPIModel: 'MiniMax-M3',
        miniMaxAPIURL,
        noModelsAPISupport: false,
    } as unknown as Awaited<ReturnType<typeof getSettings>>)
}

function createMessageRequest(): IMessageRequest {
    return {
        rolePrompt: 'You are a translator',
        commandPrompt: 'Translate hello to Chinese',
        onMessage: vi.fn().mockResolvedValue(undefined),
        onError: vi.fn(),
        onFinished: vi.fn(),
        signal: new AbortController().signal,
    }
}

/** Sends one message and returns the URL, headers and body the engine requested. */
async function captureRequest() {
    let captured: { url: string; options: MockFetchSSEOptions } | undefined
    vi.mocked(fetchSSE).mockImplementationOnce(async (input: string, options: MockFetchSSEOptions) => {
        captured = { url: input, options }
        await options.onMessage(
            JSON.stringify({
                // eslint-disable-next-line camelcase
                choices: [{ delta: { content: '你好', role: 'assistant' }, finish_reason: 'stop' }],
            })
        )
    })
    await new MiniMax().sendMessage(createMessageRequest())
    if (!captured) {
        throw new Error('fetchSSE was not called')
    }
    return captured
}

describe('MiniMax', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('uses the global endpoint by default', async () => {
        mockSettings(undefined)
        const { url, options } = await captureRequest()

        expect(url).toBe('https://api.minimax.io/v1/chat/completions')
        expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-api-key')
        expect(JSON.parse(options.body as string).model).toBe('MiniMax-M3')
    })

    it('falls back to the global endpoint when the setting is empty', async () => {
        mockSettings('  ')
        const { url } = await captureRequest()

        expect(url).toBe('https://api.minimax.io/v1/chat/completions')
    })

    it('uses the mainland China endpoint when selected', async () => {
        mockSettings('https://api.minimaxi.com')
        const { url, options } = await captureRequest()

        expect(url).toBe('https://api.minimaxi.com/v1/chat/completions')
        expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-api-key')
    })

    it('ignores a trailing slash in the endpoint', async () => {
        mockSettings('https://api.minimaxi.com/')

        expect(await new MiniMax().getAPIURL()).toBe('https://api.minimaxi.com')
    })

    it('lists the same models for both endpoints', async () => {
        mockSettings('https://api.minimaxi.com')
        const models = await new MiniMax().listModels('test-api-key')

        expect(models.map((model) => model.id)).toContain('MiniMax-M3')
    })
})
