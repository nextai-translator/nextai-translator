import { describe, expect, it } from 'vitest'
import { pickTranslateAutoTargetLang } from './index'

describe('pickTranslateAutoTargetLang', () => {
    it('maps Chinese variants to English', () => {
        expect(pickTranslateAutoTargetLang('zh-Hans', 'ja', 'ja')).toBe('en')
        expect(pickTranslateAutoTargetLang('zh-Hant', 'ja', 'ja')).toBe('en')
    })

    it('uses default target when source differs', () => {
        expect(pickTranslateAutoTargetLang('en', 'ja', 'en')).toBe('ja')
    })

    it('uses writing target when source equals default target', () => {
        expect(pickTranslateAutoTargetLang('ja', 'ja', 'en')).toBe('en')
    })

    it('uses English when writing target also matches source', () => {
        expect(pickTranslateAutoTargetLang('ja', 'ja', 'ja')).toBe('en')
    })
})
