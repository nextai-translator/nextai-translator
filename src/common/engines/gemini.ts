/* eslint-disable camelcase */
import { urlJoin } from 'url-join-ts'
import { getUniversalFetch } from '../universal-fetch'
import { fetchSSE, getSettings } from '../utils'
import { AbstractEngine } from './abstract-engine'
import { IMessageRequest, IModel } from './interfaces'
import qs from 'qs'

const SAFETY_SETTINGS = [
    {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
    },
    {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE',
    },
    {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE',
    },
    {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
    },
]

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return jsn.models.map((model: any) => {
            const name = model.name.split('/').pop()
            return {
                id: name,
                name: name,
            }
        })
    }

    async getModel() {
        const settings = await getSettings()
        return settings.geminiAPIModel
    }

    async sendMessage(req: IMessageRequest): Promise<void> {
        const settings = await getSettings()
        const apiKey = settings.geminiAPIKey
        const geminiAPIURL = settings.geminiAPIURL
        const model = await this.getModel()
        const url =
            urlJoin(geminiAPIURL, '/v1beta/models/', `${model}:streamGenerateContent`) +
            qs.stringify({ key: apiKey }, { addQueryPrefix: true })
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41',
        }
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
        }

        await fetchSSE(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: req.signal,
            usePartialArrayJSONParser: true,
            onMessage: async (msg) => {
                let resp
                try {
                    resp = JSON.parse(msg)
                } catch (e) {
                    req.onError(JSON.stringify(e))
                    return
                }

                // Always process text content first
                const text = resp.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) {
                    await req.onMessage({ content: text, role: '' })
                }

                // Check for a finish reason
                const finishReason = resp.candidates?.[0]?.finishReason

                // CRUCIAL: Only call onFinished if the reason is abnormal (i.e., NOT "STOP").
                // A silent end of the stream after "STOP" is the success case.
                if (finishReason && finishReason !== 'STOP') {
                    req.onFinished(finishReason)
                }
            },
            onError: (err) => {
                if (err instanceof Error) {
                    req.onError(err.message)
                    return
                }
                if (typeof err === 'string') {
                    req.onError(err)
                    return
                }
                // Simplified the rest of the error handling as it was overly complex
                const errorMessage = JSON.stringify(err)
                req.onError(errorMessage)
            },
        })
    }
}
