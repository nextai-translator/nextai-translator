/* eslint-disable camelcase */
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai'
import { getSettings } from '../utils'
import { AbstractEngine } from './abstract-engine'
import { IMessageRequest, IModel } from './interfaces'

const SAFETY_SETTINGS = [
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
]

export class Gemini extends AbstractEngine {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listModels(apiKey: string | undefined): Promise<IModel[]> {
        // The new SDK does not support listing models in the same way.
        // This might need to be implemented differently if required,
        // for now, we can return a hardcoded or empty list.
        // Keeping old implementation for now as SDK doesn't support it.
        if (!apiKey) {
            return []
        }
        const settings = await getSettings()
        const geminiAPIURL = settings.geminiAPIURL
        // The SDK doesn't expose a model listing API. We have to do it manually.
        // It's a known issue: https://github.com/google/generative-ai-js/issues/31
        const url = `${geminiAPIURL}/v1beta/models?key=${apiKey}&pageSize=1000`
        const fetcher = fetch
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
        if (!apiKey) {
            req.onError('Gemini API key not set')
            return
        }
        const modelName = await this.getModel()

        try {
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({
                model: modelName,
                safetySettings: SAFETY_SETTINGS,
            })

            const prompt = req.rolePrompt ? `${req.rolePrompt}\n\n${req.commandPrompt}` : req.commandPrompt

            const result = await model.generateContentStream(prompt)

            const signal = req.signal
            if (signal) {
                signal.addEventListener('abort', () => {
                    // This is a bit of a hack, as the SDK doesn't directly support aborting streams yet.
                    // We can't truly abort the underlying request, but we can stop processing it.
                    console.log('Gemini stream aborted')
                })
            }

            for await (const chunk of result.stream) {
                if (signal?.aborted) {
                    break
                }
                const chunkText = chunk.text()
                if (chunkText) {
                    await req.onMessage({ content: chunkText, role: '' })
                }
                const finishReason = chunk.candidates?.[0]?.finishReason
                if (finishReason && finishReason !== 'STOP') {
                    req.onFinished(finishReason)
                }
            }
        } catch (err) {
            let errorMessage = 'An unknown error occurred'
            if (err instanceof Error) {
                errorMessage = err.message
            } else if (typeof err === 'string') {
                errorMessage = err
            } else if (err && typeof err === 'object' && 'message' in err) {
                errorMessage = String((err as { message: unknown }).message)
            }
            req.onError(errorMessage)
        }
    }
}
