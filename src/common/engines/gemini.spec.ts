import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetcher = vi.fn()
const storageSet = vi.fn()
const storageGet = vi.fn(async () => ({}))

vi.mock('../universal-fetch', () => ({
    getUniversalFetch: () => fetcher,
}))

vi.mock('../utils', () => ({
    fetchSSE: vi.fn(),
    getSettings: vi.fn(async () => ({ geminiAPIURL: 'https://generativelanguage.googleapis.com' })),
    getBrowser: vi.fn(async () => ({
        storage: { local: { get: storageGet, set: storageSet } },
    })),
}))

import { fetchSSE } from '../utils'
import { Gemini, resolveGeminiThinkingConfig } from './gemini'

const jsonResponse = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Bad Request',
    json: async () => body,
})

describe('Gemini.listModels', () => {
    beforeEach(() => {
        fetcher.mockReset()
        storageSet.mockReset()
        storageGet.mockReset()
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

    it('caches per-model thinking capabilities for sendMessage', async () => {
        fetcher.mockResolvedValue(
            jsonResponse(200, {
                models: [
                    {
                        name: 'models/gemini-3.5-flash-lite',
                        supportedGenerationMethods: ['generateContent'],
                        thinking: true,
                    },
                    { name: 'models/gemini-3.8-flash-tts', supportedGenerationMethods: ['generateContent'] },
                ],
            })
        )
        await new Gemini().listModels('key')
        expect(storageSet).toHaveBeenCalledWith({
            'gemini-model-capabilities': {
                'gemini-3.5-flash-lite': { thinking: true },
                'gemini-3.8-flash-tts': { thinking: false },
            },
        })
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

// Thinking support matrix per
// https://ai.google.dev/gemini-api/docs/generate-content/thinking
describe('resolveGeminiThinkingConfig', () => {
    describe('thinking disabled', () => {
        it('disables 2.5 Flash and Flash-Lite via thinkingBudget 0', () => {
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash', false, true)).toEqual({ thinkingBudget: 0 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash-lite', false, true)).toEqual({ thinkingBudget: 0 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash-lite-preview-04-2025', false, true)).toEqual({
                thinkingBudget: 0,
            })
        })

        it('uses the minimum budget 128 for 2.5 Pro since thinking cannot be disabled', () => {
            expect(resolveGeminiThinkingConfig('gemini-2.5-pro', false, true)).toEqual({ thinkingBudget: 128 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-pro-preview-06-05', false, true)).toEqual({
                thinkingBudget: 128,
            })
        })

        it('uses minimal thinkingLevel for 3.x models that accept it', () => {
            expect(resolveGeminiThinkingConfig('gemini-3-flash-preview', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.6-flash', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.1-flash-lite', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.5-flash-lite', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.1-flash-lite-image', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
        })

        it('uses low thinkingLevel where minimal is rejected (Pro, 3.8, Gemini 4)', () => {
            expect(resolveGeminiThinkingConfig('gemini-3-pro-preview', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.1-pro-preview', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.8-flash', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.7-flash', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-4-argon', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-robotics-er-2-preview', false, true)).toEqual({
                thinkingLevel: 'low',
            })
        })

        it('uses minimal thinkingLevel for Gemma 4 (its documented "off" value)', () => {
            expect(resolveGeminiThinkingConfig('gemma-4-26b-a4b-it', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemma-4-31b-it', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
        })

        it('uses thinkingLevel for *-latest aliases which track the newest generation', () => {
            expect(resolveGeminiThinkingConfig('gemini-flash-latest', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-pro-latest', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-flash-lite-latest', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
        })

        it('omits thinkingConfig for unclassified families instead of guessing', () => {
            expect(resolveGeminiThinkingConfig('gemini-omni-flash-preview', false, true)).toBeUndefined()
            expect(resolveGeminiThinkingConfig('deep-research-preview-04-2026', false, true)).toBeUndefined()
            expect(resolveGeminiThinkingConfig('nano-banana-pro-preview', false, true)).toBeUndefined()
        })
    })

    describe('thinking enabled', () => {
        it('lets 3.x+ models use their default thinking level', () => {
            expect(resolveGeminiThinkingConfig('gemini-3-flash-preview', true, true)).toEqual({})
            expect(resolveGeminiThinkingConfig('gemini-4-argon', true, true)).toEqual({})
        })

        it('enables dynamic thinking for 2.x models', () => {
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash', true, true)).toEqual({ thinkingBudget: -1 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-pro', true, true)).toEqual({ thinkingBudget: -1 })
        })

        it('enables thinking on Gemma 4 via thinkingLevel high (its default is off)', () => {
            expect(resolveGeminiThinkingConfig('gemma-4-26b-a4b-it', true, true)).toEqual({
                thinkingLevel: 'high',
            })
        })

        it('omits thinkingConfig for unclassified families', () => {
            expect(resolveGeminiThinkingConfig('gemini-omni-flash-preview', true, true)).toBeUndefined()
        })
    })

    describe('models that reject thinkingConfig', () => {
        it('returns undefined when the models API reports thinking is unsupported', () => {
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash-preview-tts', false, false)).toBeUndefined()
            expect(resolveGeminiThinkingConfig('gemini-3.8-flash-tts', true, false)).toBeUndefined()
            expect(resolveGeminiThinkingConfig('aqa', false, false)).toBeUndefined()
        })
    })

    describe('unknown capability (manually typed or stale list)', () => {
        it('falls back to name-based rules', () => {
            expect(resolveGeminiThinkingConfig('gemini-3-flash-preview', false)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash', false)).toEqual({ thinkingBudget: 0 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-pro', false)).toEqual({ thinkingBudget: 128 })
        })
    })
})

describe('Gemini capability cache without storage.local', () => {
    it('never writes the cache into storage.sync (the settings file on desktop)', async () => {
        vi.resetModules()
        const syncSet = vi.fn()
        vi.doMock('../utils', () => ({
            fetchSSE: vi.fn(),
            getSettings: vi.fn(async () => ({ geminiAPIURL: 'https://generativelanguage.googleapis.com' })),
            getBrowser: vi.fn(async () => ({ storage: { sync: { get: vi.fn(), set: syncSet } } })),
        }))
        const { Gemini: FreshGemini } = await import('./gemini')
        fetcher.mockResolvedValue(
            jsonResponse(200, {
                models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }],
            })
        )
        const models = await new FreshGemini().listModels('key')
        expect(models.map((m) => m.id)).toEqual(['gemini-2.5-flash'])
        expect(syncSet).not.toHaveBeenCalled()
        vi.doUnmock('../utils')
    })
})

describe('Gemini.sendMessage stream', () => {
    const eventsFor = (chunks: unknown[]) => {
        vi.mocked(fetchSSE).mockImplementationOnce(async (_url, options) => {
            const onMessage = (options as { onMessage: (msg: string) => Promise<void> }).onMessage
            for (const chunk of chunks) {
                await onMessage(JSON.stringify(chunk))
            }
        })
    }

    const send = async (chunks: unknown[]) => {
        eventsFor(chunks)
        const onMessage = vi.fn().mockResolvedValue(undefined)
        const onError = vi.fn()
        const onFinished = vi.fn()
        await new Gemini().sendMessage({
            rolePrompt: 'You are a translator',
            commandPrompt: 'Translate hello',
            modelOverride: 'gemini-2.5-flash',
            onMessage,
            onError,
            onFinished,
            signal: new AbortController().signal,
        })
        return { onMessage, onError, onFinished }
    }

    it('keeps a STOP chunk that still carries text, and finishes as stop', async () => {
        const { onMessage, onError, onFinished } = await send([
            {
                candidates: [
                    {
                        content: { parts: [{ text: '你好' }], role: 'model' },
                        finishReason: 'STOP',
                    },
                ],
            },
        ])
        expect(onMessage).toHaveBeenCalledWith({ content: '你好', role: '' })
        expect(onFinished).toHaveBeenCalledWith('stop')
        expect(onError).not.toHaveBeenCalled()
    })

    it('emits the last text segment when it shares a chunk with MAX_TOKENS', async () => {
        const { onMessage, onError, onFinished } = await send([
            { candidates: [{ content: { parts: [{ text: '你好' }], role: 'model' } }] },
            {
                candidates: [
                    {
                        content: { parts: [{ text: '世界' }], role: 'model' },
                        finishReason: 'MAX_TOKENS',
                    },
                ],
            },
        ])
        expect(onMessage.mock.calls.map((call) => call[0].content)).toEqual(['你好', '世界'])
        expect(onFinished).toHaveBeenCalledWith('max_tokens')
        expect(onError).not.toHaveBeenCalled()
    })

    it('finishes a STOP candidate that has no content instead of throwing', async () => {
        const { onMessage, onError, onFinished } = await send([
            { candidates: [{ content: { parts: [{ text: '你好' }], role: 'model' } }] },
            { candidates: [{ finishReason: 'STOP', index: 0 }] },
        ])
        expect(onMessage).toHaveBeenCalledWith({ content: '你好', role: '' })
        expect(onFinished).toHaveBeenCalledWith('stop')
        expect(onError).not.toHaveBeenCalled()
    })
})
