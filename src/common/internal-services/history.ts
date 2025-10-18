import { getLocalDB, HistoryItem } from './db'
import { LangCode } from '../lang'
import { TranslateMode } from '../translate'

export interface CreateHistoryItem {
    text: string
    translatedText: string
    sourceLang: LangCode
    targetLang: LangCode
    actionId?: number
    actionName?: string
    actionMode?: TranslateMode
    provider?: string
    engineModel?: string
    favorite?: boolean
    wordMode?: boolean
    tokenCount?: number
}

export interface UpdateHistoryPayload {
    translatedText?: string
    tokenCount?: number
}

export interface HistoryQueryOptions {
    search?: string
    actionId?: number
    actionMode?: TranslateMode
    sourceLang?: LangCode
    targetLang?: LangCode
    favoritesOnly?: boolean
    limit?: number
}

export interface IHistoryInternalService {
    create(item: CreateHistoryItem): Promise<HistoryItem>
    update(id: number, payload: UpdateHistoryPayload): Promise<void>
    updateFavorite(id: number, favorite: boolean): Promise<void>
    touch(id: number): Promise<void>
    delete(id: number): Promise<void>
    clear(): Promise<void>
    list(options?: HistoryQueryOptions): Promise<HistoryItem[]>
    get(id: number): Promise<HistoryItem | undefined>
}

class HistoryInternalService implements IHistoryInternalService {
    private get db() {
        return getLocalDB()
    }

    async create(item: CreateHistoryItem): Promise<HistoryItem> {
        const now = Date.now()
        const history: HistoryItem = {
            favorite: item.favorite ?? false,
            updatedAt: now,
            createdAt: now,
            ...item,
        }
        const id = await this.db.history.add(history)
        history.id = id as number
        return history
    }

    async update(id: number, payload: UpdateHistoryPayload): Promise<void> {
        await this.db.history.update(id, {
            ...payload,
            updatedAt: Date.now(),
        })
    }

    async updateFavorite(id: number, favorite: boolean): Promise<void> {
        await this.db.history.update(id, {
            favorite,
            updatedAt: Date.now(),
        })
    }

    async touch(id: number): Promise<void> {
        await this.db.history.update(id, {
            updatedAt: Date.now(),
        })
    }

    async delete(id: number): Promise<void> {
        await this.db.history.delete(id)
    }

    async clear(): Promise<void> {
        await this.db.history.clear()
    }

    async get(id: number): Promise<HistoryItem | undefined> {
        return await this.db.history.get(id)
    }

    async list(options: HistoryQueryOptions = {}): Promise<HistoryItem[]> {
        const { search, actionId, actionMode, sourceLang, targetLang, favoritesOnly, limit } = options
        const normalizedSearch = search?.trim().toLowerCase()
        let collection = this.db.history.orderBy('updatedAt').reverse()
        if (favoritesOnly) {
            collection = collection.filter((item) => item.favorite)
        }
        if (actionId !== undefined) {
            collection = collection.filter((item) => item.actionId === actionId)
        } else if (actionMode) {
            collection = collection.filter((item) => item.actionMode === actionMode)
        }
        if (sourceLang) {
            collection = collection.filter((item) => item.sourceLang === sourceLang)
        }
        if (targetLang) {
            collection = collection.filter((item) => item.targetLang === targetLang)
        }
        if (normalizedSearch) {
            collection = collection.filter((item) => {
                return (
                    item.text.toLowerCase().includes(normalizedSearch) ||
                    item.translatedText.toLowerCase().includes(normalizedSearch) ||
                    (item.actionName ?? '').toLowerCase().includes(normalizedSearch)
                )
            })
        }
        if (limit !== undefined) {
            collection = collection.limit(limit)
        }
        return await collection.toArray()
    }
}

export const historyInternalService = new HistoryInternalService()
