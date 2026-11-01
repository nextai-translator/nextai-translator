/* eslint-disable camelcase */
import { urlJoin } from 'url-join-ts'
import { getUniversalFetch } from '../universal-fetch'
import { fetchSSE, getBrowser, getSettings } from '../utils'
import { AbstractEngine } from './abstract-engine'
import { IMessageRequest, IModel } from './interfaces'
import qs from 'qs'

const SAFETY_SETTINGS = [
    {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'OFF',
    },
    {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'OFF',
    },
    {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'OFF',
    },
    {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'OFF',
    },
]

const keyGeminiModelCapabilities = 'gemini-model-capabilities'

// Per-model capabilities reported by /v1beta/models. `thinking` is absent or
// false on models that reject the thinkingConfig field entirely (TTS,
// transcribe, embedding, live, Lyria, ...).
interface IGeminiModelCapabilities {
    [model: string]: {
        thinking?: boolean
    }
}

async function geminiModelStorage() {
    const browser = await getBrowser()
    // storage.local is absent in the Tauri/Electron/userscript polyfills
    return browser.storage.local ?? browser.storage.sync
}

async function saveGeminiModelCapabilities(capabilities: IGeminiModelCapabilities): Promise<void> {
    try {
        const storage = await geminiModelStorage()
        await storage.set({ [keyGeminiModelCapabilities]: capabilities })
    } catch {
        // best-effort cache; sendMessage falls back to name heuristics
    }
}

async function getGeminiModelCapabilities(): Promise<IGeminiModelCapabilities | undefined> {
    try {
        const storage = await geminiModelStorage()
        const items = await storage.get([keyGeminiModelCapabilities])
        return items[keyGeminiModelCapabilities]
    } catch {
        return undefined
    }
}

// Resolves the thinkingConfig generation field for a model, per
// https://ai.google.dev/gemini-api/docs/generate-content/thinking and
// https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api
// `capabilityThinking` is the `thinking` flag reported by the models API:
// false means the model rejects thinkingConfig, undefined means unknown.
export function resolveGeminiThinkingConfig(
    model: string,
    thinkingEnabled: boolean,
    capabilityThinking?: boolean
): Record<string, unknown> | undefined {
    if (capabilityThinking === false) {
        return undefined
    }
    const isGemma = /^gemma-/i.test(model)
    const major = /^gemini-(\d+)/i.exec(model)?.[1]
    // generateContent API: 3.x+, Gemini Robotics-ER 2, and Gemma 4 take
    // thinkingLevel; only 2.x takes thinkingBudget (deprecated on Gemini 4).
    // *-latest aliases track the newest generation, so use thinkingLevel.
    const usesThinkingLevel =
        isGemma || /robotics-er-2/i.test(model) || /-latest$/i.test(model) || (major ? Number(major) >= 3 : false)
    const usesThinkingBudget = major ? Number(major) < 3 : false
    // 'minimal' is rejected by Pro, Gemini 4, and Flash >= 3.8; accepted by
    // 3 Flash, 3.6 Flash, 3.x Flash-Lite (incl. -image), Robotics ER 2, Gemma 4.
    const supportsMinimal = isGemma || /flash-lite/i.test(model) || /^gemini-3(?:-flash|\.6-flash)/i.test(model)
    const isPro = /-pro($|[-:])/i.test(model)
    if (thinkingEnabled) {
        // Gemma 4 thinks only when told to: docs use 'high' to enable.
        if (isGemma) {
            return { thinkingLevel: 'high' }
        }
        // level family: empty object = model default. 2.x: dynamic thinking.
        if (usesThinkingLevel) {
            return {}
        }
        return usesThinkingBudget ? { thinkingBudget: -1 } : undefined
    }
    if (usesThinkingLevel) {
        return { thinkingLevel: supportsMinimal ? 'minimal' : 'low' }
    }
    if (usesThinkingBudget) {
        // 2.5 Pro cannot disable thinking; 128 is its minimum budget.
        return { thinkingBudget: isPro ? 128 : 0 }
    }
    // Unknown family (Omni, Deep Research, agents): don't guess params.
    return undefined
}

