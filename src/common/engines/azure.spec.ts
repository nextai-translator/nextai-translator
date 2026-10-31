import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSSE, getSettings } from '../utils'
import { Azure, usesMaxCompletionTokens } from './azure'

vi.mock('../utils', () => ({
    defaultAPIURL: 'https://api.openai.com',
    defaultAPIURLPath: '/v1/chat/completions',
    fetchSSE: vi.fn(),
    getSettings: vi.fn(),
}))

describe('Azure token limit parameter', () => {
    it('uses the replacement parameter for GPT-4o deployments', () => {
        expect(usesMaxCompletionTokens('gpt-4o', 'https://example.openai.azure.com')).toBe(true)
        expect(usesMaxCompletionTokens('gpt-4o-mini', 'https://example.openai.azure.com')).toBe(true)
    })

    it('uses the replacement parameter for Azure AI Foundry endpoints', () => {
        expect(usesMaxCompletionTokens('custom-model', 'https://resource.services.ai.azure.com')).toBe(true)
    })

    it('keeps the legacy parameter for older Azure OpenAI models', () => {
        expect(usesMaxCompletionTokens('gpt-4', 'https://example.openai.azure.com')).toBe(false)
        expect(usesMaxCompletionTokens('gpt-3.5-turbo', 'https://example.openai.azure.com')).toBe(false)
    })

    describe('getBaseRequestBody', () => {
        beforeEach(() => {
            vi.mocked(getSettings).mockResolvedValue({
                azureAPIModel: 'gpt-4o',
                azureAPIURL: 'https://example.openai.azure.com',
                azMaxWords: 1024,
            } as never)
        })

        it('sends max_completion_tokens for GPT-4o', async () => {
            const body = await new Azure().getBaseRequestBody()

            expect(body.max_completion_tokens).toBe(1024)
            expect(body.max_tokens).toBeUndefined()
        })

        it('sends max_tokens for legacy models', async () => {
            vi.mocked(getSettings).mockResolvedValueOnce({
                azureAPIModel: 'gpt-4',
                azureAPIURL: 'https://example.openai.azure.com',
                azMaxWords: 1024,
            } as never)

            const body = await new Azure().getBaseRequestBody()

            expect(body.max_tokens).toBe(1024)
            expect(body.max_completion_tokens).toBeUndefined()
        })
    })

    it('sends max_output_tokens, not max_completion_tokens, to the Responses API', async () => {
        vi.mocked(getSettings).mockResolvedValue({
            azureAPIModel: 'gpt-5-mini',
            azureAPIURL: 'https://example.openai.azure.com',
            azureAPIURLPath: '/openai/v1/responses',
            azureAPIKeys: 'test-key',
            azMaxWords: 1024,
        } as never)
        let body = ''
        vi.mocked(fetchSSE).mockImplementationOnce(async (_input, options) => {
            body = (options as { body: string }).body
        })

        await new Azure().sendMessage({
            rolePrompt: 'You are a translator',
            commandPrompt: 'Translate hello to Chinese',
            onMessage: vi.fn(),
            onError: vi.fn(),
            onFinished: vi.fn(),
            signal: new AbortController().signal,
        })

        const sent = JSON.parse(body)
        expect(sent.max_output_tokens).toBe(1024)
        expect(sent.max_completion_tokens).toBeUndefined()
        expect(sent.max_tokens).toBeUndefined()
    })
})
