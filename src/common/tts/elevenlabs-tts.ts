import { langCode2TTSLang } from '.'
import { getUniversalFetch } from '../universal-fetch'
import { SpeakOptions } from './types'
import { speak as edgeSpeak } from './edge-tts'
import { getSettings, setSettings } from '../utils'

// Eleven Labs API Configuration
const ELEVENLABS_API_BASE_URL = 'https://api.elevenlabs.io/v1'
const DEFAULT_MODEL = 'eleven_multilingual_v2'
const DEFAULT_STABILITY = 50
const DEFAULT_SIMILARITY_BOOST = 75
const MAX_TEXT_LENGTH = 5000 // Standard tier limit
const REQUEST_TIMEOUT_MS = 10000
const MAX_RETRIES = 3
const CONCURRENT_REQUEST_LIMIT = 3
const USAGE_CACHE_DURATION_MS = 3600000 // 1 hour

// Request queue for rate limiting
interface QueuedRequest {
    execute: () => Promise<void>
    resolve: () => void
    reject: (error: Error) => void
}

const requestQueue: QueuedRequest[] = []
let activeRequests = 0

// Process queued requests with concurrency limit
async function processQueue() {
    while (requestQueue.length > 0 && activeRequests < CONCURRENT_REQUEST_LIMIT) {
        const request = requestQueue.shift()
        if (request) {
            activeRequests++
            try {
                await request.execute()
                request.resolve()
            } catch (error) {
                request.reject(error as Error)
            } finally {
                activeRequests--
                // Process next request
                processQueue()
            }
        }
    }
}

// Add request to queue
function queueRequest(execute: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
        requestQueue.push({ execute, resolve, reject })
        processQueue()
    })
}

// Calculate exponential backoff delay
function calculateBackoff(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 10000)
}

// Sanitize error messages to remove API keys
function sanitizeError(message: string): string {
    return message.replace(/sk_[a-zA-Z0-9]+/g, '<API_KEY_HIDDEN>')
}

// Validate API key format
export function validateElevenLabsAPIKeyFormat(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
        return false
    }
    // Eleven Labs API keys typically start with 'sk_' and have sufficient length
    return apiKey.startsWith('sk_') && apiKey.length >= 32
}

// Validate API key against Eleven Labs API
export async function validateElevenLabsAPIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    if (!validateElevenLabsAPIKeyFormat(apiKey)) {
        return {
            valid: false,
            error: 'Invalid API key format. Keys should start with "sk_" and have at least 32 characters.',
        }
    }

    try {
        const fetcher = getUniversalFetch()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

        const response = await fetcher(`${ELEVENLABS_API_BASE_URL}/user`, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
            },
            signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
            return { valid: true }
        } else if (response.status === 401) {
            return { valid: false, error: 'Invalid API key. Please check your Eleven Labs API key in settings.' }
        } else {
            return { valid: false, error: `API validation failed with status ${response.status}` }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return { valid: false, error: sanitizeError(`Failed to validate API key: ${errorMessage}`) }
    }
}

// Fetch usage statistics
export async function fetchElevenLabsUsage(
    apiKey: string
): Promise<{ characterCount: number; characterLimit: number } | null> {
    try {
        const fetcher = getUniversalFetch()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

        const response = await fetcher(`${ELEVENLABS_API_BASE_URL}/user/subscription`, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
            },
            signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
            const data = await response.json()
            return {
                characterCount: data.character_count || 0,
                characterLimit: data.character_limit || 0,
            }
        }

        return null
    } catch (error) {
        console.error(
            'Failed to fetch Eleven Labs usage:',
            sanitizeError(error instanceof Error ? error.message : 'Unknown error')
        )
        return null
    }
}

// Get cached usage or fetch fresh data
export async function getElevenLabsUsage(
    apiKey: string,
    forceRefresh: boolean = false
): Promise<{ characterCount: number; characterLimit: number } | null> {
    const settings = await getSettings()
    const cachedUsage = settings.tts?.elevenlabs?.cachedUsage
    const lastCheck = settings.tts?.elevenlabs?.lastUsageCheck || 0
    const now = Date.now()

    // Use cache if available and not expired
    if (!forceRefresh && cachedUsage && now - lastCheck < USAGE_CACHE_DURATION_MS) {
        return cachedUsage
    }

    // Fetch fresh data
    const usage = await fetchElevenLabsUsage(apiKey)
    if (usage) {
        // Update cache
        await setSettings({
            ...settings,
            tts: {
                ...settings.tts,
                elevenlabs: {
                    ...settings.tts?.elevenlabs,
                    cachedUsage: usage,
                    lastUsageCheck: now,
                },
            },
        })
    }

    return usage
}

// Check if usage warning should be shown
export function shouldShowUsageWarning(usage: { characterCount: number; characterLimit: number }): boolean {
    const percentage = (usage.characterCount / usage.characterLimit) * 100
    return percentage >= 80
}

// Fetch available voices
export interface ElevenLabsVoice {
    voice_id: string
    name: string
    labels?: {
        language?: string
        accent?: string
        description?: string
        age?: string
        gender?: string
        use_case?: string
    }
}

