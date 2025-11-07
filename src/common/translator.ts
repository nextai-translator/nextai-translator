/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Core Translator Implementation
 *
 * This module provides the core translation functionality for nextai-translator.
 * It implements a Translator class that supports:
 * - Basic translation between language pairs
 * - Multiple translation modes (translate, polish, summarize)
 * - Batch translation
 * - Language auto-detection
 * - Caching with TTL
 * - Error handling and retries
 */

import { LangCode, detectLang, getLangName, supportedLanguages, getLangConfig } from './lang'
import { getEngine } from './engines'
import { getSettings } from './utils'
import { TranslateMode } from './translate'
import { LRUCache } from 'lru-cache'

/**
 * Translation result interface
 */
export interface TranslationResult {
    originalText: string
    translatedText?: string
    polishedText?: string
    summary?: string
    sourceLang: string
    targetLang: string
    detectedLang?: string
    mode: string
    fromCache?: boolean
    confidence?: number
}

/**
 * Translator configuration options
 */
export interface TranslatorOptions {
    timeout?: number
    maxRetries?: number
    enableCache?: boolean
    cacheTTL?: number
    retryDelay?: number
}

/**
 * Batch translation item
 */
export interface BatchTranslationItem {
    text: string
    from: string
    to: string
}

/**
 * Cache key generator
 */
function getCacheKey(text: string, from: string, to: string, mode: string): string {
    return `${from}:${to}:${mode}:${text}`
}

/**
 * Translator class providing core translation functionality
 */
export class Translator {
    private options: Required<TranslatorOptions>
    private cache?: LRUCache<string, TranslationResult>

    constructor(options: TranslatorOptions = {}) {
        this.options = {
            timeout: options.timeout ?? 30000,
            maxRetries: options.maxRetries ?? 3,
            enableCache: options.enableCache ?? true,
            cacheTTL: options.cacheTTL ?? 3600000, // 1 hour default
            retryDelay: options.retryDelay ?? 1000,
        }

        if (this.options.enableCache) {
            this.cache = new LRUCache<string, TranslationResult>({
                max: 500,
                ttl: this.options.cacheTTL,
            })
        }
    }

    /**
     * Validate input text
     */
    private validateInput(text: string): void {
        if (!text || text.trim().length === 0) {
            throw new Error('Input text cannot be empty')
        }
    }

    /**
     * Normalize language code (handle common aliases)
     */
    private normalizeLangCode(langCode: string): string {
        const langCodeMap: Record<string, string> = {
            'zh-CN': 'zh-Hans',
            'zh-TW': 'zh-Hant',
            'zh': 'zh-Hans',
        }

        return langCodeMap[langCode] || langCode
    }

    /**
     * Validate language code
     */
    private validateLanguage(langCode: string): void {
        if (langCode === 'auto') {
            return // auto-detect is valid
        }

        const normalized = this.normalizeLangCode(langCode)
        const supportedLangCodes = supportedLanguages.map(([code]) => code)
        if (!supportedLangCodes.includes(normalized as LangCode)) {
            throw new Error(`Unsupported language: ${langCode}`)
        }
    }

    /**
     * Detect source language if set to 'auto'
     */
    private async detectSourceLanguage(text: string, sourceLang: string): Promise<string> {
        if (sourceLang === 'auto') {
            const detected = await detectLang(text)
            return detected
        }
        return sourceLang
    }

