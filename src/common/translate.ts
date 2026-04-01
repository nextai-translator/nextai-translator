/* eslint-disable camelcase */
import { v4 as uuidv4 } from 'uuid'
import { getLangConfig, getLangName, LangCode } from '../common/lang'
import { Action } from './internal-services/db'
import { codeBlock, oneLine, oneLineTrim } from 'common-tags'
import { getEngine } from './engines'
import { getSettings } from './utils'

export type TranslateMode = 'translate' | 'polishing' | 'summarize' | 'analyze' | 'explain-code' | 'big-bang'
export type APIModel =
    | 'gpt-3.5-turbo-1106'
    | 'gpt-3.5-turbo'
    | 'gpt-3.5-turbo-0301'
    | 'gpt-3.5-turbo-0613'
    | 'gpt-3.5-turbo-16k'
    | 'gpt-3.5-turbo-16k-0613'
    | 'gpt-4'
    | 'gpt-4-0314'
    | 'gpt-4-0613'
    | 'gpt-4-32k'
    | 'gpt-4-32k-0314'
    | 'gpt-4-32k-0613'
    | string

interface BaseTranslateQuery {
    text: string
    writing?: boolean
    selectedWord?: string
    detectFrom: LangCode
    detectTo: LangCode
    mode?: Exclude<TranslateMode, 'big-bang'>
    action: Action
    onMessage: (message: { content: string; role: string; isWordMode: boolean; isFullText?: boolean }) => Promise<void>
    onError: (error: string) => void
    onFinish: (reason: string) => void
    onStatusCode?: (statusCode: number) => void
    signal: AbortSignal
}

type TranslateQueryBigBang = Omit<
    BaseTranslateQuery,
    'mode' | 'action' | 'selectedWord' | 'detectFrom' | 'detectTo'
> & {
    mode: 'big-bang'
    articlePrompt: string
}

export type TranslateQuery = BaseTranslateQuery | TranslateQueryBigBang

export interface TranslateResult {
    text?: string
    from?: string
    to?: string
    error?: string
}

export const isAWord = (langCode: string, text: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Segmenter } = Intl as any
    if (!Segmenter) {
        return false
    }
    const segmenter = new Segmenter(langCode, { granularity: 'word' })
    const iterator = segmenter.segment(text)[Symbol.iterator]()
    return iterator.next().value?.segment === text
}

export class QuoteProcessor {
    private quote: string
    public quoteStart: string
    public quoteEnd: string
    private prevQuoteStartBuffer: string
    private prevQuoteEndBuffer: string

    constructor() {
        this.quote = uuidv4().replace(/-/g, '').slice(0, 4)
        this.quoteStart = `<${this.quote}>`
        this.quoteEnd = `</${this.quote}>`
        this.prevQuoteStartBuffer = ''
        this.prevQuoteEndBuffer = ''
    }

    public processText(text: string): string {
        const deltas = text.split('')
        const targetPieces = deltas.map((delta) => this.processTextDelta(delta))
        return targetPieces.join('')
    }