export async function fetchElevenLabsVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
    try {
        const fetcher = getUniversalFetch()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

        const response = await fetcher(`${ELEVENLABS_API_BASE_URL}/voices`, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
            },
            signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
            const data = await response.json()
            return data.voices || []
        }

        return []
    } catch (error) {
        console.error(
            'Failed to fetch Eleven Labs voices:',
            sanitizeError(error instanceof Error ? error.message : 'Unknown error')
        )
        return []
    }
}

// Filter voices by language
export function filterVoicesByLanguage(voices: ElevenLabsVoice[], lang: string): ElevenLabsVoice[] {
    return voices.filter((voice) => {
        const voiceLang = voice.labels?.language?.toLowerCase()
        const targetLang = lang.toLowerCase()
        return voiceLang && (voiceLang.includes(targetLang) || targetLang.includes(voiceLang))
    })
}

// Segment text into chunks under the character limit
function* segmentText(text: string, maxLength: number = MAX_TEXT_LENGTH): Generator<string> {
    if (text.length <= maxLength) {
        yield text
        return
    }

    let remainingText = text
    while (remainingText.length > 0) {
        if (remainingText.length <= maxLength) {
            yield remainingText
            return
        }

        // Find sentence boundaries (., !, ?, \n)
        let splitIndex = maxLength
        const sentenceEnders = ['. ', '! ', '? ', '\n']

        for (let i = maxLength; i > maxLength * 0.5; i--) {
            const char = remainingText.substring(i - 1, i + 1)
            if (sentenceEnders.includes(char)) {
                splitIndex = i
                break
            }
        }

        // If no sentence boundary found, split at last space
        if (splitIndex === maxLength) {
            const lastSpace = remainingText.lastIndexOf(' ', maxLength)
            splitIndex = lastSpace > 0 ? lastSpace : maxLength
        }

        const chunk = remainingText.substring(0, splitIndex).trim()
        if (chunk.length > 0) {
            yield chunk
        }

        remainingText = remainingText.substring(splitIndex).trim()
    }
}

// Error mapping for user-friendly messages
function getErrorMessage(status: number, defaultMessage: string): string {
    const errorMessages: Record<number, string> = {
        401: 'Your Eleven Labs API key is invalid. Please check your settings.',
        403: "You've reached your Eleven Labs character limit. Falling back to Edge TTS.",
        404: 'Selected voice is no longer available. Please choose another voice.',
        429: 'Too many requests. Please wait a moment and try again.',
        500: 'Eleven Labs service is temporarily unavailable. Using Edge TTS instead.',
        502: 'Eleven Labs service is temporarily unavailable. Using Edge TTS instead.',
        503: 'Eleven Labs service is temporarily unavailable. Using Edge TTS instead.',
    }

    return errorMessages[status] || defaultMessage
}

// Retry with exponential backoff
async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = MAX_RETRIES,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isRetryable: (error: any) => boolean = () => true
): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error as Error

            // Don't retry if error is not retryable
            if (!isRetryable(error)) {
                throw error
            }

            // Don't delay on last attempt
            if (attempt < maxRetries - 1) {
                const delay = calculateBackoff(attempt)
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        }
    }

    throw lastError
}

// Check if error is retryable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRetryableError(error: any): boolean {
    if (error.status) {
        // Retry on rate limits and server errors
        return error.status === 429 || (error.status >= 500 && error.status < 600)
    }
    // Retry on network errors
    return error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'AbortError'
}

interface ElevenLabsOptions extends SpeakOptions {
    voice?: string
    rate?: number
    volume?: number
}

