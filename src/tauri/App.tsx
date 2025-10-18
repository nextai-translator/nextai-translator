/* eslint-disable camelcase */
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { TranslatorWindow } from './windows/TranslatorWindow'
import { SettingsWindow } from './windows/SettingsWindow'
import { ActionManagerWindow } from './windows/ActionManagerWindow'
import { ThumbWindow } from './windows/ThumbWindow'
import { UpdaterWindow } from './windows/UpdaterWindow'
import { ScreenshotWindow } from './windows/ScreenshotWindow'
import { HistoryWindow } from './windows/HistoryWindow'

const windowsMap: Record<string, typeof TranslatorWindow> = {
    translator: TranslatorWindow,
    action_manager: ActionManagerWindow,
    settings: SettingsWindow,
    thumb: ThumbWindow,
    updater: UpdaterWindow,
    screenshot: ScreenshotWindow,
    history: HistoryWindow,
}

export function App() {
    const appWindow = WebviewWindow.getCurrent()
    return <>{windowsMap[appWindow.label]()}</>
}