    private processTextDelta(textDelta: string): string {
        if (textDelta === '') {
            return ''
        }
        if (textDelta.trim() === this.quoteEnd) {
            return ''
        }
        let result = textDelta
        // process quote start
        let quoteStartBuffer = this.prevQuoteStartBuffer
        // console.debug('\n\n')
        // console.debug('---- process quote start -----')
        // console.debug('textDelta', textDelta)
        // console.debug('this.quoteStartbuffer', this.quoteStartBuffer)
        // console.debug('start loop:')
        let startIdx = 0
        for (let i = 0; i < textDelta.length; i++) {
            const char = textDelta[i]
            // console.debug(`---- i: ${i} startIdx: ${startIdx} ----`)
            // console.debug('char', char)
            // console.debug('quoteStartBuffer', quoteStartBuffer)
            // console.debug('result', result)
            if (char === this.quoteStart[quoteStartBuffer.length]) {
                if (this.prevQuoteStartBuffer.length > 0) {
                    if (i === startIdx) {
                        quoteStartBuffer += char
                        result = textDelta.slice(i + 1)
                        startIdx += 1
                    } else {
                        result = this.prevQuoteStartBuffer + textDelta
                        quoteStartBuffer = ''
                        break
                    }
                } else {
                    quoteStartBuffer += char
                    result = textDelta.slice(i + 1)
                }
            } else {
                if (quoteStartBuffer.length === this.quoteStart.length) {
                    quoteStartBuffer = ''
                    break
                }
                if (quoteStartBuffer.length > 0) {
                    result = this.prevQuoteStartBuffer + textDelta
                    quoteStartBuffer = ''
                    break
                }
            }
        }
        // console.debug('end loop!')
        this.prevQuoteStartBuffer = quoteStartBuffer
        // console.debug('result', result)
        // console.debug('this.quoteStartBuffer', this.quoteStartBuffer)
        // console.debug('---- end of process quote start -----')
        textDelta = result
        // process quote end
        let quoteEndBuffer = this.prevQuoteEndBuffer
        // console.debug('\n\n')
        // console.debug('---- start process quote end -----')
        // console.debug('textDelta', textDelta)
        // console.debug('this.quoteEndBuffer', this.quoteEndBuffer)
        // console.debug('start loop:')
        let endIdx = 0
        for (let i = 0; i < textDelta.length; i++) {
            const char = textDelta[i]
            // console.debug(`---- i: ${i}, endIdx: ${endIdx} ----`)
            // console.debug('char', char)
            // console.debug('quoteEndBuffer', quoteEndBuffer)
            // console.debug('result', result)
            if (char === this.quoteEnd[quoteEndBuffer.length]) {
                if (this.prevQuoteEndBuffer.length > 0) {
                    if (i === endIdx) {
                        quoteEndBuffer += char
                        result = textDelta.slice(i + 1)
                        endIdx += 1
                    } else {
                        result = this.prevQuoteEndBuffer + textDelta
                        quoteEndBuffer = ''
                        break
                    }
                } else {
                    quoteEndBuffer += char
                    result = textDelta.slice(0, textDelta.length - quoteEndBuffer.length)
                }
            } else {
                if (quoteEndBuffer.length === this.quoteEnd.length) {
                    quoteEndBuffer = ''
                    break
                }
                if (quoteEndBuffer.length > 0) {
                    result = this.prevQuoteEndBuffer + textDelta
                    quoteEndBuffer = ''
                    break
                }
            }
        }
        // console.debug('end loop!')
        this.prevQuoteEndBuffer = quoteEndBuffer
        // console.debug('totally result', result)
        // console.debug('this.quoteEndBuffer', this.quoteEndBuffer)
        // console.debug('---- end of process quote end -----')
        return result
    }
}

