/* eslint-disable camelcase */
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'

export class Cerebras extends AbstractOpenAI {
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
