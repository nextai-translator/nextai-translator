import { LangCode } from '../lang'

export interface SpeechTextPart {
    text: string
    start: number
    end: number
    isWordLike: boolean
    wordIndex?: number
}

interface SegmentData {
    segment: string
    index: number
    isWordLike?: boolean
}

interface WordSegmenter {
    segment: (text: string) => Iterable<SegmentData>
}

type SegmenterConstructor = new (locales?: string | string[], options?: { granularity: 'word' }) => WordSegmenter

const localeMap: Partial<Record<LangCode, string>> = {
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
    'yue': 'zh-HK',
    'lzh': 'zh-CN',
}

const segmenters = new Map<string, WordSegmenter>()

function fallbackSegments(text: string): SegmentData[] {
    const segments: SegmentData[] = []
    const pattern = /\p{Script=Han}|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu
    let cursor = 0
    for (const match of text.matchAll(pattern)) {
        const index = match.index ?? 0
        if (index > cursor) {
            segments.push({ segment: text.slice(cursor, index), index: cursor })
        }
        segments.push({ segment: match[0], index, isWordLike: true })
        cursor = index + match[0].length
    }
    if (cursor < text.length) {
        segments.push({ segment: text.slice(cursor), index: cursor })
    }
    return segments
}

function getSegments(text: string, lang: LangCode): SegmentData[] {
    const Segmenter = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter
    if (!Segmenter) {
        return fallbackSegments(text)
    }
    const locale = localeMap[lang] ?? lang
    let segmenter = segmenters.get(locale)
    if (!segmenter) {
        segmenter = new Segmenter(locale, { granularity: 'word' })
        segmenters.set(locale, segmenter)
    }
    return Array.from(segmenter.segment(text))
}

export function segmentSpeechText(text: string, lang: LangCode): SpeechTextPart[] {
    let wordIndex = 0
    return getSegments(text, lang).map(({ segment, index, isWordLike }) => {
        const part: SpeechTextPart = {
            text: segment,
            start: index,
            end: index + segment.length,
            isWordLike: Boolean(isWordLike),
        }
        if (part.isWordLike) {
            part.wordIndex = wordIndex++
        }
        return part
    })
}

export function getSpeechWordStarts(text: string, lang: LangCode): number[] {
    const words = segmentSpeechText(text, lang).filter((part) => part.isWordLike)
    const weights = words.map((word) => {
        const length = Array.from(word.text).length
        return /\p{Script=Han}/u.test(word.text) ? length : Math.max(1, Math.sqrt(length))
    })
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let elapsed = 0
    return weights.map((weight) => {
        const start = total > 0 ? elapsed / total : 0
        elapsed += weight
        return start
    })
}

export interface SpokenWordMatch {
    index?: number
    next: number
}

function normalizeSpokenText(value: string): string {
    return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

// Aligns a spoken-word boundary reported by a TTS service to the local word
// segmentation: service tokenization can differ from ours (punctuation
// handling, CJK phrases spanning several local words), so match within a
// small window ahead and fall back to positional order so the cursor always
// advances.
export function matchSpokenWord(words: string[], cursor: number, spoken: string): SpokenWordMatch {
    const target = normalizeSpokenText(spoken)
    if (!target || cursor >= words.length) {
        return { next: cursor }
    }
    const windowEnd = Math.min(words.length, cursor + 4)
    for (let start = cursor; start < windowEnd; start++) {
        let combined = ''
        for (let end = start; end < words.length && combined.length < target.length; end++) {
            combined += normalizeSpokenText(words[end])
            if (combined === target) {
                return { index: start, next: end + 1 }
            }
        }
        const word = normalizeSpokenText(words[start])
        if (word && (target.startsWith(word) || word.startsWith(target))) {
            return { index: start, next: start + 1 }
        }
    }
    return { index: cursor, next: cursor + 1 }
}

export function findSpeechWordIndex(text: string, lang: LangCode, charIndex: number): number | undefined {
    const parts = segmentSpeechText(text, lang)
    const containing = parts.find((part) => part.isWordLike && charIndex >= part.start && charIndex < part.end)
    if (containing?.wordIndex !== undefined) {
        return containing.wordIndex
    }
    return parts.find((part) => part.isWordLike && part.start >= charIndex)?.wordIndex
}
