import {
    createContext,
    KeyboardEvent,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { createPortal } from 'react-dom'
import { createUseStyles } from 'react-jss'
import { RxArrowRight, RxExternalLink } from 'react-icons/rx'
import { useTranslation } from 'react-i18next'
import { IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useSettings } from '../hooks/useSettings'
import { lookupEnglishWord, WordLookupPreview } from '../services/wordLookup'
import { SpeakerIcon } from './SpeakerIcon'
import { SpinnerIcon } from './SpinnerIcon'

const ENGLISH_WORD_PATTERN = /[A-Za-z]+(?:[’'][A-Za-z]+)*(?:-[A-Za-z]+)*/g
const CARD_WIDTH = 320
const VIEWPORT_PADDING = 12

interface ActiveWord {
    word: string
    anchor: HTMLElement
}

interface WordHoverContextValue {
    enabled: boolean
    show: (word: string, anchor: HTMLElement, immediate?: boolean) => void
    scheduleHide: () => void
    keepOpen: () => void
    openDetails: (word: string) => void
}

const WordHoverContext = createContext<WordHoverContextValue | null>(null)

const useStyles = createUseStyles({
    'word': (props: IThemedStyleProps) => ({
        'borderRadius': '3px',
        'cursor': 'pointer',
        'outline': 'none',
        'boxDecorationBreak': 'clone',
        'WebkitBoxDecorationBreak': 'clone',
        'textDecoration': 'underline dotted transparent',
        'textDecorationThickness': '1px',
        'textUnderlineOffset': '3px',
        'transition': 'background 140ms ease, text-decoration-color 140ms ease',
        '&:hover, &:focus-visible': {
            background: props.themeType === 'dark' ? 'rgba(76, 132, 255, 0.16)' : 'rgba(39, 110, 241, 0.09)',
            textDecorationColor: props.themeType === 'dark' ? 'rgba(160, 191, 248, 0.7)' : 'rgba(39, 110, 241, 0.55)',
        },
    }),
    'card': (props: IThemedStyleProps) => ({
        'position': 'fixed',
        'zIndex': 2147483647,
        'boxSizing': 'border-box',
        'width': `${CARD_WIDTH}px`,
        'maxWidth': `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
        'padding': '14px',
        'borderRadius': '12px',
        'color': props.theme.colors.contentPrimary,
        'background': props.themeType === 'dark' ? 'rgba(36, 36, 38, 0.96)' : 'rgba(255, 255, 255, 0.97)',
        'border': `1px solid ${props.themeType === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.08)'}`,
        'boxShadow':
            props.themeType === 'dark'
                ? '0 8px 24px rgba(0,0,0,0.32), 0 1px 3px rgba(0,0,0,0.2)'
                : '0 8px 24px rgba(15,23,42,0.12), 0 1px 3px rgba(15,23,42,0.06)',
        'backdropFilter': 'blur(20px)',
        'WebkitBackdropFilter': 'blur(20px)',
        'transformOrigin': '50% 0',
        'animation': '$cardIn 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fontSize': '13px',
        'lineHeight': 1.45,
        '-ms-user-select': 'text',
        '-webkit-user-select': 'text',
        'userSelect': 'text',
        '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
        },
    }),
    'header': {
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        minWidth: 0,
        marginBottom: '10px',
    },
    'wordTitle': {
        overflow: 'hidden',
        color: 'inherit',
        fontSize: '17px',
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    'phonetic': (props: IThemedStyleProps) => ({
        overflow: 'hidden',
        color: props.theme.colors.contentTertiary,
        fontSize: '12px',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    }),
    'speakerButton': (props: IThemedStyleProps) => ({
        'display': 'flex',
        'flex': '0 0 auto',
        'alignItems': 'center',
        'justifyContent': 'center',
        'width': '28px',
        'height': '28px',
        'marginLeft': 'auto',
        'padding': 0,
        'border': 'none',
        'borderRadius': '8px',
        'color': props.theme.colors.contentSecondary,
        'background': 'none',
        'cursor': 'pointer',
        'transition': 'background 140ms ease, color 140ms ease',
        '&:hover': {
            color: props.theme.colors.contentPrimary,
            background: props.themeType === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
        },
    }),
    'meaning': (props: IThemedStyleProps) => ({
        '& + &': {
            marginTop: '11px',
            paddingTop: '11px',
            borderTop: `1px solid ${props.themeType === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.065)'}`,
        },
    }),
    'partOfSpeech': (props: IThemedStyleProps) => ({
        marginRight: '6px',
        color: props.themeType === 'dark' ? props.theme.colors.accent200 : props.theme.colors.accent,
        fontSize: '11px',
        fontStyle: 'italic',
        fontWeight: 500,
    }),
    'definition': {
        color: 'inherit',
    },
    'example': (props: IThemedStyleProps) => ({
        margin: '6px 0 0',
        color: props.theme.colors.contentTertiary,
        fontSize: '12px',
        fontStyle: 'italic',
    }),
    'footerButton': (props: IThemedStyleProps) => ({
        'display': 'inline-flex',
        'alignItems': 'center',
        'gap': '4px',
        'marginTop': '12px',
        'padding': 0,
        'border': 'none',
        'background': 'none',
        'color': props.themeType === 'dark' ? props.theme.colors.accent200 : props.theme.colors.accent,
        'cursor': 'pointer',
        'fontFamily': 'inherit',
        'fontSize': '12px',
        'fontWeight': 500,
        'textUnderlineOffset': '3px',
        '&:hover': {
            textDecoration: 'underline',
        },
    }),
    'sourceLink': (props: IThemedStyleProps) => ({
        'display': 'inline-flex',
        'alignItems': 'center',
        'gap': '3px',
        'marginTop': '9px',
        'color': props.theme.colors.contentTertiary,
        'fontSize': '10px',
        'textDecoration': 'none',
        '&:hover': {
            color: props.theme.colors.contentSecondary,
        },
    }),
    'status': (props: IThemedStyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '72px',
        color: props.theme.colors.contentTertiary,
        textAlign: 'center',
    }),
    '@keyframes cardIn': {
        from: {
            opacity: 0,
            transform: 'translateY(-4px) scale(0.975)',
        },
        to: {
            opacity: 1,
            transform: 'translateY(0) scale(1)',
        },
    },
})

export interface WordHoverProviderProps {
    children: ReactNode
    enabled?: boolean
    onOpenDetails: (word: string) => void
}

export function WordHoverProvider({ children, enabled = true, onOpenDetails }: WordHoverProviderProps) {
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const { settings } = useSettings()
    const styles = useStyles({ theme, themeType })
    const [activeWord, setActiveWord] = useState<ActiveWord | null>(null)
    const [preview, setPreview] = useState<WordLookupPreview | null>(null)
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
    const [position, setPosition] = useState({ left: VIEWPORT_PADDING, top: VIEWPORT_PADDING })
    const cardRef = useRef<HTMLDivElement>(null)
    const showTimerRef = useRef<ReturnType<typeof setTimeout>>()
    const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()

    const clearTimers = useCallback(() => {
        clearTimeout(showTimerRef.current)
        clearTimeout(hideTimerRef.current)
    }, [])

    const keepOpen = useCallback(() => {
        clearTimeout(hideTimerRef.current)
    }, [])

    const scheduleHide = useCallback(() => {
        clearTimeout(showTimerRef.current)
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = setTimeout(() => setActiveWord(null), 130)
    }, [])

    const show = useCallback(
        (word: string, anchor: HTMLElement, immediate = false) => {
            if (!enabled) return
            clearTimers()
            setActiveWord((currentWord) => (currentWord?.word === word ? currentWord : null))
            showTimerRef.current = setTimeout(
                () => {
                    setPreview(null)
                    setStatus('loading')
                    setActiveWord({ word, anchor })
                },
                immediate ? 0 : 220
            )
        },
        [clearTimers, enabled]
    )

    const openDetails = useCallback(
        (word: string) => {
            clearTimers()
            setActiveWord(null)
            onOpenDetails(word)
        },
        [clearTimers, onOpenDetails]
    )

    useEffect(() => clearTimers, [clearTimers])

    useEffect(() => {
        if (!enabled) {
            setActiveWord(null)
        }
    }, [enabled])

    useEffect(() => {
        if (!activeWord) return
        const controller = new AbortController()
        setPreview(null)
        setStatus('loading')
        lookupEnglishWord(activeWord.word, controller.signal)
            .then((result) => {
                setPreview(result)
                setStatus(result ? 'ready' : 'empty')
            })
            .catch((error) => {
                if ((error as Error).name !== 'AbortError') {
                    setStatus('error')
                }
            })
        return () => controller.abort()
    }, [activeWord])

    useLayoutEffect(() => {
        if (!activeWord || !cardRef.current) return
        const anchorRect = activeWord.anchor.getBoundingClientRect()
        const cardRect = cardRef.current.getBoundingClientRect()
        const left = Math.min(
            Math.max(anchorRect.left + anchorRect.width / 2 - cardRect.width / 2, VIEWPORT_PADDING),
            window.innerWidth - cardRect.width - VIEWPORT_PADDING
        )
        const spaceBelow = window.innerHeight - anchorRect.bottom
        const top =
            spaceBelow >= cardRect.height + VIEWPORT_PADDING
                ? anchorRect.bottom + 9
                : Math.max(VIEWPORT_PADDING, anchorRect.top - cardRect.height - 9)
        setPosition({ left, top })
    }, [activeWord, preview, status])

    useEffect(() => {
        if (!activeWord) return
        const hide = () => setActiveWord(null)
        const onKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') hide()
        }
        window.addEventListener('resize', hide)
        window.addEventListener('scroll', hide, true)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('resize', hide)
            window.removeEventListener('scroll', hide, true)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [activeWord])

    const contextValue = useMemo(
        () => ({ enabled, show, scheduleHide, keepOpen, openDetails }),
        [enabled, keepOpen, openDetails, scheduleHide, show]
    )

    const card = activeWord ? (
        <div
            ref={cardRef}
            className={styles.card}
            style={position}
            role='dialog'
            aria-label={t('Definition of {{word}}', { word: activeWord.word })}
            onMouseEnter={keepOpen}
            onMouseLeave={scheduleHide}
        >
            <div className={styles.header}>
                <div style={{ minWidth: 0 }}>
                    <div className={styles.wordTitle}>{preview?.word ?? activeWord.word}</div>
                    {preview?.phonetic ? <div className={styles.phonetic}>{preview.phonetic}</div> : null}
                </div>
                <button type='button' className={styles.speakerButton} title={t('Speak')} aria-label={t('Speak')}>
                    <SpeakerIcon
                        size={15}
                        provider={settings.tts?.provider}
                        text={activeWord.word}
                        lang='en'
                        voice={settings.tts?.voices?.find((item) => item.lang === 'en')?.voice}
                        rate={settings.tts?.rate}
                        volume={settings.tts?.volume}
                    />
                </button>
            </div>
            {status === 'loading' ? (
                <div className={styles.status}>
                    <SpinnerIcon size={18} />
                </div>
            ) : status === 'ready' && preview ? (
                <div>
                    {preview.meanings.map((meaning, index) => (
                        <div className={styles.meaning} key={`${meaning.partOfSpeech}-${index}`}>
                            {meaning.partOfSpeech ? (
                                <span className={styles.partOfSpeech}>{meaning.partOfSpeech}</span>
                            ) : null}
                            <span className={styles.definition}>{meaning.definition}</span>
                            {meaning.example ? <p className={styles.example}>{meaning.example}</p> : null}
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.status}>
                    {status === 'error' ? t('Preview unavailable') : t('No concise definition found')}
                </div>
            )}
            <button type='button' className={styles.footerButton} onClick={() => openDetails(activeWord.word)}>
                {t('Open full definition')}
                <RxArrowRight size={13} />
            </button>
            {preview?.sourceUrl ? (
                <a
                    className={styles.sourceLink}
                    href={preview.sourceUrl}
                    target='_blank'
                    rel='noreferrer'
                    onClick={(event) => event.stopPropagation()}
                >
                    {t('Source: Wiktionary')}
                    <RxExternalLink size={9} />
                </a>
            ) : null}
        </div>
    ) : null
    const rootNode = activeWord?.anchor.getRootNode()
    const portalContainer =
        rootNode?.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? (rootNode as DocumentFragment) : document.body

    return (
        <WordHoverContext.Provider value={contextValue}>
            {children}
            {card ? createPortal(card, portalContainer) : null}
        </WordHoverContext.Provider>
    )
}

export function HoverableText({ children }: { children: string }) {
    const context = useContext(WordHoverContext)
    const { theme, themeType } = useTheme()
    const styles = useStyles({ theme, themeType })

    if (!context?.enabled) {
        return <>{children}</>
    }

    const parts: ReactNode[] = []
    let lastIndex = 0
    for (const match of children.matchAll(ENGLISH_WORD_PATTERN)) {
        const index = match.index ?? 0
        const word = match[0]
        if (index > lastIndex) {
            parts.push(children.slice(lastIndex, index))
        }
        const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                context.openDetails(word)
            }
        }
        parts.push(
            <span
                className={styles.word}
                key={`${index}-${word}`}
                role='link'
                tabIndex={0}
                onMouseEnter={(event) => context.show(word, event.currentTarget)}
                onMouseLeave={context.scheduleHide}
                onFocus={(event) => context.show(word, event.currentTarget, true)}
                onBlur={context.scheduleHide}
                onClick={() => context.openDetails(word)}
                onKeyDown={handleKeyDown}
            >
                {word}
            </span>
        )
        lastIndex = index + word.length
    }
    if (lastIndex < children.length) {
        parts.push(children.slice(lastIndex))
    }
    return <>{parts}</>
}
