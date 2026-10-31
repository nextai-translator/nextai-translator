/* eslint-disable camelcase */
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { TranslatorWindow } from './windows/TranslatorWindow'
import { SettingsWindow } from './windows/SettingsWindow'
import { ActionManagerWindow } from './windows/ActionManagerWindow'
import { ThumbWindow } from './windows/ThumbWindow'
import { UpdaterWindow } from './windows/UpdaterWindow'
import { ScreenshotWindow } from './windows/ScreenshotWindow'
import { HistoryWindow } from './windows/HistoryWindow'
import { InlineLookupWindow } from './windows/InlineLookupWindow'
import { QuickTranslatorWindow } from './windows/QuickTranslatorWindow'
import { WritingIndicatorWindow } from './windows/WritingIndicatorWindow'

const windowsMap: Record<string, typeof TranslatorWindow> = {
    translator: TranslatorWindow,
    action_manager: ActionManagerWindow,
    settings: SettingsWindow,
    thumb: ThumbWindow,
    updater: UpdaterWindow,
    screenshot: ScreenshotWindow,
    history: HistoryWindow,
    inline_lookup: InlineLookupWindow,
    quick_translator: QuickTranslatorWindow,
    writing_indicator: WritingIndicatorWindow,
}

export function App() {
    const appWindow = WebviewWindow.getCurrent()
    return <>{windowsMap[appWindow.label]()}</>
}
