import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Requesty } from './requesty'
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
        requestyAPIKey: 'test-key',
        requestyAPIModel: 'openai/gpt-4o-mini',
        ...overrides,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
}

function jsonResponse(data: unknown[]) {
    return { status: 200, json: async () => ({ data }) }
}

describe('Requesty', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('resolves endpoint, key and model from settings', async () => {
        mockSettings()
        const engine = new Requesty()
        expect(await engine.getAPIURL()).toBe('https://router.requesty.ai')
        expect(await engine.getAPIKey()).toBe('test-key')
        expect(await engine.getAPIModel()).toBe('openai/gpt-4o-mini')
        expect(await engine.getAPIURLPath()).toBe('/v1/chat/completions')
    })

    it('lists managed models first, then the catalog, without duplicates', async () => {
        mockSettings()
        const fetcher = vi.fn().mockImplementation(async (url: string) => {
            if (url.endsWith('/v1/models/managed')) {
                return jsonResponse([{ id: 'gpt-5.4-mini', description: 'Managed\nsecond line' }])
            }
            return jsonResponse([{ id: 'openai/gpt-4o-mini' }, { id: 'gpt-5.4-mini' }])
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const models = await new Requesty().listModels(undefined)

        expect(fetcher).toHaveBeenCalledWith(
            'https://router.requesty.ai/v1/models/managed',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
            })
        )
        expect(fetcher).toHaveBeenCalledWith('https://router.requesty.ai/v1/models', expect.anything())
        expect(models).toEqual([
            { id: 'gpt-5.4-mini', name: 'gpt-5.4-mini', description: 'Managed' },
            { id: 'openai/gpt-4o-mini', name: 'openai/gpt-4o-mini', description: undefined },
        ])
    })

    it('lists models without a key and omits the Authorization header', async () => {
        mockSettings({ requestyAPIKey: '' })
        const fetcher = vi.fn().mockResolvedValue(jsonResponse([{ id: 'openai/gpt-4o-mini' }]))
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const models = await new Requesty().listModels(undefined)

        expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined()
        expect(models.map((m) => m.id)).toEqual(['openai/gpt-4o-mini'])
    })

    it('drops model ids containing control characters', async () => {
        mockSettings()
        const fetcher = vi
            .fn()
            .mockResolvedValue(jsonResponse([{ id: 'openai/gpt-4o-mini' }, { id: 'evil\u001b[31m' }, { id: 'a\nb' }]))
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const models = await new Requesty().listModels(undefined)

        expect(models.map((m) => m.id)).toEqual(['openai/gpt-4o-mini'])
    })

    it('still returns the catalog when the managed list fails', async () => {
        mockSettings()
        const fetcher = vi.fn().mockImplementation(async (url: string) => {
            if (url.endsWith('/v1/models/managed')) {
                throw new Error('network down')
            }
            return jsonResponse([{ id: 'openai/gpt-4o-mini' }])
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const models = await new Requesty().listModels(undefined)

        expect(models.map((m) => m.id)).toEqual(['openai/gpt-4o-mini'])
    })

    it('throws a clear error on an invalid key', async () => {
        mockSettings()
        const fetcher = vi.fn().mockResolvedValue({ status: 403, statusText: 'Forbidden' })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        await expect(new Requesty().listModels(undefined)).rejects.toThrow('Invalid API key')
    })
})
