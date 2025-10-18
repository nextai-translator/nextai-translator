import { useCallback, useEffect } from 'react'
import { Window } from '../components/Window'
import { TranslationHistory } from '../../common/components/TranslationHistory'
import { useLiveQuery } from 'dexie-react-hooks'
import { actionService } from '../../common/services/action'
import { HistoryItem } from '../../common/internal-services/db'
import { emit } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useMemoWindow } from '../../common/hooks/useMemoWindow'
import { trackEvent } from '@aptabase/tauri'

export function HistoryWindow() {
    useMemoWindow({ size: true, position: true, show: true })

    useEffect(() => {
        trackEvent('screen_view', { name: 'History' })
    }, [])

    const actions = useLiveQuery(() => actionService.list(), [])
    const appWindow = WebviewWindow.getCurrent()

    const handleClose = useCallback(() => {
        void appWindow.close()
    }, [appWindow])

    const handleRestore = useCallback(
        (item: HistoryItem) => {
            void emit('history:restore', item)
            void appWindow.close()
        },
        [appWindow]
    )

    return (
        <Window>
            <TranslationHistory
                variant='window'
                isOpen
                actions={actions ?? []}
                onClose={handleClose}
                onRestore={handleRestore}
            />
        </Window>
    )
}
