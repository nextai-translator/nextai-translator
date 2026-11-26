import { providers } from './constants'
import type { ISettings } from './types'

type Field = 'string' | 'boolean' | 'number' | ((value: unknown) => boolean) | { [key: string]: Field }

export function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function matches(value: unknown, field: Field): boolean {
    if (typeof field === 'string') {
        return field === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === field
    }
    if (typeof field === 'function') {
        return field(value)
    }
    return (
        isRecord(value) &&
        Object.entries(field).every(
            ([key, type]) => value[key] === null || value[key] === undefined || matches(value[key], type)
        )
    )
}

const oneOf = (choices: readonly string[]) => (value: unknown) => typeof value === 'string' && choices.includes(value)

const proxyFields: Field = {
    enabled: 'boolean',
    protocol: oneOf(['HTTP', 'HTTPS']),
    server: 'string',
    port: 'string',
    basicAuth: { username: 'string', password: 'string' },
    noProxy: 'string',
}

const ttsFields: Field = {
    voices: (value) =>
        Array.isArray(value) &&
        value.every((voice) => isRecord(voice) && typeof voice.lang === 'string' && typeof voice.voice === 'string'),
    provider: oneOf(['LocalTTS', 'WebSpeech', 'EdgeTTS']),
    volume: 'number',
    rate: 'number',
}

const fields = {
    automaticCheckForUpdates: 'boolean',
    apiKeys: 'string',
    apiURL: 'string',
    apiURLPath: 'string',
    apiModel: 'string',
    provider: oneOf(providers),
    chatgptModel: 'string',
    azureAPIKeys: 'string',
    azureAPIURL: 'string',
    azureAPIURLPath: 'string',
    azureAPIModel: 'string',
    azMaxWords: 'number',
    enableMica: 'boolean',
    enableBackgroundBlur: 'boolean',
    miniMaxGroupID: 'string',
    miniMaxAPIKey: 'string',
    miniMaxAPIModel: 'string',
    miniMaxAPIURL: 'string',
    moonshotAPIKey: 'string',
    moonshotAPIModel: 'string',
    geminiAPIURL: 'string',
    geminiAPIKey: 'string',
    geminiAPIModel: 'string',
    autoTranslate: 'boolean',
    defaultTranslateMode: 'string',
    defaultTargetLanguage: 'string',
    alwaysShowIcons: 'boolean',
    hotkey: 'string',
    displayWindowHotkey: 'string',
    ocrHotkey: 'string',
    quickTranslatorHotkey: 'string',
    writingTargetLanguage: 'string',
    writingHotkey: 'string',
    writingNewlineHotkey: 'string',
    themeType: oneOf(['light', 'dark', 'followTheSystem']),
    i18n: 'string',
    tts: ttsFields,
    restorePreviousPosition: 'boolean',
    runAtStartup: 'boolean',
    selectInputElementsText: 'boolean',
    readSelectedWordsFromInputElementsText: 'boolean',
    disableCollectingStatistics: 'boolean',
    allowUsingClipboardWhenSelectedTextNotAvailable: 'boolean',
    pinned: 'boolean',
    autoCollect: 'boolean',
    hideTheIconInTheDock: 'boolean',
    languageDetectionEngine: oneOf(['google', 'baidu', 'bing', 'local']),
    autoHideWindowWhenOutOfFocus: 'boolean',
    proxy: proxyFields,
    customModelName: 'string',
    ollamaAPIURL: 'string',
    ollamaAPIModel: 'string',
    ollamaCustomModelName: 'string',
    ollamaModelLifetimeInMemory: 'string',
    thinkingEnabled: 'boolean',
    groqAPIURL: 'string',
    groqAPIURLPath: 'string',
    groqAPIModel: 'string',
    groqAPIKey: 'string',
    groqCustomModelName: 'string',
    claudeAPIURL: 'string',
    claudeAPIURLPath: 'string',
    claudeAPIModel: 'string',
    claudeAPIKey: 'string',
    claudeCustomModelName: 'string',
    kimiRefreshToken: 'string',
    kimiAccessToken: 'string',
    chatglmAccessToken: 'string',
    chatglmRefreshToken: 'string',
    cohereAPIKey: 'string',
    cohereAPIModel: 'string',
    deepSeekAPIKey: 'string',
    deepSeekAPIModel: 'string',
    cerebrasAPIKey: 'string',
    cerebrasAPIModel: 'string',
    teamoRouterAPIKey: 'string',
    teamoRouterAPIModel: 'string',
    openRouterAPIKey: 'string',
    openRouterAPIModel: 'string',
    liteLLMAPIURL: 'string',
    liteLLMAPIKey: 'string',
    liteLLMAPIModel: 'string',
    fontSize: 'number',
    uiFontSize: 'number',
    iconSize: 'number',
    noModelsAPISupport: 'boolean',
    claudeThinking: 'boolean',
    claudeThinkingLevel: oneOf(['low', 'medium', 'high']),
    useCompactLookup: 'boolean',
} satisfies Record<keyof ISettings, Field>

export const settingKeys = Object.keys(fields) as (keyof ISettings)[]

export function isSettingValue(key: keyof ISettings, value: unknown): boolean {
    return value === null || matches(value, fields[key])
}
