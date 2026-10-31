/* eslint-disable camelcase */
import { getUniversalFetch } from '../universal-fetch'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

export class Cerebras extends AbstractOpenAI {
    // The inherited listModels would return OpenAI's GPT list when the global
    // noModelsAPISupport setting is on; Cerebras always has a models endpoint.
    async listModels(apiKey: string | undefined): Promise<IModel[]> {
        if (!apiKey) {
            return []
        }
        const fetcher = getUniversalFetch()
        const resp = await fetcher('https://api.cerebras.ai/v1/models', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
        })
        if (!resp.ok) {
            throw new Error(`Failed to fetch models: ${resp.statusText}`)
        }
        const data = await resp.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.data.map((item: any) => ({ id: item.id, name: item.id }))
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        return settings.cerebrasAPIModel
    }

    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.cerebrasAPIKey
    }

    async getAPIURL(): Promise<string> {
        return 'https://api.cerebras.ai'
    }

    async getAPIURLPath(): Promise<string> {
        return '/v1/chat/completions'
    }

    // The shared OpenAI base class omits temperature/top_p for non-GPT models,
    // but Cerebras' endpoint expects them. Keep the original request shape so
    // output determinism is preserved after de-duplicating sendMessage (#1810).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getBaseRequestBody(modelParam?: string): Promise<Record<string, any>> {
        const model = modelParam || (await this.getAPIModel())
        return {
            model,
            temperature: 0,
            top_p: 1,
            stream: true,
        }
    }
}
