import { describe, it, expect } from 'vitest'
import { isTraditional, isSimplified } from '../traditional-or-simplified'

describe('traditional-or-simplified detection', () => {
    it('detects simplified', () => {
        expect(isSimplified('汉字测试')).toBe(true)
        expect(isTraditional('汉字测试')).toBe(false)
    })

    it('detects traditional', () => {
        expect(isTraditional('漢字測試')).toBe(true)
        expect(isSimplified('漢字測試')).toBe(false)
    })

    it('mixed not both true', () => {
        const mixed = '汉漢字'
        const t = isTraditional(mixed)
        const s = isSimplified(mixed)
        expect(t && s).toBe(false)
    })
})
