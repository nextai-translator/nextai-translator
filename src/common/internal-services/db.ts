import Dexie, { Table } from 'dexie'
import { TranslateMode } from '../translate'

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

export interface RecentActivity {
    id?: number
    timestamp: number
    mode: TranslateMode
    sourceText: string
    targetText: string
    sourceLang?: string
    targetLang?: string
}

export class LocalDB extends Dexie {
    vocabulary!: Table<VocabularyItem>
    action!: Table<Action>
    recentActivity!: Table<RecentActivity>

    constructor() {
        super('openai-translator')
        this.version(4).stores({
            vocabulary: 'word, reviewCount, description, updatedAt, createdAt',
            action: '++id, idx, mode, name, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
        })
        // Add recentActivity table in version 5
        this.version(5).stores({
            vocabulary: 'word, reviewCount, description, updatedAt, createdAt',
            action: '++id, idx, mode, name, icon, rolePrompt, commandPrompt, outputRenderingFormat, updatedAt, createdAt',
            recentActivity: '++id, timestamp, mode, sourceText, targetText, sourceLang, targetLang',
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
