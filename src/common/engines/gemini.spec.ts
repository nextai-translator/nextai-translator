import { describe, expect, it } from 'vitest'
import { resolveGeminiThinkingConfig } from './gemini'

// Thinking support matrix per
// https://ai.google.dev/gemini-api/docs/generate-content/thinking
describe('resolveGeminiThinkingConfig', () => {
    describe('thinking disabled', () => {
        it('disables 2.5 Flash and Flash-Lite via thinkingBudget 0', () => {
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash', false, true)).toEqual({ thinkingBudget: 0 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash-lite', false, true)).toEqual({ thinkingBudget: 0 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash-lite-preview-04-2025', false, true)).toEqual({
                thinkingBudget: 0,
            })
        })

        it('uses the minimum budget 128 for 2.5 Pro since thinking cannot be disabled', () => {
            expect(resolveGeminiThinkingConfig('gemini-2.5-pro', false, true)).toEqual({ thinkingBudget: 128 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-pro-preview-06-05', false, true)).toEqual({
                thinkingBudget: 128,
            })
        })

        it('uses minimal thinkingLevel for 3.x models that accept it', () => {
            expect(resolveGeminiThinkingConfig('gemini-3-flash-preview', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.6-flash', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.1-flash-lite', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.5-flash-lite', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.1-flash-lite-image', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
        })

        it('uses low thinkingLevel where minimal is rejected (Pro, 3.8, Gemini 4)', () => {
            expect(resolveGeminiThinkingConfig('gemini-3-pro-preview', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.1-pro-preview', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.8-flash', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-3.7-flash', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-4-argon', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-robotics-er-2-preview', false, true)).toEqual({
                thinkingLevel: 'low',
            })
        })

        it('uses minimal thinkingLevel for Gemma 4 (its documented "off" value)', () => {
            expect(resolveGeminiThinkingConfig('gemma-4-26b-a4b-it', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemma-4-31b-it', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
        })

        it('uses thinkingLevel for *-latest aliases which track the newest generation', () => {
            expect(resolveGeminiThinkingConfig('gemini-flash-latest', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-pro-latest', false, true)).toEqual({
                thinkingLevel: 'low',
            })
            expect(resolveGeminiThinkingConfig('gemini-flash-lite-latest', false, true)).toEqual({
                thinkingLevel: 'minimal',
            })
        })

        it('omits thinkingConfig for unclassified families instead of guessing', () => {
            expect(resolveGeminiThinkingConfig('gemini-omni-flash-preview', false, true)).toBeUndefined()
            expect(resolveGeminiThinkingConfig('deep-research-preview-04-2026', false, true)).toBeUndefined()
            expect(resolveGeminiThinkingConfig('nano-banana-pro-preview', false, true)).toBeUndefined()
        })
    })

    describe('thinking enabled', () => {
        it('lets 3.x+ models use their default thinking level', () => {
            expect(resolveGeminiThinkingConfig('gemini-3-flash-preview', true, true)).toEqual({})
            expect(resolveGeminiThinkingConfig('gemini-4-argon', true, true)).toEqual({})
        })

        it('enables dynamic thinking for 2.x models', () => {
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash', true, true)).toEqual({ thinkingBudget: -1 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-pro', true, true)).toEqual({ thinkingBudget: -1 })
        })

        it('enables thinking on Gemma 4 via thinkingLevel high (its default is off)', () => {
            expect(resolveGeminiThinkingConfig('gemma-4-26b-a4b-it', true, true)).toEqual({
                thinkingLevel: 'high',
            })
        })

        it('omits thinkingConfig for unclassified families', () => {
            expect(resolveGeminiThinkingConfig('gemini-omni-flash-preview', true, true)).toBeUndefined()
        })
    })

    describe('models that reject thinkingConfig', () => {
        it('returns undefined when the models API reports thinking is unsupported', () => {
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash-preview-tts', false, false)).toBeUndefined()
            expect(resolveGeminiThinkingConfig('gemini-3.8-flash-tts', true, false)).toBeUndefined()
            expect(resolveGeminiThinkingConfig('aqa', false, false)).toBeUndefined()
        })
    })

    describe('unknown capability (manually typed or stale list)', () => {
        it('falls back to name-based rules', () => {
            expect(resolveGeminiThinkingConfig('gemini-3-flash-preview', false)).toEqual({
                thinkingLevel: 'minimal',
            })
            expect(resolveGeminiThinkingConfig('gemini-2.5-flash', false)).toEqual({ thinkingBudget: 0 })
            expect(resolveGeminiThinkingConfig('gemini-2.5-pro', false)).toEqual({ thinkingBudget: 128 })
        })
    })
})
