import { describe, expect, it } from 'vitest'
import {
    getRecommendedOpenAIAPIPath,
    isResponsesCapableOpenAIModel,
    OPENAI_CHAT_COMPLETIONS_API_PATH,
    OPENAI_RESPONSES_API_PATH,
} from './openai-api-path'

describe('openai-api-path', () => {
    it('detects responses-capable models', () => {
        expect(isResponsesCapableOpenAIModel('gpt-5-nano')).toBe(true)
        expect(isResponsesCapableOpenAIModel('gpt-4o')).toBe(true)
        expect(isResponsesCapableOpenAIModel('o3-mini')).toBe(true)
        expect(isResponsesCapableOpenAIModel('gpt-4')).toBe(false)
    })

    it('returns recommended api path by model', () => {
        expect(getRecommendedOpenAIAPIPath('gpt-5-nano')).toBe(OPENAI_RESPONSES_API_PATH)
        expect(getRecommendedOpenAIAPIPath('gpt-4')).toBe(OPENAI_CHAT_COMPLETIONS_API_PATH)
        expect(getRecommendedOpenAIAPIPath(undefined)).toBe(OPENAI_CHAT_COMPLETIONS_API_PATH)
    })
})