export class Gemini extends AbstractEngine {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listModels(apiKey: string | undefined): Promise<IModel[]> {
        if (!apiKey) {
            return []
        }
        const settings = await getSettings()
        const geminiAPIURL = settings.geminiAPIURL
        const url =
            urlJoin(geminiAPIURL, '/v1beta/models') +
            qs.stringify({ key: apiKey, pageSize: 1000 }, { addQueryPrefix: true })
        const fetcher = getUniversalFetch()
        const resp = await fetcher(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        const jsn = await resp.json()
        if (!jsn.models) {
            return []
        }
        const capabilities: IGeminiModelCapabilities = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jsn.models.forEach((model: any) => {
            const name = model.name.split('/').pop()
            capabilities[name] = { thinking: model.thinking === true }
        })
        await saveGeminiModelCapabilities(capabilities)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (
            jsn.models
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((model: any) => {
                    const name = model.name.split('/').pop()
                    return {
                        id: name,
                        name: name,
                    }
                })
        )
    }

    async getModel() {
        const settings = await getSettings()
        return settings.geminiAPIModel
    }

    async sendMessage(req: IMessageRequest): Promise<void> {
        const settings = await getSettings()
        const apiKey = settings.geminiAPIKey
        const geminiAPIURL = settings.geminiAPIURL
        const model = req.modelOverride || (await this.getModel())
        const url =
            urlJoin(geminiAPIURL, '/v1beta/models/', `${model}:streamGenerateContent`) +
            qs.stringify({ key: apiKey, alt: 'sse' }, { addQueryPrefix: true })
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41',
        }

        // Configure thinking based on user preference and model capabilities.
        // Prefer the `thinking` flag reported by /v1beta/models (cached when
        // the model list was fetched); fall back to name-based rules when the
        // cache is missing, e.g. for manually typed model names.
        // See: https://ai.google.dev/gemini-api/docs/thinking
        const capabilityThinking = (await getGeminiModelCapabilities())?.[model]?.thinking
        const thinkingConfig = resolveGeminiThinkingConfig(model, settings.thinkingEnabled, capabilityThinking)

        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: req.rolePrompt ? req.rolePrompt + '\n\n' + req.commandPrompt : req.commandPrompt,
                        },
                    ],
                },
            ],
            safetySettings: SAFETY_SETTINGS,
            generationConfig: thinkingConfig ? { thinkingConfig } : {},
        }

        let hasError = false
        let finished = false
        await fetchSSE(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: req.signal,
            usePartialArrayJSONParser: false,
            onMessage: async (msg) => {
                if (finished) return
                let resp
                try {
                    resp = JSON.parse(msg)
                } catch (e) {
                    hasError = true
                    finished = true
                    req.onError(JSON.stringify(e))
                    return
                }
                if (!resp.candidates || resp.candidates.length === 0) {
                    hasError = true
                    finished = true
                    req.onError('no candidates')
                    return
                }
                if (resp.candidates[0].finishReason && resp.candidates[0].finishReason !== 'STOP') {
                    finished = true
                    req.onFinished(resp.candidates[0].finishReason)
                    return
                }
                const targetTxt = resp.candidates[0].content.parts[0].text
                await req.onMessage({ content: targetTxt, role: '' })
            },
            onError: (err) => {
                hasError = true
                if (err instanceof Error) {
                    req.onError(err.message)
                    return
                }
                if (typeof err === 'string') {
                    req.onError(err)
                    return
                }
                if (typeof err === 'object') {
                    const item = err[0]
                    if (item && item.error && item.error.message) {
                        req.onError(item.error.message)
                        return
                    }
                }
                const { error } = err
                if (error instanceof Error) {
                    req.onError(error.message)
                    return
                }
                if (typeof error === 'object') {
                    const { message } = error
                    if (message) {
                        if (typeof message === 'string') {
                            req.onError(message)
                        } else {
                            req.onError(JSON.stringify(message))
                        }
                        return
                    }
                }
                req.onError('Unknown error')
            },
        })

        if (!finished && !hasError) {
            req.onFinished('stop')
        }
    }
}
