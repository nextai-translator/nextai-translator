import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RapidMLX } from './rapid-mlx'
import { fetchSSE, getSettings } from '../utils'
import { getUniversalFetch } from '../universal-fetch'

vi.mock('../utils', () => {
    return {
        defaultAPIURL: 'https://api.openai.com',
        defaultAPIURLPath: '/v1/chat/completions',
        getSettings: vi.fn(),
        fetchSSE: vi.fn(),
    }
})

vi.mock('../universal-fetch', () => {
    return {
        getUniversalFetch: vi.fn(),
    }
})

const mockedGetSettings = vi.mocked(getSettings)
const mockedGetUniversalFetch = vi.mocked(getUniversalFetch)

function mockSettings(overrides: Record<string, unknown> = {}) {
    mockedGetSettings.mockResolvedValue({
        rapidMLXAPIURL: 'http://127.0.0.1:8000/v1',
        rapidMLXAPIKey: 'sk-test-key',
        rapidMLXAPIModel: 'gpt-4o-mini',
        ...overrides,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
}

describe('RapidMLX', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('resolves endpoint, key and model from settings', async () => {
        mockSettings()
        const engine = new RapidMLX()
        expect(await engine.getAPIURL()).toBe('http://127.0.0.1:8000/v1')
        expect(await engine.getAPIKey()).toBe('sk-test-key')
        expect(await engine.getAPIModel()).toBe('gpt-4o-mini')
        expect(await engine.getAPIURLPath()).toBe('/chat/completions')
    })

    it('lists models from the server /v1/models endpoint with the bearer key', async () => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({
                data: [{ id: 'gpt-4o-mini' }, { id: 'anthropic/claude-sonnet-4-5' }],
            }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new RapidMLX()
        const models = await engine.listModels(undefined)

        expect(fetcher).toHaveBeenCalledWith(
            'http://127.0.0.1:8000/v1/models',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({ Authorization: 'Bearer sk-test-key' }),
            })
        )
        expect(models).toEqual([
            { id: 'gpt-4o-mini', name: 'gpt-4o-mini' },
            { id: 'anthropic/claude-sonnet-4-5', name: 'anthropic/claude-sonnet-4-5' },
        ])
    })

    it('omits the Authorization header when no key is configured', async () => {
        mockSettings({ rapidMLXAPIKey: '' })
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ data: [] }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new RapidMLX()
        await engine.listModels(undefined)

        const headers = fetcher.mock.calls[0][1].headers
        expect(headers.Authorization).toBeUndefined()
    })

    it.each(['', 'sk-test-key'])('streams chat with key %j and relative paths', async (apiKey) => {
        mockSettings({ rapidMLXAPIKey: apiKey, rapidMLXAPIURL: 'http://127.0.0.1:8000/v1/' })
        const onMessage = vi.fn().mockResolvedValue(undefined)
        const onFinished = vi.fn()
        const onError = vi.fn()
        vi.mocked(fetchSSE).mockImplementation(async (_url, options) => {
            await options.onMessage(JSON.stringify({ choices: [{ delta: { content: '你好' } }] }))
            // eslint-disable-next-line camelcase
            await options.onMessage(JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] }))
        })

        await new RapidMLX().sendMessage({
            rolePrompt: 'You are a translator',
            commandPrompt: 'Translate hello to Chinese',
            signal: new AbortController().signal,
            onMessage,
            onFinished,
            onError,
        })

        const [url, options] = vi.mocked(fetchSSE).mock.calls[0]
        expect(url).toBe('http://127.0.0.1:8000/v1/chat/completions')
        expect((options.headers as Record<string, string>).Authorization).toBe(apiKey ? `Bearer ${apiKey}` : undefined)
        expect(JSON.parse(options.body as string)).toMatchObject({ model: 'gpt-4o-mini', stream: true })
        expect(onMessage).toHaveBeenCalledWith({ content: '你好', role: undefined })
        expect(onFinished).toHaveBeenCalledWith('stop')
        expect(onError).not.toHaveBeenCalled()
    })

    it('uses an explicitly supplied key for model listing', async () => {
        mockSettings({ rapidMLXAPIKey: '' })
        const fetcher = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ data: [] }) })
        mockedGetUniversalFetch.mockReturnValue(fetcher)
        await new RapidMLX().listModels('explicit-key')
        expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer explicit-key')
    })

    it('identifies itself as local', () => {
        expect(new RapidMLX().isLocal()).toBe(true)
    })

    it('returns an empty list when no base URL is set', async () => {
        mockSettings({ rapidMLXAPIURL: '' })
        const engine = new RapidMLX()
        expect(await engine.listModels(undefined)).toEqual([])
    })

    it.each([401, 403, 404, 500])('reports model discovery HTTP errors (%s)', async (status) => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({ status, statusText: 'Server error' })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new RapidMLX()
        await expect(engine.listModels(undefined)).rejects.toThrow(
            status === 401 || status === 403
                ? 'Invalid API key'
                : status === 404
                ? 'Invalid API URL'
                : 'Failed to list models: Server error'
        )
    })
})
