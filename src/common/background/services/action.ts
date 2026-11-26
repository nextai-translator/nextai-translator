import { IActionInternalService, ICreateActionOption, IUpdateActionOption } from '../../internal-services/action'
import { Action } from '../../internal-services/db'
import { callMethod } from './base'
import type { ActionSettingsSnapshot } from '../../webdav-action-settings'

class BackgroundActionService implements IActionInternalService {
    create(opt: ICreateActionOption): Promise<Action> {
        return callMethod('actionService', 'create', [opt])
    }
    update(action: Action, opt: IUpdateActionOption): Promise<Action> {
        return callMethod('actionService', 'update', [action, opt])
    }
    bulkPut(actions: Action[]): Promise<void> {
        return callMethod('actionService', 'bulkPut', [actions])
    }
    applySyncedActions(snapshot: ActionSettingsSnapshot): Promise<string | null> {
        return callMethod('actionService', 'applySyncedActions', [snapshot])
    }
    get(id: number): Promise<Action | undefined> {
        return callMethod('actionService', 'get', [id])
    }
    getByMode(mode: string): Promise<Action | undefined> {
        return callMethod('actionService', 'getByMode', [mode])
    }
    delete(id: number): Promise<void> {
        return callMethod('actionService', 'delete', [id])
    }
    list(): Promise<Action[]> {
        return callMethod('actionService', 'list', [])
    }
    count(): Promise<number> {
        return callMethod('actionService', 'count', [])
    }
}

export const backgroundActionService = new BackgroundActionService()
