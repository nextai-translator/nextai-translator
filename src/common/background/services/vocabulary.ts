import { VocabularyItem } from '../../internal-services/db'
import { IVocabularyInternalService } from '../../internal-services/vocabulary'

class BackgroundVocabularyService implements IVocabularyInternalService {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async putItem(item: VocabularyItem): Promise<void> {
        return await (Promise.reject(
            new Error('BackgroundVocabularyService is not available in desktop-only build.')
        ) as Promise<void>)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getItem(word: string): Promise<VocabularyItem | undefined> {
        return await (Promise.reject(
            new Error('BackgroundVocabularyService is not available in desktop-only build.')
        ) as Promise<VocabularyItem | undefined>)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async deleteItem(word: string): Promise<void> {
        return await (Promise.reject(
            new Error('BackgroundVocabularyService is not available in desktop-only build.')
        ) as Promise<void>)
    }

    async countItems(): Promise<number> {
        return await (Promise.reject(
            new Error('BackgroundVocabularyService is not available in desktop-only build.')
        ) as Promise<number>)
    }

    async listItems(): Promise<VocabularyItem[]> {
        return await (Promise.reject(
            new Error('BackgroundVocabularyService is not available in desktop-only build.')
        ) as Promise<VocabularyItem[]>)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listRandomItems(limit: number): Promise<VocabularyItem[]> {
        return await (Promise.reject(
            new Error('BackgroundVocabularyService is not available in desktop-only build.')
        ) as Promise<VocabularyItem[]>)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listFrequencyItems(limit: number): Promise<VocabularyItem[]> {
        return await (Promise.reject(
            new Error('BackgroundVocabularyService is not available in desktop-only build.')
        ) as Promise<VocabularyItem[]>)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async isCollected(word: string): Promise<boolean> {
        return await (Promise.reject(
            new Error('BackgroundVocabularyService is not available in desktop-only build.')
        ) as Promise<boolean>)
    }
}

export const backgroundVocabularyService = new BackgroundVocabularyService()
