/* eslint-disable camelcase */
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

describe('AtlasCloud', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockedGetSettings.mockResolvedValue({
            atlasCloudAPIKey: 'sk-test-key',
            atlasCloudAPIModel: 'openai/gpt-4.1-mini',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
    })

    it('uses the Atlas Cloud chat endpoint and settings', async () => {
        const engine = new AtlasCloud()

        expect(await engine.getAPIURL()).toBe('https://api.atlascloud.ai/v1')
        expect(await engine.getAPIURLPath()).toBe('/chat/completions')
        expect(await engine.getAPIKey()).toBe('sk-test-key')
        expect(await engine.getAPIModel()).toBe('openai/gpt-4.1-mini')
    })

    it('lists visible chat-completion models from the public catalog', async () => {
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({
                data: [
                    {
                        model: 'openai/gpt-4.1-mini',
                        displayName: 'GPT-4.1 Mini',
                        display_console: true,
                        supported_protocols: ['openai.chat.completions'],
                    },
                    {
                        model: 'hidden/model',
                        displayName: 'Hidden Model',
                        display_console: false,
                        supported_protocols: ['openai.chat.completions'],
                    },
                    {
                        model: 'image/model',
                        displayName: 'Image Model',
                        display_console: true,
                        supported_protocols: ['openai.images'],
                    },
                ],
            }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const engine = new AtlasCloud()
        const models = await engine.listModels()

        expect(fetcher).toHaveBeenCalledWith('https://api.atlascloud.ai/api/v1/models', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        expect(models).toEqual([{ id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini' }])
    })

    it('falls back to the model id when no display name is available', async () => {
        mockedGetUniversalFetch.mockReturnValue(
            vi.fn().mockResolvedValue({
                status: 200,
                json: async () => ({
                    data: [
                        {
                            model: 'anthropic/claude-sonnet-4-6',
                            display_console: true,
                            supported_protocols: ['openai.chat.completions'],
                        },
                    ],
                }),
            })
        )

        const engine = new AtlasCloud()
        await expect(engine.listModels()).resolves.toEqual([
            { id: 'anthropic/claude-sonnet-4-6', name: 'anthropic/claude-sonnet-4-6' },
        ])
    })

    it('returns an empty list for an unexpected catalog shape', async () => {
        mockedGetUniversalFetch.mockReturnValue(
            vi.fn().mockResolvedValue({
                status: 200,
                json: async () => ({ data: null }),
            })
        )

        const engine = new AtlasCloud()
        await expect(engine.listModels()).resolves.toEqual([])
    })

    it('throws a clear error when the catalog request fails', async () => {
        mockedGetUniversalFetch.mockReturnValue(
            vi.fn().mockResolvedValue({ status: 503, statusText: 'Service Unavailable' })
        )

        const engine = new AtlasCloud()
        await expect(engine.listModels()).rejects.toThrow('Failed to list models: Service Unavailable')
    })
})
