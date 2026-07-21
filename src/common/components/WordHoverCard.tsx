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
const CARD_WIDTH = 344
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
        'borderRadius': '4px',
        'cursor': 'pointer',
        'outline': 'none',
        'boxDecorationBreak': 'clone',
        'WebkitBoxDecorationBreak': 'clone',
        'transition': 'color 140ms ease, background 140ms ease, box-shadow 140ms ease',
        '&:hover, &:focus-visible': {
            color: props.theme.colors.accent,
            background: props.themeType === 'dark' ? 'rgba(255,255,255,0.075)' : 'rgba(0,0,0,0.045)',
            boxShadow: `0 0 0 2px ${props.themeType === 'dark' ? 'rgba(255,255,255,0.075)' : 'rgba(0,0,0,0.045)'}`,
        },
    }),
    'card': (props: IThemedStyleProps) => ({
        'position': 'fixed',
        'zIndex': 2147483647,
        'boxSizing': 'border-box',
        'width': `${CARD_WIDTH}px`,
        'maxWidth': `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
        'padding': '16px',
        'borderRadius': '16px',
        'color': props.theme.colors.contentPrimary,
        'background': props.themeType === 'dark' ? 'rgba(36, 36, 38, 0.96)' : 'rgba(255, 255, 255, 0.97)',
        'border': `1px solid ${props.themeType === 'dark' ? 'rgba(255,255,255,0.11)' : 'rgba(15,23,42,0.09)'}`,
        'boxShadow':
            props.themeType === 'dark'
                ? '0 20px 55px rgba(0,0,0,0.42), 0 2px 10px rgba(0,0,0,0.22)'
                : '0 20px 55px rgba(15,23,42,0.16), 0 2px 10px rgba(15,23,42,0.07)',
        'backdropFilter': 'blur(22px) saturate(1.15)',
        'WebkitBackdropFilter': 'blur(22px) saturate(1.15)',
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
        marginBottom: '13px',
    },
    'wordTitle': {
        overflow: 'hidden',
        color: 'inherit',
        fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
        fontSize: '23px',
        fontWeight: 650,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
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
        'width': '30px',
        'height': '30px',
        'marginLeft': 'auto',
        'padding': 0,
        'border': 'none',
        'borderRadius': '10px',
        'color': props.theme.colors.contentSecondary,
        'background': props.themeType === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.055)',
        'cursor': 'pointer',
        'transition': 'transform 140ms ease, background 140ms ease, color 140ms ease',
        '&:hover': {
            color: props.theme.colors.contentPrimary,
            background: props.themeType === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.09)',
            transform: 'translateY(-1px)',
        },
        '&:active': {
            transform: 'scale(0.94)',
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
        color: props.theme.colors.accent,
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.055em',
        textTransform: 'uppercase',
    }),
    'definition': {
        color: 'inherit',
    },
    'example': (props: IThemedStyleProps) => ({
        'position': 'relative',
        'margin': '7px 0 0',
        'paddingLeft': '12px',
        'color': props.theme.colors.contentSecondary,
        'fontFamily': 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
        'fontStyle': 'italic',
        '&::before': {
            position: 'absolute',
            top: 0,
            left: 0,
            color: props.theme.colors.contentTertiary,
            content: '"“"',
        },
    }),
    'footerButton': (props: IThemedStyleProps) => ({
        'display': 'flex',
        'alignItems': 'center',
        'width': '100%',
        'marginTop': '14px',
        'padding': '10px 11px',
        'border': 'none',
        'borderRadius': '11px',
        'color': props.theme.colors.contentPrimary,
        'background': props.themeType === 'dark' ? 'rgba(255,255,255,0.075)' : 'rgba(15,23,42,0.055)',
        'cursor': 'pointer',
        'fontSize': '12px',
        'fontWeight': 600,
        'textAlign': 'left',
        'transition': 'transform 140ms ease, background 140ms ease',
        '&:hover': {
            background: props.themeType === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.09)',
            transform: 'translateY(-1px)',
        },
        '&:active': {
            transform: 'scale(0.985)',
        },
        '& svg': {
            marginLeft: 'auto',
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
                <RxArrowRight size={14} />
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
