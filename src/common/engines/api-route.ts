import { urlJoin } from 'url-join-ts'
import { getUniversalFetch } from '../universal-fetch'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

export class APIRoute extends AbstractOpenAI {
    async listModels(apiKey_: string | undefined): Promise<IModel[]> {
        const apiKey = apiKey_ || (await this.getAPIKey())
        if (!apiKey) {
            return []
        }
        const response = await getUniversalFetch()(urlJoin(await this.getAPIURL(), '/v1/models'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
        })
        if (response.status !== 200) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Invalid API key')
            }
            throw new Error(`Failed to list models: ${response.statusText}`)
        }
        const json = await response.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return json.data.map((model: any) => ({ id: model.id, name: model.id }))
    }

    async getAPIModel(): Promise<string> {
        return (await getSettings()).apiRouteAPIModel
    }
    async getAPIKey(): Promise<string> {
        return (await getSettings()).apiRouteAPIKey
    }
    async getAPIURL(): Promise<string> {
        return 'https://global.api-route.com'
    }
    async getAPIURLPath(): Promise<string> {
        return '/v1/chat/completions'
    }
}
