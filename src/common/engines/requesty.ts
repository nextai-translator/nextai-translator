import { urlJoin } from 'url-join-ts'
import { getUniversalFetch } from '../universal-fetch'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

const LIST_MODELS_TIMEOUT_MS = 15000

// Model ids end up in the settings UI, so skip anything carrying control
// characters (including ANSI escape sequences).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/

export class Requesty extends AbstractOpenAI {
    async listModels(apiKey_: string | undefined): Promise<IModel[]> {
        let apiKey = apiKey_
        if (!apiKey) {
            apiKey = await this.getAPIKey()
        }
        const apiURL = await this.getAPIURL()
        if (!apiURL) {
            return []
        }
        // Managed models (short ids like gpt-5.4-mini) come first, followed by
        // the full vendor/model catalog. Both endpoints are public, so listing
        // works before a key is configured; with a key the catalog is limited
        // to the models approved for the account.
        const [managed, catalog] = await Promise.allSettled([
            this.fetchModels(urlJoin(apiURL, '/v1/models/managed'), apiKey),
            this.fetchModels(urlJoin(apiURL, '/v1/models'), apiKey),
        ])
        if (managed.status === 'rejected' && catalog.status === 'rejected') {
            throw catalog.reason
        }
        const seen = new Set<string>()
        const models: IModel[] = []
        for (const result of [managed, catalog]) {
            if (result.status !== 'fulfilled') {
                continue
            }
            for (const model of result.value) {
                if (seen.has(model.id)) {
                    continue
                }
                seen.add(model.id)
                models.push(model)
            }
        }
        return models
    }

    private async fetchModels(url: string, apiKey: string | undefined): Promise<IModel[]> {
        const fetcher = getUniversalFetch()
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`
        }
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), LIST_MODELS_TIMEOUT_MS)
        try {
            const response = await fetcher(url, {
                method: 'GET',
                headers,
                signal: controller.signal,
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
            return (
                (json.data ?? [])
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((model: any) => {
                        return typeof model?.id === 'string' && model.id !== '' && !CONTROL_CHARS.test(model.id)
                    })
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((model: any) => {
                        return {
                            id: model.id,
                            name: model.id,
                            description: model.description
                                ? String(model.description).split('\n')[0].slice(0, 120)
                                : undefined,
                        }
                    })
            )
        } finally {
            clearTimeout(timer)
        }
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        return settings.requestyAPIModel
    }
    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.requestyAPIKey
    }
    async getAPIURL(): Promise<string> {
        return 'https://router.requesty.ai'
    }
    async getAPIURLPath(): Promise<string> {
        return '/v1/chat/completions'
    }
}
