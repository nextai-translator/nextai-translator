export const OPENAI_CHAT_COMPLETIONS_API_PATH = '/v1/chat/completions'
export const OPENAI_RESPONSES_API_PATH = '/v1/responses'
export const OPENAI_PREFERRED_DEFAULT_MODEL = 'gpt-5-nano'

const RESPONSES_CAPABLE_MODEL_PATTERNS = [
    /^gpt-5(?:$|[.-])/,
    /^o\d+(?:$|[.-])/,
    /^gpt-4o(?:$|[.-])/,
    /^gpt-4\.1(?:$|[.-])/,
    /^gpt-4\.5(?:$|[.-])/,
]

export function isResponsesCapableOpenAIModel(model: string | undefined | null): boolean {
    if (!model) {
        return false
    }
    const modelLower = model.trim().toLowerCase()
    if (!modelLower) {
        return false
    }
    return RESPONSES_CAPABLE_MODEL_PATTERNS.some((pattern) => pattern.test(modelLower))
}

export function getRecommendedOpenAIAPIPath(model: string | undefined | null): string {
    return isResponsesCapableOpenAIModel(model) ? OPENAI_RESPONSES_API_PATH : OPENAI_CHAT_COMPLETIONS_API_PATH
}
