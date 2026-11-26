import { builtinActionModes, providers } from './constants'
import type { Action } from './internal-services/db'
import { isRecord } from './settings-schema'

export type SyncedAction = Omit<Action, 'id' | 'idx' | 'createdAt' | 'updatedAt' | 'syncId'> & { syncId: string }

export interface ActionSettingsSnapshot {
    actions: SyncedAction[]
    defaultAction: string | null
}

const builtinModes = builtinActionModes.map(({ mode }) => mode)

export function actionSyncId(action: Action): string {
    return action.mode ? `mode:${action.mode}` : action.syncId ?? `custom:${action.createdAt}:${action.id}`
}

export function getActionSettings(actions: Action[], defaultMode: unknown): ActionSettingsSnapshot {
    const synced = actions.map(({ id, idx, createdAt, updatedAt, ...action }) => ({
        ...Object.fromEntries(Object.entries(action).filter(([, value]) => value !== undefined)),
        syncId: actionSyncId({ ...action, id, idx, createdAt, updatedAt }),
    })) as SyncedAction[]
    const defaultAction = actions.find((action) => (action.mode ?? String(action.id)) === defaultMode)
    return {
        actions: synced,
        defaultAction: defaultAction ? actionSyncId(defaultAction) : defaultMode === 'nop' ? 'nop' : 'mode:translate',
    }
}

export const defaultActionSettings = getActionSettings(
    builtinActionModes.map((action, idx) => ({ ...action, idx, createdAt: '', updatedAt: '' })),
    null
)

function isSyncedAction(value: unknown): value is SyncedAction {
    if (!isRecord(value) || typeof value.name !== 'string' || typeof value.syncId !== 'string') {
        return false
    }
    const validID =
        value.mode === undefined
            ? value.syncId.startsWith('custom:')
            : builtinModes.some((mode) => mode === value.mode && value.syncId === `mode:${mode}`)
    const optionalStrings = ['icon', 'rolePrompt', 'commandPrompt', 'apiModel']
    return (
        validID &&
        optionalStrings.every((key) => value[key] === undefined || typeof value[key] === 'string') &&
        (value.provider === undefined || providers.some((provider) => provider === value.provider)) &&
        (value.outputRenderingFormat === undefined ||
            ['text', 'markdown', 'latex'].some((format) => format === value.outputRenderingFormat)) &&
        (value.thinking === undefined || typeof value.thinking === 'boolean') &&
        (value.thinkingLevel === undefined || ['low', 'medium', 'high'].some((level) => level === value.thinkingLevel))
    )
}

export function isActionSettings(value: unknown): value is ActionSettingsSnapshot {
    if (!isRecord(value) || !Array.isArray(value.actions) || !value.actions.every(isSyncedAction)) {
        return false
    }
    const ids = new Set(value.actions.map(({ syncId }) => syncId))
    const selection = value.defaultAction
    return (
        ids.size === value.actions.length &&
        builtinModes.every((mode) => ids.has(`mode:${mode}`)) &&
        (selection === null || selection === 'nop' || (typeof selection === 'string' && ids.has(selection)))
    )
}
