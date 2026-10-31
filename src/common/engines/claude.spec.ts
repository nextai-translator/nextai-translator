/* eslint-disable camelcase */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Claude } from './claude'
import { isAdaptiveThinkingOnly } from './claude-request'
import { fetchSSE, getSettings } from '../utils'

vi.mock('../utils', () => {
    return {
        fetchSSE: vi.fn(),
        getSettings: vi.fn(),
    }
})

interface MockFetchSSEOptions {
    body?: BodyInit | null
    onMessage: (data: string) => Promise<void>
}

// Every id of the model list, and whether it takes the adaptive form only.
const MODEL_LIST: [string, boolean][] = [
    ['claude-opus-5-5', true],
    ['claude-sonnet-5-5', true],
    ['claude-haiku-5-5', true],
    ['claude-opus-4-6', false],
    ['claude-sonnet-4-6', false],
    ['claude-haiku-4-5-20251001', false],
    ['claude-sonnet-4-20250514', false],
    ['claude-3-7-sonnet-20250219', false],
    ['claude-3-5-sonnet-20241022', false],
    ['claude-3-5-haiku-20241022', false],
]

const MESSAGES = [{ role: 'user', content: 'You are a translator\n\nTranslate hello to Chinese' }]

// Sends one message, answers it with the given stream events, and returns the request body.
async function send(model: string, thinkingBudget?: number, events: object[] = []) {
    vi.mocked(getSettings).mockResolvedValue({
        claudeAPIKey: 'test-api-key',
        claudeAPIModel: model,
        claudeAPIURL: 'https://api.anthropic.com',
        claudeAPIURLPath: '/v1/messages',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    let body = ''
    vi.mocked(fetchSSE).mockImplementationOnce(async (_input: string, options: MockFetchSSEOptions) => {
        body = options.body as string
        for (const event of events) {
            await options.onMessage(JSON.stringify(event))
        }
    })
    const onMessage = vi.fn().mockResolvedValue(undefined)
    const onError = vi.fn()
    const onFinished = vi.fn()
    await new Claude().sendMessage({
        rolePrompt: 'You are a translator',
        commandPrompt: 'Translate hello to Chinese',
        thinkingBudget,
        onMessage,
        onError,
        onFinished,
        signal: new AbortController().signal,
    })
    return { body, onMessage, onError, onFinished }
}

describe('isAdaptiveThinkingOnly', () => {
    it('has an answer for every id of the model list', async () => {
        const models = await new Claude().listModels(undefined)
        expect(models.map((model) => model.id)).toEqual(MODEL_LIST.map(([id]) => id))
    })

    it.each(MODEL_LIST)('%s: %s', (id, expected) => {
        expect(isAdaptiveThinkingOnly(id)).toBe(expected)
    })

    it.each([
        ['claude-opus-4-7', true],
        ['claude-opus-4-8', true],
        ['claude-opus-5', true],
        ['claude-sonnet-5', true],
        ['claude-fable-5-1', true],
        ['claude-mythos-5-1', true],
        ['anthropic.claude-haiku-5-5', true],
        ['anthropic/claude-opus-4.7', true],
        ['claude-haiku-4-5', false],
        ['claude-sonnet-4-5-20250929', false],
        ['claude-opus-4-5-20251101', false],
        ['claude-opus-4-1-20250805', false],
        ['claude-opus-4-20250514', false],
        ['claude-3-haiku-20240307', false],
        ['claude-haiku-4-5@20251001', false],
        ['anthropic.claude-haiku-4-5', false],
        ['anthropic.claude-3-5-sonnet-20241022-v2:0', false],
        ['anthropic/claude-sonnet-4-5', false],
        ['anthropic/claude-sonnet-4.5', false],
    ])('%s: %s', (id, expected) => {
        expect(isAdaptiveThinkingOnly(id)).toBe(expected)
    })

    // Ids it cannot read: no version, or a version written without a separator.
    it.each(['my-claude-deployment', 'claude-mythos-preview', 'claude-opus-55', ''])('%j: false', (id) => {
        expect(isAdaptiveThinkingOnly(id)).toBe(false)
    })
})

describe('Claude', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const older = MODEL_LIST.filter(([, adaptiveOnly]) => !adaptiveOnly).map(([id]) => id)
    const newer = MODEL_LIST.filter(([, adaptiveOnly]) => adaptiveOnly).map(([id]) => id)

    // The strings below are the bodies this engine sent before it told models apart.
    it.each([...older, 'my-claude-deployment'])('sends %s the request it has always sent', async (model) => {
        const head =
            `{"model":"${model}","stream":true,"messages":[{"role":"user",` +
            '"content":"You are a translator\\n\\nTranslate hello to Chinese"}],'

        expect((await send(model)).body).toBe(head + '"temperature":0,"max_tokens":4096}')
        expect((await send(model, 10000)).body).toBe(
            head + '"thinking":{"type":"enabled","budget_tokens":10000},"max_tokens":16384}'
        )
        expect((await send(model, 20000)).body).toBe(
            head + '"thinking":{"type":"enabled","budget_tokens":20000},"max_tokens":24096}'
        )
    })

    it.each(newer)('sends %s neither a temperature nor a thinking budget', async (model) => {
        expect(JSON.parse((await send(model)).body)).toEqual({
            model,
            stream: true,
            messages: MESSAGES,
            output_config: { effort: 'low' },
            max_tokens: 16000,
        })

        for (const [thinkingBudget, effort] of [
            [5000, 'low'],
            [10000, 'medium'],
            [20000, 'high'],
        ] as const) {
            expect(JSON.parse((await send(model, thinkingBudget)).body)).toEqual({
                model,
                stream: true,
                messages: MESSAGES,
                thinking: { type: 'adaptive' },
                output_config: { effort },
                max_tokens: 32000,
            })
        }
    })

    it('forwards the text of the answer and nothing of a thinking block', async () => {
        const { onMessage, onError, onFinished } = await send('claude-haiku-5-5', 10000, [
            { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } },
            { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'A greeting.' } },
            { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'opaque' } },
            { type: 'content_block_stop', index: 0 },
            { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
            { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: '你好' } },
            { type: 'content_block_stop', index: 1 },
            { type: 'message_stop' },
        ])

        expect(onMessage.mock.calls).toEqual([[{ content: '你好', role: '' }]])
        expect(onError).not.toHaveBeenCalled()
        expect(onFinished).toHaveBeenCalledWith('stop')
    })
})
