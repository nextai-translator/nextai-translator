import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeepSeek } from './deepseek'
import { fetchSSE, getSettings } from '../utils'

vi.mock('../utils', () => ({
    defaultAPIURL: 'https://api.openai.com',
    defaultAPIURLPath: '/v1/chat/completions',
    fetchSSE: vi.fn(),
    getSettings: vi.fn(),
}))

async function sendMessage(modelOverride?: string) {
    await new DeepSeek().sendMessage({
        rolePrompt: 'You are a translator',
        commandPrompt: 'Translate hello to Chinese',
        modelOverride,
        onMessage: vi.fn(),
        onError: vi.fn(),
        onFinished: vi.fn(),
        signal: new AbortController().signal,
    })

    expect(fetchSSE).toHaveBeenCalledOnce()
    const [url, options] = vi.mocked(fetchSSE).mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions')
    return JSON.parse(options.body as string)
}

describe('DeepSeek', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(getSettings).mockResolvedValue({
            deepSeekAPIKey: 'test-api-key',
            deepSeekAPIModel: 'deepseek-flash',
            thinkingEnabled: false,
        } as never)
    })

    it.each([
        ['deepseek-flash', false, 'disabled'],
        ['deepseek-flash', true, 'enabled'],
        ['deepseek-v4-pro', false, 'disabled'],
        ['deepseek-v4-pro', true, 'enabled'],
    ] as const)('sends %s with thinkingEnabled=%s as thinking.type=%s', async (model, thinkingEnabled, type) => {
        vi.mocked(getSettings).mockResolvedValue({
            deepSeekAPIKey: 'test-api-key',
            deepSeekAPIModel: model,
            thinkingEnabled,
        } as never)

        expect(await sendMessage()).toEqual({
            model,
            stream: true,
            thinking: { type },
            messages: [{ role: 'user', content: 'You are a translator\n\nTranslate hello to Chinese' }],
        })
    })

    it('preserves the per-action model override when disabling thinking', async () => {
        const payload = await sendMessage('deepseek-v4-pro')

        expect(payload.model).toBe('deepseek-v4-pro')
        expect(payload.thinking).toEqual({ type: 'disabled' })
        expect(payload.reasoning_effort).toBeUndefined()
    })
})