export async function translate(query: TranslateQuery) {
    let rolePrompt = ''
    let commandPrompt = ''
    let contentPrompt = query.text
    const isWordMode = false

    if (query.mode === 'big-bang') {
        rolePrompt = oneLine`
        You are a professional writer
        and you will write ${query.articlePrompt}
        based on the given words`
        commandPrompt = oneLine`
        Write ${query.articlePrompt} of no more than 160 words.
        The article must contain the words in the following text.
        The more words you use, the better`
    } else {
        const sourceLangCode = query.detectFrom
        const targetLangCode = query.detectTo
        const sourceLangName = getLangName(sourceLangCode)
        const targetLangName = getLangName(targetLangCode)
        console.debug('sourceLang', sourceLangName)
        console.debug('targetLang', targetLangName)
        const targetLangConfig = getLangConfig(targetLangCode)
        const sourceLangConfig = getLangConfig(sourceLangCode)
        console.debug('Source language is', sourceLangConfig)
        rolePrompt = targetLangConfig.rolePrompt

        switch (query.action.mode) {
            case null:
            case undefined:
                if (
                    (query.action.rolePrompt ?? '').includes('${text}') ||
                    (query.action.commandPrompt ?? '').includes('${text}')
                ) {
                    contentPrompt = ''
                } else {
                    contentPrompt = query.text
                }
                rolePrompt = (query.action.rolePrompt ?? '')
                    .replace('${sourceLang}', sourceLangName)
                    .replace('${targetLang}', targetLangName)
                    .replace('${text}', query.text)
                commandPrompt = (query.action.commandPrompt ?? '')
                    .replace('${sourceLang}', sourceLangName)
                    .replace('${targetLang}', targetLangName)
                    .replace('${text}', query.text)
                if (query.action.outputRenderingFormat) {
                    commandPrompt =
                        `(Requirements: The output format must be ${query.action.outputRenderingFormat}) ` +
                        commandPrompt
                }
                break
            case 'translate':
                // Minimal desktop build: always output pure translation only.
                // No dictionary-mode, examples, etymology, or extra explanation.
                rolePrompt = oneLineTrim`
                You are a professional translation engine.
                Translate the given text from ${sourceLangName} to ${targetLangName}.
                Output ONLY the translated text, no explanation, no extra formatting.`
                commandPrompt = ''
                contentPrompt = query.text
                if (!query.writing && query.selectedWord) {
                    rolePrompt = codeBlock`
${oneLine`
You are an expert in the semantic syntax of the ${sourceLangName} language,
and you are teaching me the ${sourceLangName} language.
I will give you a sentence in ${sourceLangName} and a word from that sentence.
${
    sourceLangConfig.phoneticNotation &&
    'Firstly, provide the corresponding phonetic notation or transcription of the word in ' + sourceLangName + '.'
}
Then, help me explain in ${targetLangName} what the word means in the sentence, what the sentence itself means,
and whether the word is part of an idiom in the sentence. If it is, explain the idiom in the sentence.
Provide 3 to 5 examples in ${sourceLangName} with the same meaning, and explain these examples in ${targetLangName}.
The answer should follow the format below:
`}

${oneLine`<word> · /${sourceLangConfig.phoneticNotation && `<${sourceLangConfig.phoneticNotation}>`}/ `}
${oneLine`<the remaining part>`}

If you understand, say "yes", and then we will begin.`
                    commandPrompt = 'Yes, I understand. Please give me the sentence and the word.'
                    contentPrompt = `the sentence is: ${query.text}\n\nthe word is: ${query.selectedWord}`
                }
                break
            case 'polishing':
                rolePrompt = 'You are an expert translator, translate directly without explanation.'
                commandPrompt = `Please edit the following sentences in ${sourceLangName} to improve clarity, conciseness, and coherence, making them match the expression of native speakers.`
                contentPrompt = query.text
                break
            case 'summarize':
                rolePrompt =
                    "You are a professional text summarizer, you can only summarize the text, don't interpret it."
                commandPrompt = oneLine`
                Please summarize this text in the most concise language
                and must use ${targetLangName} language!`
                contentPrompt = query.text
                break
            case 'analyze':
                rolePrompt = 'You are a professional translation engine and grammar analyzer.'
                commandPrompt = oneLine`
                Please translate this text to ${targetLangName}
                and explain the grammar in the original text using ${targetLangName}.`
                contentPrompt = query.text
                break
            case 'explain-code':
                rolePrompt =
                    'You are a code explanation engine that can only explain code but not interpret or translate it. Also, please report bugs and errors (if any).'
                commandPrompt = oneLine`
                explain the provided code,
                regex or script in the most concise language
                and must use ${targetLangName} language!
                You may use Markdown.
                If the content is not code,
                return an error message.
                If the code has obvious errors, point them out.`
                contentPrompt = '```\n' + query.text + '\n```'
                break
        }
    }

    if (contentPrompt) {
        commandPrompt = `Only reply the result and nothing else. ${commandPrompt}:\n\n${contentPrompt.trimEnd()}`
    }

    const settings = await getSettings()

    // Use per-action provider/model if configured, otherwise fall back to global settings
    const effectiveProvider = (query.mode !== 'big-bang' && query.action?.provider) || settings.provider
    const effectiveModel = query.mode !== 'big-bang' ? query.action?.apiModel : undefined
    console.debug('[translate] dispatch', {
        mode: query.mode,
        provider: effectiveProvider,
        modelOverride: effectiveModel,
    })

    const engine = getEngine(effectiveProvider)
    await engine.sendMessage({
        signal: query.signal,
        rolePrompt,
        commandPrompt,
        modelOverride: effectiveModel,
        onMessage: async (message) => {
            await query.onMessage({ ...message, isWordMode })
        },
        onFinished: (reason) => {
            query.onFinish(reason)
        },
        onError: (error) => {
            query.onError(error)
        },
        onStatusCode: (statusCode) => {
            query.onStatusCode?.(statusCode)
        },
    })
}
