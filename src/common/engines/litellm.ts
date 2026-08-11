import { urlJoin } from 'url-join-ts'
import { getUniversalFetch } from '../universal-fetch'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

// LiteLLM proxy exposes an OpenAI-compatible API, so we reuse AbstractOpenAI for
// chat completions and only override the endpoint resolution and model listing.
// Unlike a hosted gateway, the base URL points at the user's own proxy, so it is
// read from settings instead of being hardcoded.
export class LiteLLM extends AbstractOpenAI {
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
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        // A LiteLLM proxy usually requires a virtual/master key, but some run
        // without auth, so only send the header when a key is configured.
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
                name: model.id,
            }
        })
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        return settings.liteLLMAPIModel
    }
    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.liteLLMAPIKey
    }
    async getAPIURL(): Promise<string> {
        const settings = await getSettings()
        return settings.liteLLMAPIURL
    }
    async getAPIURLPath(): Promise<string> {
        return '/v1/chat/completions'
    }
}
