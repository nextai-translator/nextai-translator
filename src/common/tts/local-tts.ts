import { invoke } from '@tauri-apps/api/core'
import { LangCode } from '../lang'
import { SpeakOptions } from './types'

interface LocalTTSOptions extends SpeakOptions {
    lang: LangCode
    rate?: number
    volume?: number
}

interface ActivePlayback {
    stop: () => void
}

type SynthesisResult = { ok: true; audio: string } | { ok: false; error: unknown }

const LOCAL_TTS_LANGUAGES = new Set<LangCode>(['en', 'zh-Hans', 'zh-Hant', 'yue', 'lzh'])
const MAX_CHUNK_LENGTH_ZH = 30
const MAX_CHUNK_LENGTH_EN = 80
const STOP_RAMP_SECONDS = 0.03
const TEARDOWN_DELAY_MS = 100
const SUSPEND_AFTER_IDLE_MS = 5000

let audioContext: AudioContext | null = null
let activePlayback: ActivePlayback | null = null
let suspendTimer: number | null = null

export function isLocalTTSLanguage(lang: LangCode): boolean {
    return LOCAL_TTS_LANGUAGES.has(lang)
}

export function fetchLocalVoices(): SpeechSynthesisVoice[] {
    return [
        {
            default: true,
            lang: 'zh-CN',
            localService: true,
            name: 'MeloTTS Chinese + English',
            voiceURI: 'melo-tts-zh-en',
        },
        {
            default: true,
            lang: 'zh-TW',
            localService: true,
            name: 'MeloTTS Chinese + English',
            voiceURI: 'melo-tts-zh-en',
        },
        {
            default: true,
            lang: 'zh-HK',
            localService: true,
            name: 'MeloTTS Chinese + English',
            voiceURI: 'melo-tts-zh-en',
        },
        {
            default: true,
            lang: 'en-US',
            localService: true,
            name: 'Kokoro English',
            voiceURI: 'kokoro-en',
        },
    ]
}

function getAudioContext(): AudioContext {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContext()
    }
    return audioContext
}

function scheduleIdleSuspend() {
    if (suspendTimer !== null) {
        window.clearTimeout(suspendTimer)
    }
    suspendTimer = window.setTimeout(() => {
        suspendTimer = null
        if (!activePlayback && audioContext?.state === 'running') {
            audioContext.suspend().catch(() => undefined)
        }
    }, SUSPEND_AFTER_IDLE_MS)
}

function stripMarkdownForSpeech(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^\s{0,3}>\s?/gm, '')
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/(?:\*\*|__|~~|[*_])/g, '')
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/[\u2190-\u21ff\u2500-\u27bf]/g, '')
        .replace(/\uFE0F|\u200D/g, '')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function containsHan(text: string): boolean {
    return /\p{Script=Han}/u.test(text)
}

function splitAtWord(text: string, maxLength: number): string[] {
    const chars = Array.from(text.trim())
    const chunks: string[] = []
    while (chars.length > maxLength) {
        let end = maxLength
        for (let index = maxLength; index > maxLength / 2; index--) {
            if (/[\s,，、;；:：]/u.test(chars[index])) {
                end = index + 1
                break
            }
        }
        chunks.push(chars.splice(0, end).join('').trim())
    }
    const rest = chars.join('').trim()
    if (rest) {
        chunks.push(rest)
    }
    return chunks.filter(Boolean)
}

export function splitSpeechText(text: string): string[] {
    const clean = stripMarkdownForSpeech(text)
    if (!clean) {
        return []
    }

    const sentences: string[] = []
    let current = ''
    const chars = Array.from(clean)
    for (let index = 0; index < chars.length; index++) {
        const char = chars[index]
        current += char
        const decimalPoint = char === '.' && /\d/.test(chars[index - 1] ?? '') && /\d/.test(chars[index + 1] ?? '')
        if (!decimalPoint && /[。！？.!?；;\n]/u.test(char)) {
            const sentence = current.trim()
            if (sentence) {
                sentences.push(sentence)
            }
            current = ''
        }
    }
    if (current.trim()) {
        sentences.push(current.trim())
    }

    return sentences.flatMap((sentence) =>
        splitAtWord(sentence, containsHan(sentence) ? MAX_CHUNK_LENGTH_ZH : MAX_CHUNK_LENGTH_EN)
    )
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index)
    }
    return bytes.buffer
}