// Main speak function for Eleven Labs TTS
export async function speak({
    text,
    lang: lang_,
    onFinish,
    voice,
    rate = 1,
    volume = 100,
    signal,
    onStartSpeaking,
}: ElevenLabsOptions) {
    const settings = await getSettings()
    const elevenLabsSettings = settings.tts?.elevenlabs

    // Check if API key is configured
    if (!elevenLabsSettings?.apiKey) {
        console.error('Eleven Labs API key not configured')

        // Fallback to EdgeTTS if enabled
        if (elevenLabsSettings?.autoFallback !== false) {
            console.log('Falling back to EdgeTTS')
            return edgeSpeak({
                text,
                lang: lang_,
                onFinish,
                voice,
                rate,
                volume,
                signal,
                onStartSpeaking,
            })
        }

        throw new Error('Eleven Labs API key not configured. Please add your API key in settings.')
    }

    const apiKey = elevenLabsSettings.apiKey
    const lang = langCode2TTSLang[lang_ ?? 'en'] ?? 'en-US'

    // Get Eleven Labs-specific settings
    const model = elevenLabsSettings.model || DEFAULT_MODEL
    const stability =
        elevenLabsSettings.stability !== undefined ? elevenLabsSettings.stability / 100 : DEFAULT_STABILITY / 100
    const similarityBoost =
        elevenLabsSettings.similarityBoost !== undefined
            ? elevenLabsSettings.similarityBoost / 100
            : DEFAULT_SIMILARITY_BOOST / 100

    // Use default voice if not specified
    const voiceId = voice || (await getDefaultVoiceForLanguage(apiKey, lang))

    if (!voiceId) {
        console.error(`No voice available for language: ${lang}`)

        // Fallback to EdgeTTS if enabled
        if (elevenLabsSettings.autoFallback !== false) {
            console.log('No Eleven Labs voice available for this language, falling back to EdgeTTS')
            return edgeSpeak({
                text,
                lang: lang_,
                onFinish,
                voice,
                rate,
                volume,
                signal,
                onStartSpeaking,
            })
        }

        throw new Error(`No voice available for language: ${lang}`)
    }

    // Queue request to respect concurrency limit
    return queueRequest(async () => {
        try {
            // Segment text if necessary
            const textSegments = Array.from(segmentText(text, MAX_TEXT_LENGTH))

            // Process segments sequentially
            for (let i = 0; i < textSegments.length; i++) {
                if (signal.aborted) {
                    return
                }

                const segment = textSegments[i]
                const isLastSegment = i === textSegments.length - 1

                await synthesizeAndPlay({
                    text: segment,
                    voiceId,
                    apiKey,
                    model,
                    stability,
                    similarityBoost,
                    volume,
                    rate,
                    signal,
                    onStartSpeaking: i === 0 ? onStartSpeaking : undefined,
                    onFinish: isLastSegment ? onFinish : undefined,
                })
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            // Handle errors with fallback
            const errorMessage = sanitizeError(error.message || 'Unknown error')
            console.error('Eleven Labs TTS error:', errorMessage)

            // Check if we should fallback to EdgeTTS
            const shouldFallback =
                elevenLabsSettings.autoFallback !== false &&
                (error.status === 403 || error.status === 500 || error.status === 502 || error.status === 503)

            if (shouldFallback) {
                console.log('Falling back to EdgeTTS due to error')
                return edgeSpeak({
                    text,
                    lang: lang_,
                    onFinish,
                    voice,
                    rate,
                    volume,
                    signal,
                    onStartSpeaking,
                })
            }

            // Throw user-friendly error message
            throw new Error(error.status ? getErrorMessage(error.status, errorMessage) : errorMessage)
        }
    })
}

// Synthesize and play audio segment
async function synthesizeAndPlay({
    text,
    voiceId,
    apiKey,
    model,
    stability,
    similarityBoost,
    volume,
    rate,
    signal,
    onStartSpeaking,
    onFinish,
}: {
    text: string
    voiceId: string
    apiKey: string
    model: string
    stability: number
    similarityBoost: number
    volume: number
    rate: number
    signal: AbortSignal
    onStartSpeaking?: () => void
    onFinish?: () => void
}) {
    const fetcher = getUniversalFetch()

    // Make API request with retry logic
    const response = await retryWithBackoff(
        async () => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

            // Combine abort signals
            const combinedSignal = signal.aborted ? signal : controller.signal
            signal.addEventListener('abort', () => controller.abort())

            const res = await fetcher(`${ELEVENLABS_API_BASE_URL}/text-to-speech/${voiceId}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text,
                    // eslint-disable-next-line camelcase
                    model_id: model,
                    // eslint-disable-next-line camelcase
                    voice_settings: {
                        stability,
                        // eslint-disable-next-line camelcase
                        similarity_boost: similarityBoost,
                    },
                }),
                signal: combinedSignal,
            })

            clearTimeout(timeoutId)

            if (!res.ok) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const error: any = new Error(`API request failed with status ${res.status}`)
                error.status = res.status
                throw error
            }

            return res
        },
        MAX_RETRIES,
        (error) => isRetryableError(error)
    )

    // Stream and play audio
    if (signal.aborted) {
        return
    }

    const audioData = await response.arrayBuffer()

    if (signal.aborted) {
        return
    }

    // Play audio using AudioContext
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(audioData)

    if (signal.aborted) {
        audioContext.close()
        return
    }

    const source = audioContext.createBufferSource()
    const gainNode = audioContext.createGain()

    source.buffer = audioBuffer

    // Apply rate and volume
    source.playbackRate.value = rate
    gainNode.gain.value = volume / 100

    // Connect nodes
    source.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Handle abort
    signal.addEventListener('abort', () => {
        try {
            source.stop()
            audioContext.close()
        } catch (e) {
            // Ignore errors during cleanup
        }
    })

    // Notify start of speaking
    onStartSpeaking?.()

    // Start playback
    source.start()

    // Wait for playback to finish
    await new Promise<void>((resolve) => {
        source.addEventListener('ended', () => {
            onFinish?.()
            audioContext.close()
            resolve()
        })
    })
}

// Get default voice for language
async function getDefaultVoiceForLanguage(apiKey: string, lang: string): Promise<string | null> {
    const voices = await fetchElevenLabsVoices(apiKey)
    const filteredVoices = filterVoicesByLanguage(voices, lang)

    if (filteredVoices.length > 0) {
        // Return first available voice
        return filteredVoices[0].voice_id
    }

    return null
}
