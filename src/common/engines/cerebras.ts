/* eslint-disable camelcase */
import { getUniversalFetch } from '../universal-fetch'
import { fetchSSE, getSettings } from '../utils'
import { AbstractEngine } from './abstract-engine'
import { IMessageRequest, IModel } from './interfaces'

export class Cerebras extends AbstractEngine {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listModels(apiKey: string | undefined): Promise<IModel[]> {
        if (!apiKey) {
            return []
        }
        const url = 'https://api.cerebras.ai/v1/models'
        const fetcher = getUniversalFetch()
        const resp = await fetcher(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
        })
        if (!resp.ok) {
            throw new Error(`Failed to fetch models: ${resp.statusText}`)
        }
        const data = await resp.json()
        return (
            data.data
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((item: any) => {
                    return {
                        id: item.id,
                        name: item.id,
                    }
                })
        )
    }

    async getModel(): Promise<string> {
        const settings = await getSettings()
        return settings.cerebrasAPIModel
    }

    async sendMessage(req: IMessageRequest): Promise<void> {
        const settings = await getSettings()
        const apiKey = settings.cerebrasAPIKey
        const model = await this.getModel()
        const url = 'https://api.cerebras.ai/v1/chat/completions'
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        }
        const messages = [
            {
                role: 'user',
                content: req.rolePrompt ? req.rolePrompt + '\n\n' + req.commandPrompt : req.commandPrompt,
            },
        ]
        const body = {
            model,
            messages,
            temperature: 0,
            top_p: 1,
            stream: true,
        }
        let finished = false // finished can be called twice because event.data is 1. "finish_reason":"stop"; 2. [DONE]
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
                    // eslint-disable-next-line no-empty, @typescript-eslint/no-explicit-any
                } catch (e: any) {
                    // avoid `Unexpected token 'D', "[DONE]" is not valid JSON`
                    if (msg.trim() !== '[DONE]') {
                        req.onError?.(e?.message ?? 'Cannot parse response JSON')
                    }

                    req.onFinished('stop')
                    finished = true
                    return
                }

                const { x_groq } = resp

                if (x_groq && x_groq.error) {
                    req.onError?.(x_groq.error)
                }

                const { choices } = resp
                if (!choices || choices.length === 0) {
                    return
                }
                const { finish_reason: finishReason } = choices[0]
                if (finishReason) {
                    req.onFinished(finishReason)
                    finished = true
                    return
                }

                let targetTxt = ''

                const { content = '', role } = choices[0].delta

                targetTxt = content

                await req.onMessage({ content: targetTxt, role })
            },
            onError: (err) => {
                if (err instanceof Error) {
                    req.onError(err.message)
                    return
                }
                if (typeof err === 'string') {
                    req.onError(err)
                    return
                }
                if (typeof err === 'object') {
                    const { detail } = err
                    if (detail) {
                        req.onError(detail)
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
    }
}