async function synthesize(text: string, lang: LangCode, rate: number): Promise<string> {
    return invoke<string>('synthesize_local_tts', { text, lang, rate })
}

export async function speak({
    text,
    lang,
    rate = 1,
    volume = 100,
    signal,
    onFinish,
    onStartSpeaking,
}: LocalTTSOptions): Promise<void> {
    activePlayback?.stop()

    const context = getAudioContext()
    if (suspendTimer !== null) {
        window.clearTimeout(suspendTimer)
        suspendTimer = null
    }
    await context.resume().catch(() => undefined)

    const gain = context.createGain()
    gain.gain.value = Math.max(0, Math.min(1, volume / 100))
    gain.connect(context.destination)

    const sources: AudioBufferSourceNode[] = []
    let stopped = false
    let finished = false
    const finish = (tearDown = true) => {
        if (finished) {
            return
        }
        finished = true
        if (activePlayback?.stop === stop) {
            activePlayback = null
        }
        onFinish?.()
        if (tearDown) {
            window.setTimeout(() => {
                for (const source of sources) {
                    source.onended = null
                    source.disconnect()
                }
                gain.disconnect()
            }, TEARDOWN_DELAY_MS)
        }
        scheduleIdleSuspend()
    }
    const stop = () => {
        if (stopped) {
            return
        }
        stopped = true
        try {
            gain.gain.setValueAtTime(gain.gain.value, context.currentTime)
            gain.gain.linearRampToValueAtTime(0, context.currentTime + STOP_RAMP_SECONDS)
        } catch {
            // The shared audio context may have been closed by the host.
        }
        window.setTimeout(() => {
            for (const source of sources) {
                try {
                    source.onended = null
                    source.stop()
                    source.disconnect()
                } catch {
                    // Already stopped or ended.
                }
            }
            gain.disconnect()
        }, TEARDOWN_DELAY_MS)
        finish(false)
    }
    activePlayback = { stop }
    signal.addEventListener('abort', stop, { once: true })

    const chunks = splitSpeechText(text)
    if (chunks.length === 0) {
        stop()
        return
    }

    const lookahead = 3
    const pending: Array<Promise<SynthesisResult> | undefined> = new Array(chunks.length)
    const queue = (index: number) => {
        if (index < chunks.length && !pending[index]) {
            pending[index] = synthesize(chunks[index], lang, rate).then(
                (audio) => ({ ok: true, audio }),
                (error: unknown) => ({ ok: false, error })
            )
        }
    }
    for (let index = 0; index < lookahead; index++) {
        queue(index)
    }

    let nextStart = context.currentTime
    let activeSources = 0
    let pipelineFinished = false
    let started = false
    let lastSynthesisError: unknown
    const finishIfComplete = () => {
        if (pipelineFinished && activeSources === 0 && !stopped) {
            finish()
        }
    }

    try {
        for (let index = 0; index < chunks.length; index++) {
            const result = await pending[index]!
            if (stopped || signal.aborted) {
                return
            }
            queue(index + lookahead)
            if (!result.ok) {
                lastSynthesisError = result.error
                continue
            }

            let buffer: AudioBuffer
            try {
                buffer = await context.decodeAudioData(base64ToArrayBuffer(result.audio))
            } catch {
                continue
            }
            if (stopped || signal.aborted) {
                return
            }

            const source = context.createBufferSource()
            source.buffer = buffer
            source.connect(gain)
            const startAt = Math.max(nextStart, context.currentTime)
            source.start(startAt)
            nextStart = startAt + buffer.duration
            sources.push(source)
            activeSources++
            source.onended = () => {
                activeSources--
                finishIfComplete()
            }
            if (!started) {
                started = true
                onStartSpeaking?.()
            }
        }
        pipelineFinished = true
        if (!started) {
            stop()
            if (lastSynthesisError) {
                throw lastSynthesisError
            }
            return
        }
        finishIfComplete()
    } catch (error) {
        stop()
        throw error
    }
}
