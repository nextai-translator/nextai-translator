import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AtlasCloud } from './atlascloud'
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
        atlasCloudAPIKey: 'sk-test-key',
        atlasCloudAPIModel: 'deepseek-ai/DeepSeek-V3.1-Terminus',
        ...overrides,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
}

describe('AtlasCloud', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('resolves the hosted endpoint, key and model', async () => {
        mockSettings()
        const engine = new AtlasCloud()
        expect(await engine.getAPIURL()).toBe('https://api.atlascloud.ai')
        expect(await engine.getAPIKey()).toBe('sk-test-key')
        expect(await engine.getAPIModel()).toBe('deepseek-ai/DeepSeek-V3.1-Terminus')
        expect(await engine.getAPIURLPath()).toBe('/v1/chat/completions')
    })

    it('lists models from /v1/models with the bearer key', async () => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({
                data: [
                    {
                        id: 'deepseek-ai/DeepSeek-V3.1-Terminus',
                        name: 'DeepSeek V3.1 Terminus',
                        description: 'DeepSeek V3.1 Terminus',
                    },
                    { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', name: 'Qwen3-235B-A22B-Instruct-2507' },
                ],
            }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new AtlasCloud()
        const models = await engine.listModels(undefined)

        expect(fetcher).toHaveBeenCalledWith(
            'https://api.atlascloud.ai/v1/models',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({ Authorization: 'Bearer sk-test-key' }),
            })
        )
        expect(models).toEqual([
            {
                id: 'deepseek-ai/DeepSeek-V3.1-Terminus',
                name: 'DeepSeek V3.1 Terminus',
                description: 'DeepSeek V3.1 Terminus',
            },
            {
                id: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
                name: 'Qwen3-235B-A22B-Instruct-2507',
                description: undefined,
            },
        ])
    })

    it('falls back to the model id when the catalog omits a display name', async () => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ data: [{ id: 'some/model-id' }] }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new AtlasCloud()
        expect(await engine.listModels(undefined)).toEqual([
            { id: 'some/model-id', name: 'some/model-id', description: undefined },
        ])
    })

    it('omits the Authorization header when no key is configured (the catalog is public)', async () => {
        mockSettings({ atlasCloudAPIKey: '' })
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ data: [] }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new AtlasCloud()
        await engine.listModels(undefined)

        const headers = fetcher.mock.calls[0][1].headers
        expect(headers.Authorization).toBeUndefined()
    })

    it('throws a clear error on an invalid key', async () => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({ status: 401, statusText: 'Unauthorized' })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new AtlasCloud()
        await expect(engine.listModels(undefined)).rejects.toThrow('Invalid API key')
    })
})
