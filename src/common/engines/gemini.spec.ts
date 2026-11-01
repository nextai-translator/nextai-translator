import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetcher = vi.fn()

vi.mock('../universal-fetch', () => ({
    getUniversalFetch: () => fetcher,
}))

vi.mock('../utils', () => ({
    fetchSSE: vi.fn(),
    getSettings: vi.fn(async () => ({ geminiAPIURL: 'https://generativelanguage.googleapis.com' })),
}))

import { Gemini } from './gemini'

const jsonResponse = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Bad Request',
    json: async () => body,
})

describe('Gemini.listModels', () => {
    beforeEach(() => {
        fetcher.mockReset()
    })

    it('returns nothing without an API key', async () => {
        expect(await new Gemini().listModels(undefined)).toEqual([])
        expect(fetcher).not.toHaveBeenCalled()
    })

    it('lists only models that support generateContent', async () => {
        fetcher.mockResolvedValue(
            jsonResponse(200, {
                models: [
                    { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
                    { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
                    { name: 'models/gemini-legacy' },
                ],
            })
        )
        const models = await new Gemini().listModels('key')
        expect(models.map((m) => m.id)).toEqual(['gemini-3.5-flash-lite', 'gemini-legacy'])
    })

    it("throws the API's error message instead of returning an empty list", async () => {
        fetcher.mockResolvedValue(
            jsonResponse(400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.' } })
        )
        await expect(new Gemini().listModels('bad')).rejects.toThrow('API key not valid')
    })

    it('throws a status message when the error body is not JSON', async () => {
        fetcher.mockResolvedValue({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => {
                throw new Error('not json')
            },
        })
        await expect(new Gemini().listModels('key')).rejects.toThrow('403 Forbidden')
    })
})
