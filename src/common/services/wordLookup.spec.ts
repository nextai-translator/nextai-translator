import { describe, expect, it } from 'vitest'
import { parseDictionaryResponse } from './wordLookup'

describe('parseDictionaryResponse', () => {
    it('creates a compact preview with phonetics, meanings, examples, and attribution', () => {
        expect(
            parseDictionaryResponse(
                [
                    {
                        word: 'elegant',
                        phonetics: [{ text: '/ˈɛl.ə.ɡənt/' }],
                        meanings: [
                            {
                                partOfSpeech: 'adjective',
                                definitions: [
                                    {
                                        definition: 'Characterised by elegance.',
                                    },
                                    {
                                        definition: 'Refined and graceful.',
                                        example: 'An elegant solution.',
                                    },
                                ],
                            },
                            {
                                partOfSpeech: 'noun',
                                definitions: [{ definition: 'A refined person.' }],
                            },
                            {
                                partOfSpeech: 'adverb',
                                definitions: [{ definition: 'A third result that should not be displayed.' }],
                            },
                        ],
                        sourceUrls: ['https://en.wiktionary.org/wiki/elegant'],
                    },
                ],
                'Elegant'
            )
        ).toEqual({
            word: 'elegant',
            phonetic: '/ˈɛl.ə.ɡənt/',
            meanings: [
                {
                    partOfSpeech: 'adjective',
                    definition: 'Characterised by elegance.',
                    example: 'An elegant solution.',
                },
                {
                    partOfSpeech: 'noun',
                    definition: 'A refined person.',
                    example: undefined,
                },
            ],
            sourceUrl: 'https://en.wiktionary.org/wiki/elegant',
        })
    })

    it('returns null for an empty or unusable dictionary response', () => {
        expect(parseDictionaryResponse([], 'missing')).toBeNull()
        expect(parseDictionaryResponse([{ meanings: [] }], 'missing')).toBeNull()
    })
})
