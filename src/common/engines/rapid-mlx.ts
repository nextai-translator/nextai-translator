import { urlJoin } from 'url-join-ts'
import { getUniversalFetch } from '../universal-fetch'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

export class RapidMLX extends AbstractOpenAI {
    isLocal() {
        return true
    }

    async getHeaders(): Promise<Record<string, string>> {
        const headers = await super.getHeaders()
        if (!(await this.getAPIKey())) {
            delete headers.Authorization
        }
        return headers
    }

    async listModels(apiKey_: string | undefined): Promise<IModel[]> {
        let apiKey = apiKey_
        if (!apiKey) {
            apiKey = await this.getAPIKey()
        }
        const apiURL = await this.getAPIURL()
        if (!apiURL) {
            return []
        }
        const url = urlJoin(apiURL, '/models')
        const fetcher = getUniversalFetch()
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
                name: model.id,
            }
        })
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        return settings.rapidMLXAPIModel || ''
    }
    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.rapidMLXAPIKey || ''
    }
    async getAPIURL(): Promise<string> {
        const settings = await getSettings()
        return settings.rapidMLXAPIURL
    }
    async getAPIURLPath(): Promise<string> {
        return '/chat/completions'
    }
}
