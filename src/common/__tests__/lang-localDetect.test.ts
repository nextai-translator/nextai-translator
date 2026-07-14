import { describe, it, expect } from 'vitest'
import { localDetectLang } from '../lang'

describe('localDetectLang', () => {
    it('detects English', async () => {
        expect(await localDetectLang('This is a simple English sentence.')).toBe('en')
    })

    it('detects Simplified Chinese', async () => {
        expect(await localDetectLang('这是一个中文句子。')).toBe('zh-Hans')
    })

    it('detects Traditional Chinese', async () => {
        expect(await localDetectLang('這是一個中文句子。')).toBe('zh-Hant')
    })

    it('detects Japanese', async () => {
        expect(await localDetectLang('これは日本語の文章です。')).toBe('ja')
    })

    it('defaults to en when unknown', async () => {
        expect(await localDetectLang('😀😀😀')).toBe('en')
    })
})
