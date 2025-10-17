/* eslint-disable camelcase */
import { getCurrent } from '@tauri-apps/api/webviewWindow'
import { TranslatorWindow } from './windows/TranslatorWindow'
import { SettingsWindow } from './windows/SettingsWindow'
import { ActionManagerWindow } from './windows/ActionManagerWindow'
import { ThumbWindow } from './windows/ThumbWindow'
import { UpdaterWindow } from './windows/UpdaterWindow'
import { ScreenshotWindow } from './windows/ScreenshotWindow'
import { HomeWindow } from './windows/HomeWindow'

const windowsMap: Record<string, typeof TranslatorWindow> = {
    translator: TranslatorWindow,
    action_manager: ActionManagerWindow,
    settings: SettingsWindow,
    thumb: ThumbWindow,
    updater: UpdaterWindow,
    screenshot: ScreenshotWindow,
    home: HomeWindow,
}

export function App() {
    const appWindow = getCurrent()
    return <>{windowsMap[appWindow.label]()}</>
}
