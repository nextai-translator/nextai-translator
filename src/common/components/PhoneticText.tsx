import { Fragment, useState } from 'react'
import { LangCode } from '../lang'
import { TTSProvider } from '../tts/types'
import { SpeakerIcon } from './SpeakerIcon'
import { segmentSpeechText } from '../tts/speech-segments'

export type PhoneticSegment =
    | { kind: 'text'; text: string }
    | { kind: 'phonetic' | 'example'; text: string; speechText: string }

const PHONETIC_PATTERN = /·\s*(\/\s*([^/\n]{1,120}?)\s*\/)/g
const EXAMPLE_HEADER_PATTERN = /(?:例句|示例|examples?|example sentences?)\s*[：:]\s*/i
const NUMBERED_EXAMPLE_PATTERN = /^\s*(?:[-*+]\s*)?\d+[.)、]\s*/
const TRAILING_TRANSLATION_PATTERN = /\s*([（(][^()（）\n]{1,500}[)）])\s*$/

function cleanSpeechCandidate(value: string): string {
    const candidate = value
        .trim()
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/^\s*(?:[-*+]|\d+[.)、])\s*/, '')
        .replace(/(?:\*\*|__|~~|[*_`])/g, '')
        .replace(/\s+\([^)]*\)\s*$/, '')
        .trim()
    if (!candidate || /^\[[^\]]+\]$/.test(candidate) || candidate.length > 120) {
        return ''
    }
    return candidate
}

function findSpeechText(text: string, matchIndex: number, fallbackText: string): string {
    const precedingLines = text.slice(0, matchIndex).split('\n')
    const sameLine = cleanSpeechCandidate(precedingLines.pop() ?? '')
    if (sameLine) {
        return sameLine
    }
    while (precedingLines.length > 0) {
        const previousLine = cleanSpeechCandidate(precedingLines.pop() ?? '')
        if (previousLine) {
            return previousLine
        }
    }
    return cleanSpeechCandidate(fallbackText)
}

function parsePhonetics(text: string, fallbackText: string): PhoneticSegment[] {
    const segments: PhoneticSegment[] = []
    let cursor = 0
    for (const match of text.matchAll(PHONETIC_PATTERN)) {
        const matchIndex = match.index ?? 0
        const slashOffset = match[0].indexOf('/')
        const phoneticStart = matchIndex + slashOffset
        if (phoneticStart > cursor) {
            segments.push({ kind: 'text', text: text.slice(cursor, phoneticStart) })
        }
        const speechText = findSpeechText(text, matchIndex, fallbackText)
        if (!speechText) {
            segments.push({ kind: 'text', text: match[1] })
        } else {
            segments.push({ kind: 'phonetic', text: match[1], speechText })
        }
        cursor = matchIndex + match[0].length
    }
    if (cursor < text.length) {
        segments.push({ kind: 'text', text: text.slice(cursor) })
    }
    return segments.length > 0 ? segments : [{ kind: 'text', text }]
}

function parseExampleLine(line: string): PhoneticSegment[] | undefined {
    const translation = TRAILING_TRANSLATION_PATTERN.exec(line)
    if (!translation || translation.index === undefined) {
        return undefined
    }

    const beforeTranslation = line.slice(0, translation.index).replace(/\s+$/, '')
    const header = EXAMPLE_HEADER_PATTERN.exec(beforeTranslation)
    const number = NUMBERED_EXAMPLE_PATTERN.exec(beforeTranslation)
    if (!header && !number) {
        return undefined
    }

    const exampleStart = header ? (header.index ?? 0) + header[0].length : number?.[0].length ?? 0
    const speechText = beforeTranslation.slice(exampleStart).trim()
    if (!speechText || speechText.length > 500) {
        return undefined
    }

    const displayStart = beforeTranslation.indexOf(speechText, exampleStart)
    return [
        { kind: 'text', text: line.slice(0, displayStart) },
        { kind: 'example', text: speechText, speechText },
        { kind: 'text', text: line.slice(displayStart + speechText.length) },
    ]
}

export function parsePhoneticSegments(text: string, fallbackText = ''): PhoneticSegment[] {
    const segments: PhoneticSegment[] = []
    const appendSegment = (segment: PhoneticSegment) => {
        const previous = segments.at(-1)
        if (segment.kind === 'text' && previous?.kind === 'text') {
            previous.text += segment.text
        } else {
            segments.push(segment)
        }
    }

    for (const phoneticSegment of parsePhonetics(text, fallbackText)) {
        if (phoneticSegment.kind !== 'text') {
            appendSegment(phoneticSegment)
            continue
        }

        for (const line of phoneticSegment.text.split(/(\n)/)) {
            const exampleSegments = line === '\n' ? undefined : parseExampleLine(line)
            for (const segment of exampleSegments ?? [{ kind: 'text' as const, text: line }]) {
                appendSegment(segment)
            }
        }
    }
    return segments.length > 0 ? segments : [{ kind: 'text', text }]
}

interface PhoneticTextProps {
    text: string
    fallbackText?: string
    highlightRange?: [number, number]
    lang: LangCode
    provider?: TTSProvider
    voice?: string
    rate?: number
    volume?: number
}

const activeWordStyle = {
    backgroundColor: 'rgba(255, 193, 7, 0.28)',
    borderRadius: 2,
    boxDecorationBreak: 'clone' as const,
    WebkitBoxDecorationBreak: 'clone' as const,
}

function renderHighlightedRange(text: string, offset: number, range?: [number, number]) {
    if (!range) {
        return text
    }
    const start = Math.max(0, range[0] - offset)
    const end = Math.min(text.length, range[1] - offset)
    if (start >= end) {
        return text
    }
    return (
        <>
            {text.slice(0, start)}
            <span style={activeWordStyle}>{text.slice(start, end)}</span>
            {text.slice(end)}
        </>
    )
}

export function PhoneticText({
    text,
    fallbackText,
    highlightRange,
    lang,
    provider,
    voice,
    rate,
    volume,
}: PhoneticTextProps) {
    const segments = parsePhoneticSegments(text, fallbackText)
    const [activeWord, setActiveWord] = useState<{ segmentIndex: number; wordIndex: number }>()
    let segmentOffset = 0
    return (
        <>
            {segments.map((segment, index) => {
                const currentOffset = segmentOffset
                segmentOffset += segment.text.length
                if (segment.kind === 'text') {
                    return (
                        <Fragment key={index}>
                            {renderHighlightedRange(segment.text, currentOffset, highlightRange)}
                        </Fragment>
                    )
                }
                return (
                    <span
                        key={index}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            marginRight: segment.kind === 'example' ? 4 : undefined,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <span>
                            {highlightRange
                                ? renderHighlightedRange(segment.text, currentOffset, highlightRange)
                                : segment.kind === 'example'
                                ? segmentSpeechText(segment.text, lang).map((part, partIndex) => (
                                      <span
                                          key={partIndex}
                                          style={
                                              activeWord?.segmentIndex === index &&
                                              activeWord.wordIndex === part.wordIndex
                                                  ? activeWordStyle
                                                  : undefined
                                          }
                                      >
                                          {part.text}
                                      </span>
                                  ))
                                : segment.text}
                        </span>
                        <span
                            title={`播放 ${segment.speechText}`}
                            aria-label={`播放 ${segment.speechText}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                alignSelf: 'center',
                                cursor: 'pointer',
                                position: 'relative',
                                top: segment.kind === 'phonetic' ? 2 : 0,
                            }}
                        >
                            <SpeakerIcon
                                size={12}
                                provider={provider}
                                text={segment.speechText}
                                lang={lang}
                                voice={voice}
                                rate={rate}
                                volume={volume}
                                onWordBoundary={(wordIndex) => setActiveWord({ segmentIndex: index, wordIndex })}
                                onPlaybackEnd={() =>
                                    setActiveWord((current) => (current?.segmentIndex === index ? undefined : current))
                                }
                            />
                        </span>
                    </span>
                )
            })}
        </>
    )
}
