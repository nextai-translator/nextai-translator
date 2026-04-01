import { IActionInternalService, ICreateActionOption, IUpdateActionOption } from '../../internal-services/action'
import { Action } from '../../internal-services/db'

class BackgroundActionService implements IActionInternalService {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    create(opt: ICreateActionOption): Promise<Action> {
        return Promise.reject(
            new Error('BackgroundActionService is not available in desktop-only build.')
        ) as Promise<Action>
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(action: Action, opt: IUpdateActionOption): Promise<Action> {
        return Promise.reject(
            new Error('BackgroundActionService is not available in desktop-only build.')
        ) as Promise<Action>
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    bulkPut(actions: Action[]): Promise<void> {
        return Promise.reject(
            new Error('BackgroundActionService is not available in desktop-only build.')
        ) as Promise<void>
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    get(id: number): Promise<Action | undefined> {
        return Promise.reject(new Error('BackgroundActionService is not available in desktop-only build.')) as Promise<
            Action | undefined
        >
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getByMode(mode: string): Promise<Action | undefined> {
        return Promise.reject(new Error('BackgroundActionService is not available in desktop-only build.')) as Promise<
            Action | undefined
        >
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    delete(id: number): Promise<void> {
        return Promise.reject(
            new Error('BackgroundActionService is not available in desktop-only build.')
        ) as Promise<void>
    }
    list(): Promise<Action[]> {
        return Promise.reject(new Error('BackgroundActionService is not available in desktop-only build.')) as Promise<
            Action[]
        >
    }
    count(): Promise<number> {
        return Promise.reject(
            new Error('BackgroundActionService is not available in desktop-only build.')
        ) as Promise<number>
    }
}

export const backgroundActionService = new BackgroundActionService()
