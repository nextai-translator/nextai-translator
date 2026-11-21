import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenLLM } from './openllm'
import { getSettings } from '../utils'
import { getUniversalFetch } from '../universal-fetch'

vi.mock('../utils', () => {
    return {
        getSettings: vi.fn(),
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
        openLLMAPIURL: 'https://www.openllm.sh',
        openLLMAPIKey: 'sk-llm-test-key',
        openLLMAPIModel: 'plus',
        ...overrides,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
}

describe('OpenLLM', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('resolves endpoint, key and model from settings', async () => {
        mockSettings()
        const engine = new OpenLLM()
        expect(await engine.getAPIURL()).toBe('https://www.openllm.sh')
        expect(await engine.getAPIKey()).toBe('sk-llm-test-key')
        expect(await engine.getAPIModel()).toBe('plus')
        expect(await engine.getAPIURLPath()).toBe('/v1/chat/completions')
    })

    it('lists models from the /v1/models endpoint with the bearer key', async () => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({
                data: [{ id: 'plus' }, { id: 'anthropic/claude-sonnet-4-5' }],
            }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new OpenLLM()
        const models = await engine.listModels(undefined)

        expect(fetcher).toHaveBeenCalledWith(
            'https://www.openllm.sh/v1/models',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({ Authorization: 'Bearer sk-llm-test-key' }),
            })
        )
        expect(models).toEqual([
            { id: 'plus', name: 'plus' },
            { id: 'anthropic/claude-sonnet-4-5', name: 'anthropic/claude-sonnet-4-5' },
        ])
    })

    it('omits the Authorization header when no key is configured', async () => {
        mockSettings({ openLLMAPIKey: '' })
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ data: [] }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new OpenLLM()
        await engine.listModels(undefined)

        const headers = fetcher.mock.calls[0][1].headers
        expect(headers.Authorization).toBeUndefined()
    })

    it('lists models from the local daemon without a key', async () => {
        mockSettings({ openLLMAPIURL: 'http://127.0.0.1:8787', openLLMAPIKey: '' })
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ data: [{ id: 'lite' }] }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new OpenLLM()
        const models = await engine.listModels(undefined)

        expect(fetcher.mock.calls[0][0]).toBe('http://127.0.0.1:8787/v1/models')
        expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined()
        expect(models).toEqual([{ id: 'lite', name: 'lite' }])
    })

    it('returns an empty list when no base URL is set', async () => {
        mockSettings({ openLLMAPIURL: '' })
        const engine = new OpenLLM()
        expect(await engine.listModels(undefined)).toEqual([])
    })

    it('throws a clear error on an invalid key', async () => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({ status: 401, statusText: 'Unauthorized' })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new OpenLLM()
        await expect(engine.listModels(undefined)).rejects.toThrow('Invalid API key')
    })
})
