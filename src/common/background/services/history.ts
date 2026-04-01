import {
    CreateHistoryItem,
    HistoryQueryOptions,
    IHistoryInternalService,
    UpdateHistoryPayload,
} from '../../internal-services/history'
import { HistoryItem } from '../../internal-services/db'

class BackgroundHistoryService implements IHistoryInternalService {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    create(item: CreateHistoryItem): Promise<HistoryItem> {
        return Promise.reject(
            new Error('BackgroundHistoryService is not available in desktop-only build.')
        ) as Promise<HistoryItem>
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(id: number, payload: UpdateHistoryPayload): Promise<void> {
        return Promise.reject(
            new Error('BackgroundHistoryService is not available in desktop-only build.')
        ) as Promise<void>
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateFavorite(id: number, favorite: boolean): Promise<void> {
        return Promise.reject(
            new Error('BackgroundHistoryService is not available in desktop-only build.')
        ) as Promise<void>
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    touch(id: number): Promise<void> {
        return Promise.reject(
            new Error('BackgroundHistoryService is not available in desktop-only build.')
        ) as Promise<void>
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    delete(id: number): Promise<void> {
        return Promise.reject(
            new Error('BackgroundHistoryService is not available in desktop-only build.')
        ) as Promise<void>
    }
    clear(): Promise<void> {
        return Promise.reject(
            new Error('BackgroundHistoryService is not available in desktop-only build.')
        ) as Promise<void>
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    list(options?: HistoryQueryOptions | undefined): Promise<HistoryItem[]> {
        return Promise.reject(new Error('BackgroundHistoryService is not available in desktop-only build.')) as Promise<
            HistoryItem[]
        >
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get(id: number): Promise<HistoryItem | undefined> {
        return Promise.reject(new Error('BackgroundHistoryService is not available in desktop-only build.')) as Promise<
            HistoryItem | undefined
        >
    }
}

export const backgroundHistoryService = new BackgroundHistoryService()
