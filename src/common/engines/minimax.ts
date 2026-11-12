import { getSettings, miniMaxGlobalAPIURL } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

export class MiniMax extends AbstractOpenAI {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listModels(_apiKey: string | undefined): Promise<IModel[]> {
        return [
            { id: 'MiniMax-M3', name: 'MiniMax-M3' },
            { id: 'MiniMax-M2.7', name: 'MiniMax-M2.7' },
            { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax-M2.7-highspeed' },
        ]
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        return settings.miniMaxAPIModel
    }
    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.miniMaxAPIKey
    }
    async getAPIURL(): Promise<string> {
        const settings = await getSettings()
        // Global (api.minimax.io) or mainland China (api.minimaxi.com), chosen in the settings
        const apiURL = settings.miniMaxAPIURL?.trim().replace(/\/+$/, '')
        return apiURL || miniMaxGlobalAPIURL
    }
    async getAPIURLPath(): Promise<string> {
        return '/v1/chat/completions'
    }
}
