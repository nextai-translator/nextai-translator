import { describe, expect, it } from 'vitest'
import { findSpeechWordIndex, getSpeechWordStarts, matchSpokenWord, segmentSpeechText } from './speech-segments'

describe('speech word segmentation', () => {
    it('preserves punctuation while indexing English words', () => {
        const parts = segmentSpeechText('Hello, nice to meet you.', 'en')
        expect(parts.map((part) => part.text).join('')).toBe('Hello, nice to meet you.')
        expect(parts.filter((part) => part.isWordLike).map((part) => part.text)).toEqual([
            'Hello',
            'nice',
            'to',
            'meet',
            'you',
        ])
        expect(parts.filter((part) => part.isWordLike).map((part) => part.wordIndex)).toEqual([0, 1, 2, 3, 4])
    })

    it('uses locale-aware words for Chinese text', () => {
        const parts = segmentSpeechText('你好！很高兴见到你。', 'zh-Hans')
        expect(parts.map((part) => part.text).join('')).toBe('你好！很高兴见到你。')
        expect(parts.filter((part) => part.isWordLike).length).toBeGreaterThan(1)
    })

    it('produces ordered timing starts and maps character positions', () => {
        const starts = getSpeechWordStarts('Hello, nice to meet you.', 'en')
        expect(starts[0]).toBe(0)
        expect(starts.every((start, index) => index === 0 || start > starts[index - 1])).toBe(true)
        expect(starts.at(-1)).toBeLessThan(1)
        expect(findSpeechWordIndex('Hello, nice to meet you.', 'en', 7)).toBe(1)
    })
})

describe('spoken word alignment', () => {
    it('matches identical tokens in order', () => {
        const words = ['Hello', 'nice', 'to', 'meet', 'you']
        expect(matchSpokenWord(words, 0, 'Hello')).toEqual({ index: 0, next: 1 })
        expect(matchSpokenWord(words, 1, 'nice')).toEqual({ index: 1, next: 2 })
    })

    it('ignores punctuation and case differences', () => {
        expect(matchSpokenWord(['Hello', 'world'], 0, 'hello,')).toEqual({ index: 0, next: 1 })
    })

    it('consumes several local words for one service phrase', () => {
        expect(matchSpokenWord(['你', '好', '吗'], 0, '你好')).toEqual({ index: 0, next: 2 })
    })

    it('skips words the service never reported', () => {
        expect(matchSpokenWord(['well', 'hello', 'there'], 0, 'hello')).toEqual({ index: 1, next: 2 })
    })

    it('falls back to positional order on a mismatch', () => {
        expect(matchSpokenWord(['alpha', 'beta'], 0, 'gamma')).toEqual({ index: 0, next: 1 })
    })
})
