import { getUniversalFetch } from '../universal-fetch'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

const ATLAS_API_URL = 'https://api.atlascloud.ai/v1'
const ATLAS_MODELS_URL = 'https://api.atlascloud.ai/api/v1/models'
const CHAT_COMPLETIONS_PROTOCOL = 'openai.chat.completions'

interface AtlasModel {
    model?: unknown
    displayName?: unknown
    display_console?: unknown
    supported_protocols?: unknown
}

export class AtlasCloud extends AbstractOpenAI {
    async listModels(): Promise<IModel[]> {
        const fetcher = getUniversalFetch()
        const response = await fetcher(ATLAS_MODELS_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        if (response.status !== 200) {
            throw new Error(`Failed to list models: ${response.statusText}`)
        }

        const json = await response.json()
        if (!Array.isArray(json?.data)) {
            return []
        }

        return json.data
            .filter((model: AtlasModel) => {
                return (
                    typeof model.model === 'string' &&
                    model.display_console === true &&
                    Array.isArray(model.supported_protocols) &&
                    model.supported_protocols.includes(CHAT_COMPLETIONS_PROTOCOL)
                )
            })
            .map((model: AtlasModel) => {
                const id = model.model as string
                return {
                    id,
                    name: typeof model.displayName === 'string' ? model.displayName : id,
                }
            })
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        return settings.atlasCloudAPIModel
    }

    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.atlasCloudAPIKey
    }

    async getAPIURL(): Promise<string> {
        return ATLAS_API_URL
    }

    async getAPIURLPath(): Promise<string> {
        return '/chat/completions'
    }
}
