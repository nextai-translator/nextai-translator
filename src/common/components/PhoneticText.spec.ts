import { describe, expect, it } from 'vitest'
import { parsePhoneticSegments } from './PhoneticText'

describe('phonetic text parsing', () => {
    it('associates an inline IPA transcription with the word before it', () => {
        expect(parsePhoneticSegments('1. hello · /həˈloʊ/')).toEqual([
            { kind: 'text', text: '1. hello · ' },
            { kind: 'phonetic', text: '/həˈloʊ/', speechText: 'hello' },
        ])
    })

    it('uses the preceding word when the phonetic line starts with a language label', () => {
        expect(parsePhoneticSegments('hello\n[English]· /həˈloʊ/')).toEqual([
            { kind: 'text', text: 'hello\n[English]· ' },
            { kind: 'phonetic', text: '/həˈloʊ/', speechText: 'hello' },
        ])
    })

    it('does not treat ordinary slash-delimited text as phonetics', () => {
        expect(parsePhoneticSegments('Open /usr/local/bin')).toEqual([{ kind: 'text', text: 'Open /usr/local/bin' }])
    })

    it('adds speech to an inline Chinese example without reading its translation', () => {
        expect(parsePhoneticSegments('例句：How are you? (你好吗？)')).toEqual([
            { kind: 'text', text: '例句：' },
            { kind: 'example', text: 'How are you?', speechText: 'How are you?' },
            { kind: 'text', text: ' (你好吗？)' },
        ])
    })

    it('adds speech to a numbered bilingual example', () => {
        expect(parsePhoneticSegments('2. She said hi.（她打了招呼。）')).toEqual([
            { kind: 'text', text: '2. ' },
            { kind: 'example', text: 'She said hi.', speechText: 'She said hi.' },
            { kind: 'text', text: '（她打了招呼。）' },
        ])
    })

    it('adds speech to a numbered example without punctuation after the number', () => {
        expect(parsePhoneticSegments('1 How are you?（你好吗？）')).toEqual([
            { kind: 'text', text: '1 ' },
            { kind: 'example', text: 'How are you?', speechText: 'How are you?' },
            { kind: 'text', text: '（你好吗？）' },
        ])
    })

    it('does not treat a numbered definition as an example', () => {
        expect(parsePhoneticSegments('1. an expression of greeting')).toEqual([
            { kind: 'text', text: '1. an expression of greeting' },
        ])
    })
})