    /**
     * Call API with timeout and retry logic
     */
    async callAPI(
        text: string,
        sourceLang: string,
        targetLang: string,
        mode: TranslateMode = 'translate'
    ): Promise<TranslationResult> {
        const settings = await getSettings()
        const engine = getEngine(settings.provider)

        let lastError: any
        let attemptCount = 0

        while (attemptCount < this.options.maxRetries) {
            attemptCount++

            try {
                const result = await new Promise<TranslationResult>((resolve, reject) => {
                    const abortController = new AbortController()
                    let translatedContent = ''
                    let hasError = false

                    // Set timeout
                    const timeoutId = setTimeout(() => {
                        abortController.abort()
                        reject(new Error('Translation timeout'))
                    }, this.options.timeout)

                    const sourceLangConfig = getLangConfig(sourceLang as LangCode)
                    const targetLangConfig = getLangConfig(targetLang as LangCode)

                    let rolePrompt = targetLangConfig.rolePrompt
                    let commandPrompt = ''

                    // Build prompts based on mode
                    switch (mode) {
                        case 'translate':
                            commandPrompt = targetLangConfig.genCommandPrompt(sourceLangConfig)
                            break
                        case 'polishing':
                            rolePrompt = 'You are an expert translator, translate directly without explanation.'
                            commandPrompt = `Please edit the following sentences in ${getLangName(
                                sourceLang
                            )} to improve clarity, conciseness, and coherence, making them match the expression of native speakers.`
                            break
                        case 'summarize':
                            rolePrompt =
                                "You are a professional text summarizer, you can only summarize the text, don't interpret it."
                            commandPrompt = `Please summarize this text in the most concise language and must use ${getLangName(
                                targetLang
                            )} language!`
                            break
                    }

                    commandPrompt = `Only reply the result and nothing else. ${commandPrompt}:\n\n${text.trimEnd()}`

                    engine
                        .sendMessage({
                            signal: abortController.signal,
                            rolePrompt,
                            commandPrompt,
                            onMessage: async (message) => {
                                translatedContent += message.content
                            },
                            onFinished: () => {
                                clearTimeout(timeoutId)
                                if (!hasError) {
                                    resolve({
                                        originalText: text,
                                        translatedText: translatedContent.trim(),
                                        polishedText: mode === 'polishing' ? translatedContent.trim() : undefined,
                                        summary: mode === 'summarize' ? translatedContent.trim() : undefined,
                                        sourceLang,
                                        targetLang,
                                        mode,
                                    })
                                }
                            },
                            onError: (error) => {
                                clearTimeout(timeoutId)
                                hasError = true
                                reject(new Error(error))
                            },
                        })
                        .catch((error) => {
                            clearTimeout(timeoutId)
                            hasError = true
                            reject(error)
                        })
                })

                return result
            } catch (error: any) {
                lastError = error

                // Don't retry on validation errors
                if (error.message?.includes('empty') || error.message?.includes('Unsupported language')) {
                    throw error
                }

                // Wait before retry (except for last attempt)
                if (attemptCount < this.options.maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay * attemptCount))
                }
            }
        }

        throw lastError || new Error('Translation failed after retries')
    }

    /**
     * Translate text between languages
     */
    async translate(text: string, sourceLang: string, targetLang: string): Promise<TranslationResult> {
        // Validate input
        this.validateInput(text)

        // Normalize language codes
        const normalizedTargetLang = this.normalizeLangCode(targetLang)
        this.validateLanguage(normalizedTargetLang)

        // Detect source language if needed
        let detectedSourceLang = await this.detectSourceLanguage(text, sourceLang)
        detectedSourceLang = this.normalizeLangCode(detectedSourceLang)
        this.validateLanguage(detectedSourceLang)

        // Check cache
        const cacheKey = getCacheKey(text, detectedSourceLang, normalizedTargetLang, 'translate')
        if (this.cache) {
            const cached = this.cache.get(cacheKey)
            if (cached) {
                return { ...cached, fromCache: true }
            }
        }

        // Perform translation
        const result = await this.callAPI(text, detectedSourceLang, normalizedTargetLang, 'translate')

        // Add detected language info
        if (sourceLang === 'auto') {
            result.detectedLang = detectedSourceLang
        }

        // Cache result
        if (this.cache) {
            this.cache.set(cacheKey, result)
        }

        return result
    }

    /**
     * Process text with specified mode (translate, polish, summarize)
     */
    async process(
        text: string,
        mode: TranslateMode,
        sourceLang: string,
        targetLang: string
    ): Promise<TranslationResult> {
        // Validate input
        this.validateInput(text)

        // Normalize language codes
        const normalizedSourceLang = this.normalizeLangCode(sourceLang)
        const normalizedTargetLang = this.normalizeLangCode(targetLang)
        this.validateLanguage(normalizedSourceLang)
        this.validateLanguage(normalizedTargetLang)

        // Check cache
        const cacheKey = getCacheKey(text, normalizedSourceLang, normalizedTargetLang, mode)
        if (this.cache) {
            const cached = this.cache.get(cacheKey)
            if (cached) {
                return { ...cached, fromCache: true }
            }
        }

        // Perform processing
        const result = await this.callAPI(text, normalizedSourceLang, normalizedTargetLang, mode)

        // Cache result
        if (this.cache) {
            this.cache.set(cacheKey, result)
        }

        return result
    }

    /**
     * Translate multiple text segments in batch
     */
    async translateBatch(textSegments: string[], sourceLang: string, targetLang: string): Promise<TranslationResult[]> {
        const results: TranslationResult[] = []

        for (const text of textSegments) {
            const result = await this.translate(text, sourceLang, targetLang)
            results.push(result)
        }

        return results
    }

    /**
     * Translate multiple text segments with different language pairs
     */
    async translateBatchMixed(items: BatchTranslationItem[]): Promise<TranslationResult[]> {
        const results: TranslationResult[] = []

        for (const item of items) {
            const result = await this.translate(item.text, item.from, item.to)
            results.push(result)
        }

        return results
    }
}

/**
 * Factory function to create a Translator instance
 */
export function createTranslator(options?: TranslatorOptions): Translator {
    return new Translator(options)
}
