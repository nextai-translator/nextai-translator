/* eslint-disable camelcase */
import { urlJoin } from 'url-join-ts'
import { getRecommendedOpenAIAPIPath, OPENAI_RESPONSES_API_PATH } from '../openai-api-path'
import { getUniversalFetch } from '../universal-fetch'
import { defaultAPIURL, defaultAPIURLPath, fetchSSE, getSettings } from '../utils'
import { AbstractEngine } from './abstract-engine'
import { IMessageRequest, IModel } from './interfaces'

export abstract class AbstractOpenAI extends AbstractEngine {
    private isResponsesAPIPath(apiURLPath: string): boolean {
        return /\/responses\b/.test(apiURLPath)
    }

    private shouldUseResponsesAPI(apiURL: string, apiURLPath: string, model: string): boolean {
        if (this.isResponsesAPIPath(apiURLPath)) {
            return true
        }

        const normalizedAPIURL = apiURL.replace(/\/+$/, '')
        const isOpenAIOfficialEndpoint = normalizedAPIURL === defaultAPIURL
        const usesDefaultChatCompletionsPath = apiURLPath === defaultAPIURLPath
        if (!isOpenAIOfficialEndpoint || !usesDefaultChatCompletionsPath) {
            return false
        }
        return getRecommendedOpenAIAPIPath(model) === OPENAI_RESPONSES_API_PATH
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private extractResponseOutputText(resp: any): string {
        if (typeof resp?.response?.output_text === 'string') {
            return resp.response.output_text
        }
        if (!Array.isArray(resp?.response?.output)) {
            return ''
        }

        const texts: string[] = []
        for (const item of resp.response.output) {
            if (!Array.isArray(item?.content)) {
                continue
            }
            for (const part of item.content) {
                if (part?.type === 'output_text' && typeof part?.text === 'string') {
                    texts.push(part.text)
                }
            }
        }
        return texts.join('')
    }

    async listModels(apiKey: string | undefined): Promise<IModel[]> {
        if (!apiKey) {
            return []
        }
        const settings = await getSettings()
        if (settings.noModelsAPISupport) {
            return [
                { name: 'gpt-3.5-turbo-1106', id: 'gpt-3.5-turbo-1106' },
                { name: 'gpt-3.5-turbo', id: 'gpt-3.5-turbo' },
                { name: 'gpt-3.5-turbo-0613', id: 'gpt-3.5-turbo-0613' },
                { name: 'gpt-3.5-turbo-0301', id: 'gpt-3.5-turbo-0301' },
                { name: 'gpt-3.5-turbo-16k', id: 'gpt-3.5-turbo-16k' },
                { name: 'gpt-3.5-turbo-16k-0613', id: 'gpt-3.5-turbo-16k-0613' },
                { name: 'gpt-4', id: 'gpt-4' },
                { name: 'gpt-4o (recommended)', id: 'gpt-4o' },
                { name: 'gpt-4-turbo', id: 'gpt-4-turbo' },
                { name: 'gpt-4-turbo-2024-04-09', id: 'gpt-4-turbo-2024-04-09' },
                { name: 'gpt-4-turbo-preview', id: 'gpt-4-turbo-preview' },
                { name: 'gpt-4-0125-preview ', id: 'gpt-4-0125-preview' },
                { name: 'gpt-4-1106-preview', id: 'gpt-4-1106-preview' },
                { name: 'gpt-4-0314', id: 'gpt-4-0314' },
                { name: 'gpt-4-0613', id: 'gpt-4-0613' },
                { name: 'gpt-4-32k', id: 'gpt-4-32k' },
                { name: 'gpt-4-32k-0314', id: 'gpt-4-32k-0314' },
                { name: 'gpt-4-32k-0613', id: 'gpt-4-32k-0613' },
            ]
        }
        const apiKey_ = apiKey.split(',')[0]
        const apiUrl = await this.getAPIURL()
        const url = urlJoin(apiUrl, '/v1/models')
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey_}`,
        }
        const fetcher = getUniversalFetch()
        const resp = await fetcher(url, {
            method: 'GET',
            headers,
        })
        const data = await resp.json()
        return (
            data.data
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((model: any) => {
                    if (apiUrl === 'https://api.openai.com') {
                        return model.id.includes('gpt')
                    }
                    return ['text-', 'dall-', 'tts-', 'winsper-', 'davinci', 'babbage'].every(
                        (it) => !(model.id as string).startsWith(it)
                    )
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((model: any) => {
                    return {
                        id: model.id,
                        name: model.id,
                    }
                })
        )
    }

    async getModel() {
        return await this.getAPIModel()
    }

    abstract getAPIModel(): Promise<string>
    abstract getAPIKey(): Promise<string>
    abstract getAPIURL(): Promise<string>
    abstract getAPIURLPath(): Promise<string>

    async getHeaders(): Promise<Record<string, string>> {
        const apiKey = await this.getAPIKey()
        return {
            'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) chatall/1.29.40 Chrome/114.0.5735.134 Safari/537.36',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        }
    }

    async isChatAPI(): Promise<boolean> {
        return true
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getBaseRequestBody(): Promise<Record<string, any>> {
        const model = await this.getAPIModel()
        const modelLower = model.toLowerCase()

        // Use standard parameters for traditional models
        if (/^gpt-[34]/.test(modelLower)) {
            return {
                model,
                temperature: 0,
                top_p: 1,
                frequency_penalty: 1,
                presence_penalty: 1,
                stream: true,
            }
        }

        // o-series Early reasoning models only support low / medium / high
        if (/^o[134]/.test(modelLower)) {
            return { model, stream: true, reasoning_effort: 'low' }
        }

        // Use `minimal` for gpt-5 series
        if (/^gpt-5(\.0)?(-mini|-nano)?(\b|-)/.test(modelLower) && !/-pro|-chat|instant/.test(modelLower)) {
            return { model, stream: true, reasoning_effort: 'minimal' }
        }

        // Use minimal parameters for GPT-5.1 and future models to avoid errors caused by deprecated parameters
        return { model, stream: true }
    }

    async sendMessage(req: IMessageRequest): Promise<void> {
        const apiURL = await this.getAPIURL()
        const apiURLPath = await this.getAPIURLPath()
        const model = await this.getAPIModel()
        const useResponsesAPI = this.shouldUseResponsesAPI(apiURL, apiURLPath, model)
        const targetAPIURLPath = useResponsesAPI ? OPENAI_RESPONSES_API_PATH : apiURLPath
        const url = urlJoin(apiURL, targetAPIURLPath)
        const headers = await this.getHeaders()
        const isChatAPI = await this.isChatAPI()
        const body = await this.getBaseRequestBody()
        if (useResponsesAPI) {
            if (body.reasoning_effort !== undefined) {
                body['reasoning'] = {
                    ...(typeof body.reasoning === 'object' ? body.reasoning : {}),
                    effort: body.reasoning_effort,
                }
                delete body.reasoning_effort
            }
            if (body.max_tokens !== undefined && body.max_output_tokens === undefined) {
                body.max_output_tokens = body.max_tokens
                delete body.max_tokens
            }
            delete body.temperature
            delete body.top_p
            delete body.frequency_penalty
            delete body.presence_penalty
            body['input'] = req.commandPrompt
            if (req.rolePrompt) {
                body['instructions'] = req.rolePrompt
            }
            delete body['messages']
            delete body['prompt']
            delete body['stop']
        } else if (!isChatAPI) {
            // Azure OpenAI Service supports multiple API.
            // We should check if the settings.apiURLPath is match `/deployments/{deployment-id}/chat/completions`.
            // If not, we should use the legacy parameters.
            if (req.rolePrompt) {
                body[
                    'prompt'
                ] = `<|im_start|>user\n${req.rolePrompt}\n\n${req.commandPrompt}\n<|im_end|>\n<|im_start|>assistant\n`
            } else {
                body['prompt'] = `<|im_start|>user\n${req.commandPrompt}\n<|im_end|>\n<|im_start|>assistant\n`
            }
            body['stop'] = ['<|im_end|>']
        } else {
            const messages = [
                {
                    role: 'user',
                    content: req.rolePrompt ? req.rolePrompt + '\n\n' + req.commandPrompt : req.commandPrompt,
                },
            ]
            body['messages'] = messages
            // add custom model parameters for custom actions
            if (req.temperature !== '') {
                const temperature = parseFloat(req.temperature ?? '0')
                body['temperature'] = temperature
            }
            if (req.frequencyPenalty !== '') {
                const frequencyPenalty = parseFloat(req.frequencyPenalty ?? '1')
                body['frequency_penalty'] = frequencyPenalty
            }
            if (req.presencePenalty !== '') {
                const presencePenalty = parseFloat(req.presencePenalty ?? '1')
                body['presence_penalty'] = presencePenalty
            }
        }
        let finished = false // finished can be called twice because event.data is 1. "finish_reason":"stop"; 2. [DONE]
        let responsesHasStreamedText = false
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

                if (useResponsesAPI) {
                    const { type } = resp
                    if (type === 'response.output_text.delta') {
                        const { delta = '' } = resp
                        responsesHasStreamedText = true
                        if (delta) {
                            await req.onMessage({ content: delta, role: 'assistant' })
                        }
                        return
                    }
                    if (type === 'response.output_text.done') {
                        const { text = '' } = resp
                        if (!responsesHasStreamedText && text) {
                            await req.onMessage({ content: text, role: 'assistant' })
                        }
                        return
                    }
                    if (type === 'response.completed') {
                        if (!responsesHasStreamedText) {
                            const outputText = this.extractResponseOutputText(resp)
                            if (outputText) {
                                await req.onMessage({ content: outputText, role: 'assistant' })
                            }
                        }
                        req.onFinished('stop')
                        finished = true
                        return
                    }
                    if (type === 'response.incomplete') {
                        const reason = resp?.response?.incomplete_details?.reason ?? 'incomplete'
                        req.onFinished(reason)
                        finished = true
                        return
                    }
                    if (type === 'response.failed' || type === 'error') {
                        const errorMessage =
                            resp?.response?.error?.message ?? resp?.error?.message ?? resp?.message ?? 'Unknown error'
                        req.onError?.(errorMessage)
                        req.onFinished('error')
                        finished = true
                        return
                    }
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
                if (!isChatAPI) {
                    // It's used for Azure OpenAI Service's legacy parameters.
                    targetTxt = choices[0].text

                    await req.onMessage({ content: targetTxt, role: '' })
                } else {
                    const { content = '', role } = choices[0].delta

                    targetTxt = content

                    await req.onMessage({ content: targetTxt, role })
                }
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
