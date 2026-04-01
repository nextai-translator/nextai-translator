import { useCallback, useEffect, useState } from 'react'
import { Translator } from '../../common/components/Translator'
import { Client as Styletron } from 'styletron-engine-atomic'
import { listen, type Event, type UnlistenFn } from '@tauri-apps/api/event'
import { bindDisplayWindowHotkey, bindHotkey, onSettingsSave } from '../utils'
import { v4 as uuidv4 } from 'uuid'
import { PREFIX } from '../../common/constants'
import { useSettings } from '../../common/hooks/useSettings'
import { setupAnalysis } from '../../common/analysis'
import { Window } from '../components/Window'
import { setExternalOriginalText } from '../../common/store'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { usePinned } from '../../common/hooks/usePinned'
import { useMemoWindow } from '../../common/hooks/useMemoWindow'
import { isMacOS } from '@/common/utils'
import { commands } from '../bindings'

const engine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

export function TranslatorWindow() {
    const [uuid, setUUID] = useState('')
    const [showSettings, setShowSettings] = useState(false)

    const { settings } = useSettings()

    useMemoWindow({ size: true, position: false, show: !settings.runAtStartup })

    useEffect(() => {
        setupAnalysis()
    }, [])

    useEffect(() => {
        let unlisten: UnlistenFn | undefined
        ;(async () => {
            unlisten = await listen('change-text', async (event: Event<string>) => {
                const selectedText = event.payload
                if (selectedText) {
                    const uuid_ = uuidv4().replace(/-/g, '').slice(0, 6)
                    setUUID(uuid_)
                    setExternalOriginalText(selectedText)
                }
            })
        })()
        return () => {
            unlisten?.()
        }
    }, [])

    useEffect(() => {
        let unlisten: UnlistenFn | undefined
        ;(async () => {
            unlisten = await listen('show-settings', async () => {
                const uuid_ = uuidv4().replace(/-/g, '').slice(0, 6)
                setShowSettings(true)
                setUUID(uuid_)
            })
        })()
        return () => {
            unlisten?.()
        }
    }, [])

    useEffect(() => {
        let unlisten: UnlistenFn | undefined
        ;(async () => {
            unlisten = await listen('show', async () => {
                const uuid_ = uuidv4().replace(/-/g, '').slice(0, 6)
                setUUID(uuid_)
            })
        })()
        return unlisten
    }, [])

    const { pinned } = usePinned()

    useEffect(() => {
        const appWindow = WebviewWindow.getCurrent()
        let unlisten: UnlistenFn | undefined
        let timer: number | undefined
        appWindow
            .onFocusChanged(({ payload: focused }: Event<boolean>) => {
                if (!focused) {
                    commands.rememberActiveWindowCommand().catch(console.error)
                }
                if (!pinned && settings.autoHideWindowWhenOutOfFocus) {
                    if (timer) {
                        clearTimeout(timer)
                    }
                    if (focused) {
                        return
                    }
                    timer = window.setTimeout(() => {
                        commands.hideTranslatorWindow()
                    }, 50)
                }
            })
            .then((cb: UnlistenFn) => {
                unlisten = cb
            })
        return () => {
            if (timer) {
                clearTimeout(timer)
            }
            unlisten?.()
        }
    }, [pinned, settings.autoHideWindowWhenOutOfFocus])

    useEffect(() => {
        bindHotkey()
        bindDisplayWindowHotkey()
    }, [])

    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const onSettingsShow = useCallback((isShow: boolean) => {
        setIsSettingsOpen(isShow)
    }, [])

    return (
        <Window isTranslatorWindow windowsTitlebarDisableDarkMode={isSettingsOpen}>
            <Translator
                uuid={uuid}
                engine={engine}
                showLogo={isMacOS}
                showSettingsIcon
                showSettings={showSettings}
                autoFocus
                defaultShowSettings
                editorRows={10}
                containerStyle={{ paddingTop: settings.enableBackgroundBlur ? '' : '26px' }}
                onSettingsSave={onSettingsSave}
                onSettingsShow={onSettingsShow}
            />
        </Window>
    )
}
