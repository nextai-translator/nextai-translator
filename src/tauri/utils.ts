import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { getSettings } from '@/common/utils'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { commands, events } from './bindings'
import { ISettings } from '@/common/types'

const modifierKeys = [
    'OPTION',
    'ALT',
    'CONTROL',
    'CTRL',
    'COMMAND',
    'CMD',
    'SUPER',
    'SHIFT',
    'COMMANDORCONTROL',
    'COMMANDORCTRL',
    'CMDORCTRL',
    'CMDORCONTROL',
]

const isModifierKey = (key: string): boolean => {
    return modifierKeys.includes(key.toUpperCase())
}

export function isMissingNormalKey(hotkey: string): boolean {
    const tokens = hotkey.split('+').map((token) => token.trim().toUpperCase())
    return tokens.every((token) => isModifierKey(token))
}

export async function bindHotkey(oldHotKey?: string) {
    if (oldHotKey && !isMissingNormalKey(oldHotKey) && (await isRegistered(oldHotKey))) {
        await unregister(oldHotKey)
    }
    const settings = await getSettings()
    if (!settings.hotkey) return
    if (isMissingNormalKey(settings.hotkey)) {
        sendNotification({
            title: 'Cannot bind hotkey',
            body: `Hotkey must contain at least one normal key: ${settings.hotkey}`,
        })
        return
    }
    if (await isRegistered(settings.hotkey)) {
        await unregister(settings.hotkey)
    }
    await register(settings.hotkey, () => {
        return commands.showTranslatorWindowWithSelectedTextCommand()
    }).then(() => {
        console.log('register hotkey success')
    })
}

export async function bindDisplayWindowHotkey(oldHotKey?: string) {
    if (oldHotKey && !isMissingNormalKey(oldHotKey) && (await isRegistered(oldHotKey))) {
        await unregister(oldHotKey)
    }
    const settings = await getSettings()
    if (!settings.displayWindowHotkey) return
    if (isMissingNormalKey(settings.displayWindowHotkey)) {
        sendNotification({
            title: 'Cannot bind hotkey',
            body: `Hotkey must contain at least one normal key: ${settings.displayWindowHotkey}`,
        })
        return
    }
    if (await isRegistered(settings.displayWindowHotkey)) {
        await unregister(settings.displayWindowHotkey)
    }
    await register(settings.displayWindowHotkey, () => {
        commands.showTranslatorWindowCommand()
    }).then(() => {
        console.log('register display window hotkey success')
    })
}

export function onSettingsSave(oldSettings: ISettings) {
    events.configUpdatedEvent.emit()
    bindHotkey(oldSettings.hotkey)
    bindDisplayWindowHotkey(oldSettings.displayWindowHotkey)
}
