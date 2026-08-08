import { urlJoin } from 'url-join-ts'
import { getUniversalFetch } from '../universal-fetch'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

export class OpenRouter extends AbstractOpenAI {
    async listModels(apiKey_: string | undefined): Promise<IModel[]> {
        let apiKey = apiKey_
        if (!apiKey) {
            apiKey = await this.getAPIKey()
        }
        const apiURL = await this.getAPIURL()
        if (!apiURL) {
            return []
        }
        const url = urlJoin(apiURL, '/v1/models')
        const fetcher = getUniversalFetch()
        // The models endpoint is public, so listing works before a key is
        // configured; send the key when we have one anyway.
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`
        }
        const response = await fetcher(url, {
            method: 'GET',
            headers,
        })
        if (response.status !== 200) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Invalid API key')
            }
            if (response.status === 404) {
                throw new Error('Invalid API URL')
            }
            throw new Error(`Failed to list models: ${response.statusText}`)
        }
        const json = await response.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return json.data.map((model: any) => {
            return {
                id: model.id,
                name: model.name ?? model.id,
                description: model.description ? String(model.description).split('\n')[0].slice(0, 120) : undefined,
            }
        })
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        return settings.openRouterAPIModel
    }
    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.openRouterAPIKey
    }
    async getAPIURL(): Promise<string> {
        return 'https://openrouter.ai/api'
    }
    async getAPIURLPath(): Promise<string> {
        return '/v1/chat/completions'
    }
}
