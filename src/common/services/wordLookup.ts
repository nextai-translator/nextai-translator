export interface WordLookupMeaning {
    partOfSpeech: string
    definition: string
    example?: string
}

export interface WordLookupPreview {
    word: string
    phonetic?: string
    meanings: WordLookupMeaning[]
    sourceUrl?: string
}

interface DictionaryDefinition {
    definition?: string
    example?: string
}

interface DictionaryMeaning {
    partOfSpeech?: string
    definitions?: DictionaryDefinition[]
}

interface DictionaryEntry {
    word?: string
    phonetic?: string
    phonetics?: Array<{ text?: string }>
    meanings?: DictionaryMeaning[]
    sourceUrls?: string[]
}

const lookupCache = new Map<string, WordLookupPreview | null>()

export function parseDictionaryResponse(payload: unknown, fallbackWord: string): WordLookupPreview | null {
    if (!Array.isArray(payload) || payload.length === 0) {
        return null
    }

    const entry = payload[0] as DictionaryEntry
    const meanings: WordLookupMeaning[] = []

    for (const meaning of entry.meanings ?? []) {
        const definition = meaning.definitions?.find((item) => item.definition)
        if (!definition?.definition) {
            continue
        }
        meanings.push({
            partOfSpeech: meaning.partOfSpeech ?? '',
            definition: definition.definition,
            example: meaning.definitions?.find((item) => item.example)?.example,
        })
        if (meanings.length === 2) {
            break
        }
    }

    if (meanings.length === 0) {
        return null
    }

    return {
        word: entry.word ?? fallbackWord,
        phonetic: entry.phonetic ?? entry.phonetics?.find((item) => item.text)?.text,
        meanings,
        sourceUrl: entry.sourceUrls?.[0],
    }
}

export async function lookupEnglishWord(word: string, signal?: AbortSignal): Promise<WordLookupPreview | null> {
    const normalizedWord = word.toLocaleLowerCase('en-US')
    if (lookupCache.has(normalizedWord)) {
        return lookupCache.get(normalizedWord) ?? null
    }

    const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
        { signal }
    )
    if (response.status === 404) {
        lookupCache.set(normalizedWord, null)
        return null
    }
    if (!response.ok) {
        throw new Error(`Dictionary lookup failed with status ${response.status}`)
    }

    const preview = parseDictionaryResponse(await response.json(), word)
    lookupCache.set(normalizedWord, preview)
    return preview
}
