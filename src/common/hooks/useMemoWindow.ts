/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window'
import { useEffect } from 'react'

const POSITION_KEY_SUFFIX = '_position'
const SIZE_KEY_SUFFIX = '_size'

export type WindowMemoProps = {
    size: boolean
    position: boolean
    show: boolean
}

/**
 * memorized window props
 */
export const useMemoWindow = (props: WindowMemoProps) => {
    useEffect(() => {
        const appWindow = WebviewWindow.getCurrent()
        const label = appWindow.label ?? 'main'
        const positionKey = `${label}${POSITION_KEY_SUFFIX}`
        const sizeKey = `${label}${SIZE_KEY_SUFFIX}`
        const initWindow = async () => {
            try {
                if (props.position) {
                    const storagePosition = localStorage.getItem(positionKey)
                    if (storagePosition) {
                        const { x, y } = JSON.parse(storagePosition)
                        if (x < 0 || y < 0) {
                            await appWindow.center()
                        } else {
                            await appWindow.setPosition(new PhysicalPosition(x, y))
                        }
                    } else {
                        await appWindow.center()
                    }
                } else {
                    localStorage.removeItem(positionKey)
                }
                if (props.size) {
                    const storageSize = localStorage.getItem(sizeKey)
                    if (storageSize) {
                        let { height, width } = JSON.parse(storageSize)
                        height = Math.max(height, 800)
                        width = Math.max(width, 600)
                        await appWindow.setSize(new PhysicalSize(width, height))
                    }
                } else {
                    localStorage.removeItem(sizeKey)
                }
            } catch (e) {
                console.error(e)
            } finally {
                if (props.show) {
                    await appWindow.unminimize()
                    await appWindow.setFocus()
                    await appWindow.show()
                }
            }
        }
        void initWindow()
    }, [props.position, props.size, props.show])

    useEffect(() => {
        const appWindow = WebviewWindow.getCurrent()
        const label = appWindow.label ?? 'main'
        const positionKey = `${label}${POSITION_KEY_SUFFIX}`
        const sizeKey = `${label}${SIZE_KEY_SUFFIX}`
        let unListenMove: UnlistenFn | undefined
        let unListenResize: UnlistenFn | undefined

        if (props.position) {
            appWindow
                .onMoved(({ payload }) => {
                    localStorage.setItem(positionKey, JSON.stringify(payload))
                })
                .then((unListen: UnlistenFn) => {
                    unListenMove = unListen
                })
        }
        if (props.size) {
            appWindow
                .onResized(({ payload }) => {
                    localStorage.setItem(sizeKey, JSON.stringify(payload))
                })
                .then((unListen: UnlistenFn) => {
                    unListenResize = unListen
                })
        }

        return () => {
            unListenMove?.()
            unListenResize?.()
        }
    }, [props.position, props.size])
}
