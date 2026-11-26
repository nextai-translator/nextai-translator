import { v4 as uuidv4 } from 'uuid'
import { builtinActionModes } from '../constants'
import { Provider } from '../engines'
import { TranslateMode } from '../translate'
import { Action, ActionOutputRenderingFormat, getLocalDB } from './db'
import { actionSyncId, isActionSettings, type ActionSettingsSnapshot } from '../webdav-action-settings'

export interface ICreateActionOption {
    name: string
    mode?: TranslateMode
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
    provider?: Provider
    apiModel?: string
    thinking?: boolean
    thinkingLevel?: 'low' | 'medium' | 'high'
}

export interface IUpdateActionOption {
    idx?: number
    name?: string
    mode?: TranslateMode
    icon?: string
    rolePrompt?: string
    commandPrompt?: string
    outputRenderingFormat?: ActionOutputRenderingFormat
    provider?: Provider
    apiModel?: string
    thinking?: boolean
    thinkingLevel?: 'low' | 'medium' | 'high'
}

export interface IActionInternalService {
    create(opt: ICreateActionOption): Promise<Action>
    update(action: Action, opt: IUpdateActionOption): Promise<Action>
    bulkPut(actions: Action[]): Promise<void>
    applySyncedActions(snapshot: ActionSettingsSnapshot): Promise<string | null>
    get(id: number): Promise<Action | undefined>
    getByMode(mode: string): Promise<Action | undefined>
    delete(id: number): Promise<void>
    list(): Promise<Action[]>
    count(): Promise<number>
}

class ActionInternalService implements IActionInternalService {
    private get db() {
        return getLocalDB()
    }

    async create(opt: ICreateActionOption): Promise<Action> {
        if (!opt.name) {
            throw new Error('name is required')
        }
        return this.db.transaction('rw', this.db.action, async () => {
            const now = new Date().valueOf().toString()
            const action: Action = {
                idx: await this.db.action.count(),
                name: opt.name,
                mode: opt.mode,
                syncId: opt.mode ? undefined : `custom:${uuidv4()}`,
                icon: opt.icon,
                rolePrompt: opt.rolePrompt,
                commandPrompt: opt.commandPrompt,
                outputRenderingFormat: opt.outputRenderingFormat,
                provider: opt.provider,
                apiModel: opt.apiModel,
                thinking: opt.thinking,
                thinkingLevel: opt.thinkingLevel,
                createdAt: now,
                updatedAt: now,
            }
            const id = await this.db.action.add(action)
            action.id = id as number
            return action
        })
    }

    async update(action: Action, opt: IUpdateActionOption): Promise<Action> {
        return this.db.transaction('rw', this.db.action, async () => {
            if (opt.idx !== undefined) {
                let actions: Action[]
                if (action.idx < opt.idx) {
                    actions = await this.db.action.where('idx').between(action.idx, opt.idx).toArray()
                    actions.forEach((a) => a.idx--)
                } else {
                    actions = await this.db.action.where('idx').between(opt.idx, action.idx).toArray()
                    actions.forEach((a) => a.idx++)
                }
                await this.db.action.bulkPut(actions)
            }
            const now = new Date().valueOf().toString()
            const newAction = {
                ...action,
                ...opt,
                updatedAt: now,
            }
            // Use put() instead of update() so that undefined values properly
            // clear fields (Dexie's update() silently ignores undefined properties)
            await this.db.action.put(newAction)
            return newAction
        })
    }

    async bulkPut(actions: Action[]): Promise<void> {
        await this.db.action.bulkPut(actions)
    }

    async applySyncedActions(snapshot: ActionSettingsSnapshot): Promise<string | null> {
        if (!isActionSettings(snapshot)) {
            throw new Error('Invalid synced actions')
        }
        return this.db.transaction('rw', this.db.action, async () => {
            const existing = new Map((await this.db.action.toArray()).map((action) => [actionSyncId(action), action]))
            const now = Date.now().toString()
            const actions = snapshot.actions.map((action, idx): Action => {
                const previous = existing.get(action.syncId)
                existing.delete(action.syncId)
                return {
                    ...action,
                    idx,
                    id: previous?.id,
                    createdAt: previous?.createdAt ?? now,
                    updatedAt: now,
                }
            })
            await this.db.action.bulkDelete(Array.from(existing.values(), (action) => action.id!))
            const ids = await this.db.action.bulkPut(actions, { allKeys: true })
            const selected = snapshot.actions.findIndex(({ syncId }) => syncId === snapshot.defaultAction)
            if (selected < 0) {
                return snapshot.defaultAction
            }
            return actions[selected].mode ?? String(ids[selected])
        })
    }

    async get(id: number): Promise<Action | undefined> {
        return await this.db.action.get(id)
    }

    async getByMode(mode: string): Promise<Action | undefined> {
        return await this.db.action.where('mode').equals(mode).first()
    }

    async delete(id: number): Promise<void> {
        return this.db.transaction('rw', this.db.action, async () => {
            const action = await this.db.action.get(id)
            if (!action) {
                return
            }
            if (action.mode) {
                return
            }
            const actions = await this.db.action.where('idx').above(action.idx).toArray()
            actions.forEach((a) => a.idx--)
            await this.db.action.bulkPut(actions)
            return await this.db.action.delete(id)
        })
    }

    async list(): Promise<Action[]> {
        return this.db.transaction('rw', this.db.action, async () => {
            let count = await this.db.action.count()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const actions = await (this.db.action.orderBy('idx') as any).desc().toArray()
            builtinActionModes.forEach(async (m) => {
                const now = new Date().valueOf().toString()
                const action = actions.find((a: Action) => a.mode === m.mode)
                if (action) {
                    return
                }
                await this.db.action.add({
                    idx: count++,
                    name: m.name,
                    mode: m.mode,
                    icon: m.icon,
                    createdAt: now,
                    updatedAt: now,
                })
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return await (this.db.action.orderBy('idx') as any).toArray()
        })
    }

    async count(): Promise<number> {
        return await this.db.action.count()
    }
}

export const actionInternalService = new ActionInternalService()
