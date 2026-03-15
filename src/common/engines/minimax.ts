import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

export class MiniMax extends AbstractOpenAI {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listModels(_apiKey: string | undefined): Promise<IModel[]> {
        return [
            { id: 'MiniMax-M2.5', name: 'MiniMax-M2.5' },
            { id: 'MiniMax-M2.5-highspeed', name: 'MiniMax-M2.5-highspeed' },
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
        return 'https://api.minimax.io'
    }
    async getAPIURLPath(): Promise<string> {
        return '/v1/chat/completions'
    }
}
