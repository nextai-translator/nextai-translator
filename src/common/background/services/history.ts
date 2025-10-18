import {
    CreateHistoryItem,
    HistoryQueryOptions,
    IHistoryInternalService,
    UpdateHistoryPayload,
} from '../../internal-services/history'
import { HistoryItem } from '../../internal-services/db'
import { callMethod } from './base'

class BackgroundHistoryService implements IHistoryInternalService {
    create(item: CreateHistoryItem): Promise<HistoryItem> {
        return callMethod('historyService', 'create', [item])
    }
    update(id: number, payload: UpdateHistoryPayload): Promise<void> {
        return callMethod('historyService', 'update', [id, payload])
    }
    updateFavorite(id: number, favorite: boolean): Promise<void> {
        return callMethod('historyService', 'updateFavorite', [id, favorite])
    }
    touch(id: number): Promise<void> {
        return callMethod('historyService', 'touch', [id])
    }
    delete(id: number): Promise<void> {
        return callMethod('historyService', 'delete', [id])
    }
    clear(): Promise<void> {
        return callMethod('historyService', 'clear', [])
    }
    list(options?: HistoryQueryOptions | undefined): Promise<HistoryItem[]> {
        return callMethod('historyService', 'list', [options])
    }
    get(id: number): Promise<HistoryItem | undefined> {
        return callMethod('historyService', 'get', [id])
    }
}

export const backgroundHistoryService = new BackgroundHistoryService()
