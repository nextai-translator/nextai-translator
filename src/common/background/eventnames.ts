import { IVocabularyInternalService } from '../internal-services/vocabulary'
import { IHistoryInternalService } from '../internal-services/history'

export const BackgroundEventNames = {
    fetch: 'fetch',
    vocabularyService: 'vocabularyService',
    actionService: 'actionService',
    historyService: 'historyService',
    getItem: 'getItem',
    setItem: 'setItem',
    removeItem: 'removeItem',
}

export type BackgroundVocabularyServiceMethodNames = keyof IVocabularyInternalService
export type BackgroundHistoryServiceMethodNames = keyof IHistoryInternalService
