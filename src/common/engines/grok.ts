/* eslint-disable camelcase */
import { urlJoin } from 'url-join-ts'
import { CUSTOM_MODEL_ID } from '../constants'
import { getUniversalFetch } from '../universal-fetch'
import { getSettings } from '../utils'
import { AbstractOpenAI } from './abstract-openai'
import { IModel } from './interfaces'

export class Grok extends AbstractOpenAI {
    supportCustomModel(): boolean {
        return true
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listModels(apiKey: string | undefined): Promise<IModel[]> {
        if (!apiKey) {
            return [] // If no API key is provided, return empty
        }
        const settings = await getSettings()
        const apiUrl = settings.grokAPIURL // Fetches the API URL from settings
        if (!apiUrl) {
            // If API URL is not configured, provide a default/fallback
            console.warn('Grok API URL not configured.')
            return [{ id: 'grok-1', name: 'grok-1 (default, URL not configured)' }]
        }

        // Constructs the URL to fetch models, typically [your_api_url]/models
        const url = urlJoin(apiUrl, '/models')
        const fetcher = getUniversalFetch()

        try {
            // Makes the actual API request using the provided apiKey and configured apiUrl
            const resp = await fetcher(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`, // Uses the API key for authorization
                },
            })

            if (!resp.ok) {
                // If the request fails, log an error and provide a fallback
                console.error(`Failed to fetch Grok models: ${resp.status} ${resp.statusText}`, await resp.text())
                return [{ id: 'grok-1', name: 'grok-1 (default, API error)' }]
            }

            const data = await resp.json()
            // Tries to parse the response assuming an OpenAI-compatible format
            if (data && data.data && Array.isArray(data.data)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return data.data.map((model: any) => ({
                    id: model.id,
                    name: model.name || model.id,
                }))
            } else {
                // If the response format is unexpected, provide a fallback
                console.warn('Unexpected format for Grok models list:', data)
                return [{ id: 'grok-1', name: 'grok-1 (default, format error)' }]
            }
        } catch (error) {
            // If any other error occurs during the fetch, provide a fallback
            console.error('Error fetching Grok models:', error)
            return [{ id: 'grok-1', name: 'grok-1 (default, fetch error)' }]
        }
    }

    async getAPIModel(): Promise<string> {
        const settings = await getSettings()
        // Assuming settings keys like 'grokAPIModel' and 'grokCustomModelName'
        // These would need to be added to your settings structure and UI
        if (settings.grokAPIModel === CUSTOM_MODEL_ID && settings.grokCustomModelName) {
            return settings.grokCustomModelName
        }
        return settings.grokAPIModel || 'grok-1' // Default model if not set
    }

    async getAPIKey(): Promise<string> {
        const settings = await getSettings()
        return settings.grokAPIKey || '' // Assuming 'grokAPIKey' in settings
    }

    async getAPIURL(): Promise<string> {
        const settings = await getSettings()
        return settings.grokAPIURL || '' // Assuming 'grokAPIURL' in settings
    }

    async getAPIURLPath(): Promise<string> {
        // Use the configured API URL path from settings, or default to OpenAI-compatible path
        const settings = await getSettings()
        return settings.grokAPIURLPath || '/chat/completions'
    }
}
