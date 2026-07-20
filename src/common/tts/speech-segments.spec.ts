import { describe, expect, it } from 'vitest'
import { findSpeechWordIndex, getSpeechWordStarts, segmentSpeechText } from './speech-segments'

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
