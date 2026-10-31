import { useEffect, useRef, useState } from 'react'
import { listen, type Event, type UnlistenFn } from '@tauri-apps/api/event'
import { commands } from '../bindings'

// Floating "translating" HUD anchored just below the input the user triggered
// writing on. The window itself uses macOS HudWindow vibrancy (applied in
// Rust); this React layer renders only the foreground content (icon + label +
// pulsing dots, with a check morph on done). Keep the layer minimal so the
// native frosted material does the visual heavy lifting.

type StartPayload = { targetLanguage?: string }

const PANEL_STYLE: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '0 14px',
    pointerEvents: 'none',
    color: 'rgba(255, 255, 255, 0.92)',
    // SF Pro on macOS → "-apple-system" picks SF Pro Text / Display per size.
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // Subtle top inner highlight & bottom shadow that AppKit HUDs have.
    boxShadow: 'inset 0 0.5px 0 rgba(255, 255, 255, 0.10), inset 0 -0.5px 0 rgba(0, 0, 0, 0.20)',
    borderRadius: 14,
    overflow: 'hidden',
}

const ROW_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    fontSize: 12.5,
    fontWeight: 500,
    letterSpacing: 0.05,
    lineHeight: 1,
    // Smooth content fade independent of the OS window-show.
    transition: 'opacity 260ms cubic-bezier(.4,0,.2,1), transform 320ms cubic-bezier(.16,1,.3,1)',
    willChange: 'opacity, transform',
}

const LABEL_STYLE: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: 'rgba(255, 255, 255, 0.88)',
}

const DOTS_WRAPPER: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    marginLeft: 2,
}

const ICON_WRAPPER: React.CSSProperties = {
    width: 14,
    height: 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 14px',
}

function ensureKeyframes() {
    const id = '__writing_indicator_kf__'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
@keyframes wi-dot-pulse {
    0%, 80%, 100% { opacity: 0.35; transform: scale(0.82); }
    40%           { opacity: 1;    transform: scale(1.04); }
}
@keyframes wi-pen-wobble {
    0%, 100% { transform: translateY(0)    rotate(-3deg); }
    50%      { transform: translateY(-0.8px) rotate(4deg); }
}
@keyframes wi-check-pop {
    0%   { opacity: 0; transform: scale(0.4) rotate(-12deg); }
    60%  { opacity: 1; transform: scale(1.08) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
`
    document.head.appendChild(style)
}

function languageLabel(lang: string | undefined): string {
    if (!lang || !lang.trim()) return 'Translating'
    return `Translating · ${lang}`
}

const PenIcon = () => (
    <svg
        width='13'
        height='13'
        viewBox='0 0 16 16'
        fill='none'
        style={{
            display: 'block',
            animation: 'wi-pen-wobble 1.8s ease-in-out infinite',
            transformOrigin: '8px 12px',
        }}
    >
        {/* Slim line-art fountain pen tip — minimal SF-Symbols feel. */}
        <path
            d='M2.4 13.6 L4.6 12.9 L13.0 4.5 L11.5 3.0 L3.1 11.4 L2.4 13.6 Z'
            stroke='rgba(255,255,255,0.88)'
            strokeWidth='1.1'
            strokeLinejoin='round'
            strokeLinecap='round'
            fill='rgba(255,255,255,0.04)'
        />
        <path d='M10.4 4.1 L11.9 5.6' stroke='rgba(255,255,255,0.88)' strokeWidth='1.1' strokeLinecap='round' />
    </svg>
)

const CheckIcon = () => (
    <svg
        width='13'
        height='13'
        viewBox='0 0 16 16'
        fill='none'
        style={{
            display: 'block',
            animation: 'wi-check-pop 320ms cubic-bezier(.2,1.4,.4,1) both',
        }}
    >
        <path
            d='M3.2 8.4 L6.4 11.6 L12.8 4.8'
            stroke='rgba(120, 220, 160, 1)'
            strokeWidth='1.6'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
    </svg>
)

const PulsingDots = () => (
    <span style={DOTS_WRAPPER} aria-hidden>
        {[0, 1, 2].map((i) => (
            <span
                key={i}
                style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.75)',
                    animation: 'wi-dot-pulse 1.3s ease-in-out infinite',
                    animationDelay: `${i * 140}ms`,
                }}
            />
        ))}
    </span>
)

export function WritingIndicatorWindow() {
    const [lang, setLang] = useState<string>('')
    const [done, setDone] = useState(false)
    // Start hidden: this window is pre-created at app startup and lives
    // forever, so the infinite pen/dots animations must NOT run until a
    // writing trigger actually shows the panel. Hidden WebView2 windows on
    // Windows keep compositing CSS animations at full frame rate, which
    // burned CPU from launch (#1883). The `writing-indicator-start` event
    // (or the pending-lang recovery poll below) flips this on.
    const [visible, setVisible] = useState(false)
    const fadeTimer = useRef<number | null>(null)

    useEffect(() => {
        ensureKeyframes()
        document.body.style.margin = '0'
        document.body.style.background = 'transparent'
        document.documentElement.style.background = 'transparent'
        document.documentElement.style.colorScheme = 'dark'
    }, [])

    useEffect(() => {
        let off1: UnlistenFn | undefined
        let off2: UnlistenFn | undefined

        const startWith = (l: string) => {
            if (fadeTimer.current) {
                window.clearTimeout(fadeTimer.current)
                fadeTimer.current = null
            }
            setLang(l)
            setDone(false)
            setVisible(true)
        }

        ;(async () => {
            off1 = await listen('writing-indicator-start', (e: Event<StartPayload>) => {
                // eslint-disable-next-line no-console
                console.log('[indicator] received writing-indicator-start', e.payload)
                startWith(e.payload?.targetLanguage ?? '')
            })
            off2 = await listen('writing-indicator-finish', () => {
                // eslint-disable-next-line no-console
                console.log('[indicator] received writing-indicator-finish')
                // Flash the check, then fade. Rust hides the OS window ~700ms
                // from emit, so we start the fade at 350ms — it completes
                // before the window disappears, giving a smooth exit instead
                // of a snap.
                setDone(true)
                fadeTimer.current = window.setTimeout(() => {
                    setVisible(false)
                    fadeTimer.current = null
                }, 350)
            })

            // Race recovery: poll for a pending show that may have been emitted
            // before the listener above was wired up.
            try {
                const pending = await commands.getWritingIndicatorPendingLang()
                if (pending) {
                    // eslint-disable-next-line no-console
                    console.log('[indicator] recovered pending start from backend:', pending)
                    startWith(pending)
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('[indicator] getWritingIndicatorPendingLang failed', err)
            }
        })()

        return () => {
            off1?.()
            off2?.()
            if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
        }
    }, [])

    const row: React.CSSProperties = {
        ...ROW_STYLE,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-2px)',
    }

    return (
        <div style={PANEL_STYLE}>
            <div style={row}>
                {/* Mount the infinitely-animating pen/dots only while the
                    panel is logically visible — otherwise they keep the
                    hidden WebView2 window compositing forever (#1883). The
                    check icon's animation is finite, so it may stay mounted
                    through the fade-out. */}
                <span style={ICON_WRAPPER}>{done ? <CheckIcon /> : visible ? <PenIcon /> : null}</span>
                <span style={LABEL_STYLE}>{done ? 'Done' : languageLabel(lang)}</span>
                {!done && visible && <PulsingDots />}
            </div>
        </div>
    )
}
