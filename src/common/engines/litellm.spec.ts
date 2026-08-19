import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LiteLLM } from './litellm'
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
        liteLLMAPIURL: 'http://localhost:4000',
        liteLLMAPIKey: 'sk-test-key',
        liteLLMAPIModel: 'gpt-4o-mini',
        ...overrides,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
}

describe('LiteLLM', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('resolves endpoint, key and model from settings', async () => {
        mockSettings()
        const engine = new LiteLLM()
        expect(await engine.getAPIURL()).toBe('http://localhost:4000')
        expect(await engine.getAPIKey()).toBe('sk-test-key')
        expect(await engine.getAPIModel()).toBe('gpt-4o-mini')
        expect(await engine.getAPIURLPath()).toBe('/v1/chat/completions')
    })

    it('lists models from the proxy /v1/models endpoint with the bearer key', async () => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({
                data: [{ id: 'gpt-4o-mini' }, { id: 'anthropic/claude-sonnet-4-5' }],
            }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new LiteLLM()
        const models = await engine.listModels(undefined)

        expect(fetcher).toHaveBeenCalledWith(
            'http://localhost:4000/v1/models',
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
        mockSettings({ liteLLMAPIKey: '' })
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ data: [] }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new LiteLLM()
        await engine.listModels(undefined)

        const headers = fetcher.mock.calls[0][1].headers
        expect(headers.Authorization).toBeUndefined()
    })

    it('returns an empty list when no base URL is set', async () => {
        mockSettings({ liteLLMAPIURL: '' })
        const engine = new LiteLLM()
        expect(await engine.listModels(undefined)).toEqual([])
    })

    it('throws a clear error on an invalid key', async () => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({ status: 401, statusText: 'Unauthorized' })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new LiteLLM()
        await expect(engine.listModels(undefined)).rejects.toThrow('Invalid API key')
    })
})
