import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APIRoute } from './api-route'
import { getSettings } from '../utils'
import { getUniversalFetch } from '../universal-fetch'

vi.mock('../utils', () => ({ getSettings: vi.fn() }))
vi.mock('../universal-fetch', () => ({ getUniversalFetch: vi.fn() }))

const mockedGetSettings = vi.mocked(getSettings)
const mockedGetUniversalFetch = vi.mocked(getUniversalFetch)

describe('APIRoute', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockedGetSettings.mockResolvedValue({
            apiRouteAPIKey: 'sk-test-key',
            apiRouteAPIModel: 'gpt-4o-mini',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
    })

    it('uses the API-Route OpenAI-compatible endpoint', async () => {
        const engine = new APIRoute()
        expect(await engine.getAPIURL()).toBe('https://global.api-route.com')
        expect(await engine.getAPIURLPath()).toBe('/v1/chat/completions')
        expect(await engine.getAPIKey()).toBe('sk-test-key')
        expect(await engine.getAPIModel()).toBe('gpt-4o-mini')
    })

    it('lists models with the configured API key', async () => {
        const fetcher = vi.fn().mockResolvedValue({
            status: 200,
            json: async () => ({ data: [{ id: 'gpt-4o-mini' }, { id: 'claude-sonnet-4-5' }] }),
        })
        mockedGetUniversalFetch.mockReturnValue(fetcher)

        const models = await new APIRoute().listModels(undefined)

        expect(fetcher).toHaveBeenCalledWith(
            'https://global.api-route.com/v1/models',
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer sk-test-key' }),
            })
        )
        expect(models).toEqual([
            { id: 'gpt-4o-mini', name: 'gpt-4o-mini' },
            { id: 'claude-sonnet-4-5', name: 'claude-sonnet-4-5' },
        ])
    })

    it('does not request models without an API key', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockedGetSettings.mockResolvedValue({ apiRouteAPIKey: '' } as any)
        expect(await new APIRoute().listModels(undefined)).toEqual([])
        expect(mockedGetUniversalFetch).not.toHaveBeenCalled()
    })
})
