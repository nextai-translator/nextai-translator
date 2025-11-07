import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../translator'

/**
 * TDD Red Phase: Core Translation Features
 *
 * These tests validate the core translation functionality for the nextai-translator project.
 * Since implementation is pending, these tests are expected to fail initially.
 *
 * Test Scenarios:
 * 1. Basic text translation between languages
 * 2. Batch translation of multiple text segments
 * 3. Translation mode switching (translate, polish, summarize)
 * 4. Error handling for invalid inputs
 * 5. Translation caching and performance
 */

describe('Core Translation Features - TDD Red Phase', () => {
    describe('Basic Translation', () => {
        it('should translate English text to Chinese', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = 'Hello, World!'
            const sourceLang = 'en'
            const targetLang = 'zh-CN'

            // Act
            const result = await translator.translate(inputText, sourceLang, targetLang)

            // Assert
            expect(result).toBeDefined()
            expect(result.translatedText).toBeTruthy()
            expect(result.sourceLang).toBe(sourceLang)
            expect(result.targetLang).toBe(targetLang)
            expect(result.originalText).toBe(inputText)
        })

        it('should translate Chinese text to English', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = '你好，世界！'
            const sourceLang = 'zh-CN'
            const targetLang = 'en'

            // Act
            const result = await translator.translate(inputText, sourceLang, targetLang)

            // Assert
            expect(result).toBeDefined()
            expect(result.translatedText).toBeTruthy()
            expect(result.translatedText).not.toBe(inputText)
        })

        it('should auto-detect source language when not specified', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = 'Bonjour le monde'
            const targetLang = 'en'

            // Act
            const result = await translator.translate(inputText, 'auto', targetLang)

            // Assert
            expect(result).toBeDefined()
            expect(result.detectedLang).toBe('fr')
            expect(result.translatedText).toBeTruthy()
        })

        it('should preserve formatting in translated text', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = 'Hello **bold** and *italic* text.'
            const sourceLang = 'en'
            const targetLang = 'es'

            // Act
            const result = await translator.translate(inputText, sourceLang, targetLang)

            // Assert
            expect(result.translatedText).toContain('**')
            expect(result.translatedText).toContain('*')
        })
    })

    describe('Translation Modes', () => {
        it('should translate text in "translate" mode', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = 'This is a test.'
            const mode = 'translate'

            // Act
            const result = await translator.process(inputText, mode, 'en', 'zh-CN')

            // Assert
            expect(result.mode).toBe('translate')
            expect(result.translatedText).toBeTruthy()
        })

        it('should polish text in "polish" mode', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = 'This sentence has bad grammer and typos.'
            const mode = 'polish'

            // Act
            const result = await translator.process(inputText, mode, 'en', 'en')

            // Assert
            expect(result.mode).toBe('polish')
            expect(result.polishedText).toBeTruthy()
            expect(result.polishedText).not.toBe(inputText)
        })

        it('should summarize text in "summarize" mode', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = 'This is a very long text that needs to be summarized. '.repeat(20)
            const mode = 'summarize'

            // Act
            const result = await translator.process(inputText, mode, 'en', 'en')

            // Assert
            expect(result.mode).toBe('summarize')
            expect(result.summary).toBeTruthy()
            expect(result.summary.length).toBeLessThan(inputText.length)
        })
    })

    describe('Batch Translation', () => {
        it('should translate multiple text segments in batch', async () => {
            // Arrange
            const translator = createTranslator()
            const textSegments = ['Hello', 'How are you?', 'Goodbye']
            const sourceLang = 'en'
            const targetLang = 'zh-CN'

            // Act
            const results = await translator.translateBatch(textSegments, sourceLang, targetLang)

            // Assert
            expect(results).toHaveLength(3)
            results.forEach((result, index) => {
                expect(result.originalText).toBe(textSegments[index])
                expect(result.translatedText).toBeTruthy()
            })
        })

        it('should handle mixed languages in batch translation', async () => {
            // Arrange
            const translator = createTranslator()
            const textSegments = [
                { text: 'Hello', from: 'en', to: 'zh-CN' },
                { text: '你好', from: 'zh-CN', to: 'en' },
                { text: 'Bonjour', from: 'fr', to: 'en' },
            ]

            // Act
            const results = await translator.translateBatchMixed(textSegments)

            // Assert
            expect(results).toHaveLength(3)
            results.forEach((result) => {
                expect(result.translatedText).toBeTruthy()
            })
        })
    })

    describe('Error Handling', () => {
        it('should throw error for empty text input', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = ''

            // Act & Assert
            await expect(translator.translate(inputText, 'en', 'zh-CN')).rejects.toThrow('Input text cannot be empty')
        })

        it('should throw error for unsupported language code', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = 'Hello'
            const invalidLang = 'invalid-lang'

            // Act & Assert
            await expect(translator.translate(inputText, 'en', invalidLang)).rejects.toThrow('Unsupported language')
        })

        it('should handle API timeout gracefully', async () => {
            // Arrange
            const translator = createTranslator({ timeout: 100 })
            const inputText = 'Hello'

            // Mock slow API response
            vi.spyOn(translator, 'callAPI').mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)))

            // Act & Assert
            await expect(translator.translate(inputText, 'en', 'zh-CN')).rejects.toThrow('Translation timeout')
        })

        it('should retry on transient API failures', async () => {
            // Arrange
            const translator = createTranslator({ maxRetries: 3 })
            const inputText = 'Hello'
            let attemptCount = 0

            // Mock API that fails twice then succeeds
            vi.spyOn(translator, 'callAPI').mockImplementation(() => {
                attemptCount++
                if (attemptCount < 3) {
                    return Promise.reject(new Error('Temporary failure'))
                }
                return Promise.resolve({ translatedText: 'Success' })
            })

            // Act
            const result = await translator.translate(inputText, 'en', 'zh-CN')

            // Assert
            expect(result.translatedText).toBe('Success')
            expect(attemptCount).toBe(3)
        })
    })

    describe('Translation Caching', () => {
        it('should cache translation results', async () => {
            // Arrange
            const translator = createTranslator({ enableCache: true })
            const inputText = 'Hello, World!'
            const sourceLang = 'en'
            const targetLang = 'zh-CN'

            // Act
            const result1 = await translator.translate(inputText, sourceLang, targetLang)
            const result2 = await translator.translate(inputText, sourceLang, targetLang)

            // Assert
            expect(result1.translatedText).toBe(result2.translatedText)
            expect(result2.fromCache).toBe(true)
        })

        it('should invalidate cache when language pair changes', async () => {
            // Arrange
            const translator = createTranslator({ enableCache: true })
            const inputText = 'Hello'

            // Act
            const result1 = await translator.translate(inputText, 'en', 'zh-CN')
            const result2 = await translator.translate(inputText, 'en', 'es')

            // Assert
            expect(result1.translatedText).not.toBe(result2.translatedText)
            expect(result2.fromCache).toBe(false)
        })

        it('should respect cache TTL settings', async () => {
            // Arrange
            const translator = createTranslator({ enableCache: true, cacheTTL: 100 })
            const inputText = 'Hello'

            // Act
            await translator.translate(inputText, 'en', 'zh-CN')
            await new Promise((resolve) => setTimeout(resolve, 150))
            const result = await translator.translate(inputText, 'en', 'zh-CN')

            // Assert
            expect(result.fromCache).toBe(false)
        })
    })

    describe('Performance', () => {
        it('should translate short text within acceptable time', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = 'Hello, World!'
            const startTime = Date.now()

            // Act
            await translator.translate(inputText, 'en', 'zh-CN')
            const duration = Date.now() - startTime

            // Assert
            expect(duration).toBeLessThan(5000) // 5 seconds max
        })

        it('should handle long text without memory issues', async () => {
            // Arrange
            const translator = createTranslator()
            const inputText = 'This is a long sentence. '.repeat(1000)

            // Act
            const result = await translator.translate(inputText, 'en', 'zh-CN')

            // Assert
            expect(result.translatedText).toBeTruthy()
        })
    })
})
