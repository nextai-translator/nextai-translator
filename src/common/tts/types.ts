import { LangCode } from '../lang'

export interface SpeakOptions {
    text: string
    lang?: LangCode
    signal: AbortSignal
    onFinish?: () => void
    onStartSpeaking?: () => void
    onWordBoundary?: (wordIndex: number) => void
}

export type TTSProvider = 'LocalTTS' | 'WebSpeech' | 'EdgeTTS'

export interface DoSpeakOptions extends SpeakOptions {
    lang: LangCode
    provider: TTSProvider
    voice?: string
    rate?: number
    volume?: number
}
