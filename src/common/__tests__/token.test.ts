import { describe, it, expect } from 'vitest'
import { countTokens } from '../token'

describe('countTokens', () => {
    it('falls back to default model when unsupported', () => {
        const n = countTokens('hello world', 'unsupported-model')
        expect(typeof n).toBe('number')
    })
})
