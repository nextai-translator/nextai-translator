/* eslint-disable camelcase */
import { urlJoin } from 'url-join-ts'
import { CUSTOM_MODEL_ID } from '../constants'
import { fetchSSE, getSettings } from '../utils'
import { AbstractEngine } from './abstract-engine'
import { IModel, IMessageRequest } from './interfaces'

export class Claude extends AbstractEngine {
    supportCustomModel(): boolean {
        return true
    }

    async getModel(): Promise<string> {
        const settings = await getSettings()
        if (settings.claudeAPIModel === CUSTOM_MODEL_ID) {
            return settings.claudeCustomModelName
        }
        return settings.claudeAPIModel
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listModels(apiKey_: string | undefined): Promise<IModel[]> {
        return Promise.resolve([
            { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
            { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
            { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
            { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        ])
    }

    async sendMessage(req: IMessageRequest): Promise<void> {
        const settings = await getSettings()
        const apiKey = settings.claudeAPIKey
        const model = req.modelOverride || (await this.getModel())
        const url = urlJoin(settings.claudeAPIURL, settings.claudeAPIURLPath)
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
            'anthropic-beta': 'messages-2023-12-15',
            'x-api-key': apiKey,
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: Record<string, any> = {
            model,
            stream: true,
            messages: [
                {
                    role: 'user',
                    content: req.rolePrompt ? req.rolePrompt + '\n\n' + req.commandPrompt : req.commandPrompt,
                },
            ],
        }
        if (req.thinkingBudget) {
            body.thinking = {
                type: 'enabled',
                budget_tokens: req.thinkingBudget,
            }
            body.max_tokens = Math.max(16384, req.thinkingBudget + 4096)
        } else {
            body.temperature = 0
            body.max_tokens = 4096
        }

        let hasError = false
        let finished = false
        await fetchSSE(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: req.signal,
            onMessage: async (msg) => {
                if (finished) return
                let resp
                try {
                    resp = JSON.parse(msg)
                } catch (e) {
                    hasError = true
                    finished = true
                    req.onError(JSON.stringify(e))
                    return
                }
                const { type } = resp
                if (type === 'content_block_delta') {
                    const { delta } = resp
                    if (delta.type === 'thinking_delta') {
                        return
                    }
                    const { text } = delta
                    await req.onMessage({ content: text, role: '' })
                    return
                }
                if (type === 'message_stop') {
                    finished = true
                    req.onFinished('stop')
                    return
                }
                if (type === 'error') {
                    const { error } = resp
                    req.onError('Claude API response: ' + error.message)
                }
            },
            onError: (err) => {
                hasError = true
                if (err instanceof Error) {
                    req.onError(err.message)
                    return
                }
                if (typeof err === 'string') {
                    req.onError(err)
                    return
                }
                if (typeof err === 'object') {
                    const item = err[0]
                    if (item && item.error && item.error.message) {
                        req.onError(item.error.message)
                        return
                    }
                }
                const { error } = err
                if (error instanceof Error) {
                    req.onError(error.message)
                    return
                }
                if (typeof error === 'object') {
                    const { message } = error
                    if (message) {
                        if (typeof message === 'string') {
                            req.onError(message)
                        } else {
                            req.onError(JSON.stringify(message))
                        }
                        return
                    }
                }
                req.onError('Unknown error')
            },
        })

        if (!finished && !hasError) {
            req.onFinished('stop')
        }
    }
}
