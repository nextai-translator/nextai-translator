import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
    getSettings: vi.fn(),
}))

vi.mock('../universal-fetch', () => ({
    getUniversalFetch: () => mocks.fetch,
}))

vi.mock('../utils', () => ({
    getSettings: mocks.getSettings,
}))

import { detectLang, localDetectLang } from '../lang'

const jsonResponse = (body: unknown, ok = true) => ({
    ok,
    json: async () => body,
    text: async () => JSON.stringify(body),
})

describe('detectLang', () => {
    beforeEach(() => {
        mocks.fetch.mockReset()
        mocks.getSettings.mockReset()
        mocks.getSettings.mockResolvedValue({ languageDetectionEngine: 'baidu' })
    })

    it('uses the remote engine when it answers', async () => {
        mocks.fetch.mockResolvedValue(jsonResponse({ error: 0, lan: 'zh' }))
        expect(await detectLang('要求')).toBe('zh-Hans')
    })

    // Regression for #1906: a failed remote detection used to be reported as
    // English, which combined with a Chinese default target language turned
    // Chinese input into a Chinese -> Chinese "translation".
    it('falls back to local detection when the remote engine returns no language', async () => {
        mocks.fetch.mockResolvedValue(jsonResponse({ error: 997, msg: 'anti-bot' }))
        expect(await detectLang('要求')).toBe('zh-Hans')
    })

    it('falls back to local detection when the remote engine returns an unknown code', async () => {
        mocks.fetch.mockResolvedValue(jsonResponse({ error: 0, lan: 'wyw' }))
        expect(await detectLang('要求')).toBe('zh-Hans')
    })

    it('falls back to local detection on a non-ok response', async () => {
        mocks.fetch.mockResolvedValue(jsonResponse(null, false))
        expect(await detectLang('要求')).toBe('zh-Hans')
    })

    it('falls back to local detection when the remote request throws', async () => {
        mocks.fetch.mockRejectedValue(new Error('network down'))
        expect(await detectLang('要求')).toBe('zh-Hans')
        expect(await detectLang('hello world')).toBe('en')
    })

    it('honours the local engine without touching the network', async () => {
        mocks.getSettings.mockResolvedValue({ languageDetectionEngine: 'local' })
        expect(await detectLang('要求')).toBe('zh-Hans')
        expect(mocks.fetch).not.toHaveBeenCalled()
    })
})

describe('localDetectLang', () => {
    it('detects simplified and traditional Chinese', async () => {
        expect(await localDetectLang('要求')).toBe('zh-Hans')
        expect(await localDetectLang('翻譯經常中譯中')).toBe('zh-Hant')
    })
})
