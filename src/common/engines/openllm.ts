import { urlJoin } from 'url-join-ts'
import { getUniversalFetch } from '../universal-fetch'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

// OpenLLM (https://www.openllm.sh) serves an OpenAI-compatible Chat Completions
// API, so we reuse AbstractOpenAI and only override the endpoint resolution and
// model listing. The base URL is read from settings because it is either the
// cloud endpoint (https://www.openllm.sh, needs an sk-llm-... key) or the local
// daemon (http://127.0.0.1:8787, needs no key).
export class OpenLLM extends AbstractOpenAI {
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
        // The local daemon needs no key, so only send the header when one is set.
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
        return settings.openLLMAPIModel
    }
    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.openLLMAPIKey
    }
    async getAPIURL(): Promise<string> {
        const settings = await getSettings()
        return settings.openLLMAPIURL
    }
    async getAPIURLPath(): Promise<string> {
        return '/v1/chat/completions'
    }
}
