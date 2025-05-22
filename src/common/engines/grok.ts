/* eslint-disable camelcase */
import { AbstractOpenAI, type IModel } from './abstract-openai'
import { getSettings } from '../settings'

export class GrokEngine extends AbstractOpenAI {
    get name(): string {
        return 'Grok (xAI)'
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        return settings.grokApiModel || 'grok-3-beta' // Default to grok-3-beta
    }

    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.grokApiKey || ''
    }

    async getAPIURL(): Promise<string> {
        return 'https://api.x.ai/v1' // Official xAI API endpoint
    }

    async getAPIURLPath(): Promise<string> {
        return '/chat/completions' // Standard path for OpenAI-compatible APIs
    }

    async listModels(_apiKey: string | undefined): Promise<IModel[]> {
        return [
            { id: 'grok-3-beta', name: 'Grok 3 Beta' },
            { id: 'grok-3-mini-beta', name: 'Grok 3 Mini Beta' },
        ]
    }

    supportCustomModel(): boolean {
        return false
    }

    supportStreaming(): boolean {
        return true // Assuming OpenAI compatibility includes streaming
    }

    // Removed custom sendMessage to use AbstractOpenAI's streaming implementation.
    // Removed custom getHeaders to use AbstractOpenAI's implementation.

    async getBaseRequestBody(): Promise<Record<string, any>> {
        const settings = await getSettings()
        const model = await this.getAPIModel()
        
        const requestBody: Record<string, any> = {
            model,
            stream: true, // Enable streaming
            // messages will be added by AbstractOpenAI's sendMessage
        }

        // Include temperature if it's set in settings, otherwise use a sensible default
        // or let AbstractOpenAI handle it if it has its own default logic.
        // For now, let's assume a setting 'grokTemperature' might exist.
        if (settings.grokTemperature !== undefined && settings.grokTemperature !== null) {
            requestBody.temperature = settings.grokTemperature
        } else {
            // A common default temperature.
            // If AbstractOpenAI handles temperature, this might not be strictly necessary
            // unless Grok has a specific preferred default or range.
            requestBody.temperature = 0.7 
        }
        
        // Add other OpenAI-compatible parameters as needed, from settings or defaults.
        // Example: max_tokens, top_p, etc.
        // For now, keeping it minimal to what's explicitly mentioned or common.

        return requestBody
    }
}
