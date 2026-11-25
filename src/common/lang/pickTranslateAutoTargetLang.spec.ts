import { describe, expect, it } from 'vitest'
import { pickTranslateAutoTargetLang } from './index'

describe('pickTranslateAutoTargetLang', () => {
    it.each(['zh-Hans', 'zh-Hant'] as const)('uses the configured Korean target for %s', (sourceLang) => {
        expect(pickTranslateAutoTargetLang(sourceLang, 'ko', 'ja')).toBe('ko')
    })

    it.each(['zh-Hans', 'zh-Hant'] as const)('uses English for Chinese input with a %s default', (defaultTarget) => {
        expect(pickTranslateAutoTargetLang('zh-Hans', defaultTarget, 'ja')).toBe('en')
        expect(pickTranslateAutoTargetLang('zh-Hant', defaultTarget, 'ja')).toBe('en')
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
