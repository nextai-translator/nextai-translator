import { invoke } from '@tauri-apps/api/core'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { isLocalTTSLanguage, speak, splitSpeechText } from './local-tts'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

class FakeAudioSource {
    buffer: AudioBuffer | null = null
    onended: (() => void) | null = null

    connect() {}
    disconnect() {}
    stop() {}
    start() {
        window.setTimeout(() => this.onended?.(), 0)
    }
}

class FakeAudioContext {
    currentTime = 0
    destination = {}
    state: AudioContextState = 'running'

    createBufferSource() {
        return new FakeAudioSource()
    }
    createGain() {
        return {
            connect() {},
            disconnect() {},
            gain: {
                value: 1,
                setValueAtTime() {},
                linearRampToValueAtTime() {},
            },
        }
    }
    decodeAudioData() {
        return Promise.resolve({ duration: 0.01 } as AudioBuffer)
    }
    resume() {
        return Promise.resolve()
    }
    suspend() {
        this.state = 'suspended'
        return Promise.resolve()
    }
}

beforeAll(() => {
    vi.stubGlobal('AudioContext', FakeAudioContext)
})

describe('local TTS text preparation', () => {
    it('supports the languages covered by the Yansu voice models', () => {
        expect(isLocalTTSLanguage('en')).toBe(true)
        expect(isLocalTTSLanguage('zh-Hans')).toBe(true)
        expect(isLocalTTSLanguage('fr')).toBe(false)
    })

    it('removes non-speakable markdown and keeps link labels', () => {
        expect(
            splitSpeechText('## Title\nRead [the guide](https://example.com).\n```ts\nconst hidden = true\n```')
        ).toEqual(['Title', 'Read the guide.'])
    })

    it('keeps decimal points inside a sentence', () => {
        expect(splitSpeechText('Version 1.25 is ready. Continue?')).toEqual(['Version 1.25 is ready.', 'Continue?'])
    })

    it('splits long Chinese text into bounded chunks', () => {
        const chunks = splitSpeechText('这是一段用于测试本地语音合成分块行为的中文内容，'.repeat(12))
        expect(chunks.length).toBeGreaterThan(1)
        expect(chunks.every((chunk) => Array.from(chunk).length <= 30)).toBe(true)
    })

    it('keeps playing when one prefetched chunk fails to synthesize', async () => {
        const text = 'One. Two. Three. Four.'
        expect(splitSpeechText(text)).toEqual(['One.', 'Two.', 'Three.', 'Four.'])
        vi.mocked(invoke).mockRejectedValueOnce(new Error('one bad chunk')).mockResolvedValue('UklGRg==')
        const onStartSpeaking = vi.fn()

        await expect(
            speak({
                text,
                lang: 'en',
                signal: new AbortController().signal,
                onStartSpeaking,
            })
        ).resolves.toBeUndefined()

        expect(vi.mocked(invoke).mock.calls.map((call) => call[1])).toEqual([
            { text: 'One.', lang: 'en', rate: 1 },
            { text: 'Two.', lang: 'en', rate: 1 },
            { text: 'Three.', lang: 'en', rate: 1 },
            { text: 'Four.', lang: 'en', rate: 1 },
        ])
        expect(onStartSpeaking).toHaveBeenCalledOnce()
    })
})
