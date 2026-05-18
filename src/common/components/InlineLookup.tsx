import { useCallback, useEffect, useRef } from 'react'
import { createUseStyles } from 'react-jss'
import { Markdown } from './Markdown'
import { SpinnerIcon } from './SpinnerIcon'
import { IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useSettings } from '../hooks/useSettings'
import { useTranslation } from 'react-i18next'
import LogoWithText from './LogoWithText'
import { RxCross2 } from 'react-icons/rx'
import { isDesktopApp } from '../utils'
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi'

const useStyles = createUseStyles({
    'container': (props: IThemedStyleProps) => ({
        'boxSizing': 'border-box',
        'display': 'flex',
        'flexDirection': 'column',
        'overflow': 'hidden',
        'position': 'relative',
        'width': 'max-content',
        'minWidth': '180px',
        'maxWidth': '500px',
        'background': props.theme.colors.backgroundPrimary,
        'transition': 'background 0.3s ease',
        '&::-webkit-scrollbar': {
            display: 'none',
        },
    }),
    'resultArea': (props: IThemedStyleProps) => ({
        'padding': '14px 16px',
        'maxHeight': '340px',
        'overflowY': 'auto',
        'color': props.themeType === 'dark' ? props.theme.colors.contentSecondary : props.theme.colors.contentPrimary,
        'fontSize': '14px',
        'lineHeight': '1.6',
        'letterSpacing': '-0.01em',
        '& *': {
            '-ms-user-select': 'text',
            '-webkit-user-select': 'text',
            'user-select': 'text',
        },
    }),
    'loadingContainer': (props: IThemedStyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 0',
        color: props.theme.colors.contentTertiary,
    }),
    'header': (props: IThemedStyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px 4px 12px',
        borderBottom: `1px solid ${props.themeType === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
    }),
    'closeBtn': (props: IThemedStyleProps) => ({
        'display': 'flex',
        'alignItems': 'center',
        'justifyContent': 'center',
        'padding': '4px',
        'borderRadius': '6px',
        'cursor': 'pointer',
        'opacity': 0.6,
        'color': props.theme.colors.contentSecondary,
        'transition': 'all 0.15s ease',
        'border': 'none',
        'background': 'transparent',
        '&:hover': {
            opacity: 1,
            background: props.themeType === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            transform: 'scale(1.08)',
        },
        '&:active': {
            transform: 'scale(0.92)',
        },
    }),
    'caret': {
        marginLeft: '4px',
        borderRight: '0.2em solid #888',
        animation: '$caret 600ms ease-in-out infinite',
    },
    '@keyframes caret': {
        '0%, 100%': { borderColor: '#888' },
        '50%': { borderColor: 'transparent' },
    },
    'resizeHandle': {
        position: 'absolute',
        zIndex: 10,
    },
    'resizeN': {
        top: 0,
        left: 4,
        right: 4,
        height: 4,
        cursor: 'n-resize',
    },
    'resizeS': {
        bottom: 0,
        left: 4,
        right: 4,
        height: 4,
        cursor: 's-resize',
    },
    'resizeE': {
        top: 4,
        right: 0,
        bottom: 4,
        width: 4,
        cursor: 'e-resize',
    },
    'resizeW': {
        top: 4,
        left: 0,
        bottom: 4,
        width: 4,
        cursor: 'w-resize',
    },
})

export interface InlineLookupProps {
    translatedText?: string
    isLoading?: boolean
    onClose?: () => void
}

export function InlineLookup({ translatedText = '', isLoading = false, onClose }: InlineLookupProps) {
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const { settings } = useSettings()
    const styles = useStyles({ theme, themeType })
    const isDesktop = isDesktopApp()
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isDesktop || !containerRef.current) return
        const el = containerRef.current
        const observer = new ResizeObserver(async (entries) => {
            const { width, height } = entries[0].contentRect
            try {
                const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
                const appWindow = WebviewWindow.getCurrent()
                const w = Math.ceil(width)
                const h = Math.ceil(height)
                await appWindow.setSize(new LogicalSize(w, h))

                // Reposition if window bottom passes 5/6 zone
                const { currentMonitor } = await import('@tauri-apps/api/window')
                const mon = await currentMonitor()
                const pos = await appWindow.outerPosition()
                const scale = await appWindow.scaleFactor()
                if (!mon) return
                const mp = mon.position
                const ms = mon.size
                const physH = Math.ceil(h * scale)
                const zone56 = mp.y + (ms.height * 5) / 6
                if (pos.y + physH > zone56) {
                    const zone16 = mp.y + ms.height / 6
                    const newY = Math.max(zone16, pos.y - physH)
                    await appWindow.setPosition(new PhysicalPosition(pos.x, newY))
                }
            } catch {
                // ignore
            }
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [isDesktop])

    const handleResize = useCallback(
        async (direction: string) => {
            if (!isDesktop) return
            try {
                const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
                const appWindow = WebviewWindow.getCurrent()
                await appWindow.startResizeDragging(
                    direction as
                        | 'North'
                        | 'South'
                        | 'East'
                        | 'West'
                        | 'NorthEast'
                        | 'NorthWest'
                        | 'SouthEast'
                        | 'SouthWest'
                )
            } catch {
                // ignore
            }
        },
        [isDesktop]
    )

    return (
        <div className={styles.container} ref={containerRef}>
            {isDesktop && (
                <>
                    <div
                        className={`${styles.resizeHandle} ${styles.resizeN}`}
                        onMouseDown={() => handleResize('North')}
                    />
                    <div
                        className={`${styles.resizeHandle} ${styles.resizeS}`}
                        onMouseDown={() => handleResize('South')}
                    />
                    <div
                        className={`${styles.resizeHandle} ${styles.resizeE}`}
                        onMouseDown={() => handleResize('East')}
                    />
                    <div
                        className={`${styles.resizeHandle} ${styles.resizeW}`}
                        onMouseDown={() => handleResize('West')}
                    />
                </>
            )}
            <div className={styles.header} data-tauri-drag-region>
                <LogoWithText />
                {onClose && (
                    <button className={styles.closeBtn} onClick={onClose} title={t('Close')}>
                        <RxCross2 size={14} />
                    </button>
                )}
            </div>
            <div className={styles.resultArea} style={{ fontSize: settings.fontSize }}>
                {isLoading && !translatedText ? (
                    <div className={styles.loadingContainer}>
                        <SpinnerIcon size={20} />
                    </div>
                ) : (
                    <div>
                        <Markdown>{translatedText}</Markdown>
                        {isLoading && <span className={styles.caret} />}
                    </div>
                )}
            </div>
        </div>
    )
}
