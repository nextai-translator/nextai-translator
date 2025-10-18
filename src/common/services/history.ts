import {
    CreateHistoryItem,
    HistoryQueryOptions,
    IHistoryInternalService,
    UpdateHistoryPayload,
    historyInternalService,
} from '../internal-services/history'
import { HistoryItem } from '../internal-services/db'
import { isDesktopApp, isUserscript } from '../utils'
import { backgroundHistoryService } from '../background/services/history'

const historyServiceImpl: IHistoryInternalService =
    isDesktopApp() || isUserscript() ? historyInternalService : backgroundHistoryService

export const historyService = {
    create(item: CreateHistoryItem): Promise<HistoryItem> {
        return historyServiceImpl.create(item)
    },
    update(id: number, payload: UpdateHistoryPayload): Promise<void> {
        return historyServiceImpl.update(id, payload)
    },
    updateFavorite(id: number, favorite: boolean): Promise<void> {
        return historyServiceImpl.updateFavorite(id, favorite)
    },
    touch(id: number): Promise<void> {
        return historyServiceImpl.touch(id)
    },
    delete(id: number): Promise<void> {
        return historyServiceImpl.delete(id)
    },
    clear(): Promise<void> {
        return historyServiceImpl.clear()
    },
    list(options?: HistoryQueryOptions): Promise<HistoryItem[]> {
        return historyServiceImpl.list(options)
    },
    get(id: number): Promise<HistoryItem | undefined> {
        return historyServiceImpl.get(id)
    },
}
