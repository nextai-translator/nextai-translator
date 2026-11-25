import { describe, it, expect, vi } from 'vitest'
import { translate, TranslateQuery } from '../translate'

// Mock settings provider only for required field
vi.mock('../utils', () => ({
    getSettings: async () => ({ provider: 'OpenAI' }),
}))

// Capture sendMessage calls
type SentPayload = { rolePrompt?: string; commandPrompt?: string }
const sendMessageSpy = vi.fn<[_payload: SentPayload], Promise<void>>(async () => {})
vi.mock('../engines', () => ({
    getEngine: () => ({
        // keep signature flexible
        sendMessage: (payload: unknown) => sendMessageSpy(payload as SentPayload),
    }),
}))

// Minimal language helpers
vi.mock('../lang', () => ({
    getLangName: (c: string) => {
        const map: Record<string, string> = {
            'en': 'English',
            'zh-Hans': 'Chinese Simplified',
        }
        return map[c] || c
    },
    getLangConfig: (code: string) => ({
        rolePrompt: 'You are a professional translator.',
        phoneticNotation: 'ipa',
        name: code,
        nameEn: code,
        isSource: true,
        isTarget: true,
        isVariant: false,
        direction: 'ltr',
        genCommandPrompt: () => 'Please translate.',
    }),
}))

vi.mock('uuid', () => ({ v4: () => '12345678-aaaa-bbbb-cccc-1234567890ab' }))

// Provide Intl.Segmenter mock
class MockSegmenter {
    segment(text: string) {
        return [{ segment: text }][Symbol.iterator]()
    }
}
;(Intl as unknown as { Segmenter: typeof MockSegmenter }).Segmenter = MockSegmenter

function buildQuery(overrides: Partial<TranslateQuery>): TranslateQuery {
    return {
        text: 'test',
        detectFrom: 'en',
        detectTo: 'zh-Hans',
        mode: 'translate',
        writing: false,
        action: { idx: 0, name: 'translate', createdAt: '', updatedAt: '', mode: 'translate' },
        onMessage: async () => {},
        onError: () => {},
        onFinish: () => {},
        signal: new AbortController().signal,
        ...overrides,
    } as TranslateQuery
}

describe('translate prompt building (subset)', () => {
    it('builds short Chinese-target special prompt when length <5', async () => {
        sendMessageSpy.mockClear()
        await translate(buildQuery({ text: '好', detectFrom: 'en', detectTo: 'zh-Hans' }))
        expect(sendMessageSpy).toHaveBeenCalledTimes(1)
        const first = (sendMessageSpy.mock.calls as unknown as SentPayload[][])[0][0] as {
            rolePrompt: string
            commandPrompt: string
        }
        expect(first.rolePrompt).toContain('你是一个翻译引擎')
        expect(first.commandPrompt).not.toContain('Please translate.')
    })

    it('sets word mode prompts for single word', async () => {
        sendMessageSpy.mockClear()
        await translate(buildQuery({ text: 'apple' }))
        expect(sendMessageSpy).toHaveBeenCalledTimes(1)
        const first = (sendMessageSpy.mock.calls as unknown as SentPayload[][])[0][0] as {
            rolePrompt: string
            commandPrompt: string
        }
        expect(first.rolePrompt).toContain('你是一个翻译引擎')
        expect(first.commandPrompt).toContain('Only reply the result')
    })

    it('explain-code mode wraps content in code fences', async () => {
        sendMessageSpy.mockClear()
        await translate(
            buildQuery({
                text: 'console.log(1)',
                mode: 'explain-code',
                action: { idx: 0, name: 'explain', createdAt: '', updatedAt: '', mode: 'explain-code' },
            })
        )
        expect(sendMessageSpy).toHaveBeenCalledTimes(1)
        const first = (sendMessageSpy.mock.calls as unknown as SentPayload[][])[0][0] as {
            commandPrompt: string
        }
        expect(first.commandPrompt).toMatch(/```\nconsole.log\(1\)\n```/)
    })
})
