import Dexie, { Table } from 'dexie'
import { TranslateMode } from '../translate'
import { LangCode } from '../lang'

export interface VocabularyItem {
    word: string
    reviewCount: number
    description: string
    updatedAt: string
    createdAt: string
    [prop: string]: string | number
}

export type ActionOutputRenderingFormat = 'text' | 'markdown' | 'latex'

export interface Action {
    id?: number
    idx: number
    mode?: TranslateMode
    name: string
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
    updatedAt: string
    createdAt: string
}

export interface HistoryItem {
    id?: number
    text: string
    translatedText: string
    sourceLang: LangCode
    targetLang: LangCode
    actionId?: number
    actionName?: string
    actionMode?: TranslateMode
    provider?: string
    engineModel?: string
    favorite: boolean
    wordMode?: boolean
    tokenCount?: number
    createdAt: number
    updatedAt: number
}

export class LocalDB extends Dexie {
    vocabulary!: Table<VocabularyItem>
    action!: Table<Action>
    history!: Table<HistoryItem>

    constructor() {
        super('openai-translator')
        this.version(4).stores({
            vocabulary: 'word, reviewCount, description, updatedAt, createdAt',
            action: '++id, idx, mode, name, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
        })
        this.version(5).stores({
            vocabulary: 'word, reviewCount, description, updatedAt, createdAt',
            action: '++id, idx, mode, name, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
            history:
                '++id, createdAt, updatedAt, text, translatedText, sourceLang, targetLang, actionId, actionMode, favorite',
        })
    }
}

let localDB: LocalDB

export const getLocalDB = () => {
    if (!localDB) {
        localDB = new LocalDB()
    }
    return localDB
}
