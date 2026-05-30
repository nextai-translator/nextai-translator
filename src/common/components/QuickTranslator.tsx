import { useCallback, useEffect, useRef, useState } from 'react'
import { createUseStyles } from 'react-jss'
import { useTranslation } from 'react-i18next'
import { RxCross2 } from 'react-icons/rx'
import { IThemedStyleProps } from '../types'
import { useTheme } from '../hooks/useTheme'
import { useSettings } from '../hooks/useSettings'
import { getEngine } from '../engines'
import { translate } from '../translate'
import { detectLang, LangCode } from '../lang'
import { actionInternalService } from '../internal-services/action'
import { historyInternalService } from '../internal-services/history'
import { Markdown } from './Markdown'
import { SpinnerIcon } from './SpinnerIcon'

export interface AxContext {
    focusedText: string
    focusedRole: string
    selectedText: string
    hoveredText: string
    hoveredRole: string
    appName: string
    appBundleId: string
    mouseX: number
    mouseY: number
    paragraphs: string[]
    truncated: boolean
}

export type CandidateType = 'word' | 'phrase' | 'sentence'

export interface Candidate {
    text: string
    type: CandidateType
    reason: string
}

export interface QuickTranslatorProps {
    fetchContext: (wide: boolean) => Promise<AxContext>
    onClose: () => void
    onHide: () => void
}

const hairline = (themeType: string) => (themeType === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)')
const subtleSurface = (themeType: string) => (themeType === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
const hoverSurface = (themeType: string) => (themeType === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
const activeFill = (themeType: string) => (themeType === 'dark' ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.08)')

const useStyles = createUseStyles({
    'container': () => ({
        'display': 'flex',
        'flexDirection': 'column',
        'height': '100vh',
        'background': 'transparent',
        'fontSize': '13px',
        'lineHeight': 1.5,
        'letterSpacing': '-0.005em',
        'WebkitFontSmoothing': 'antialiased',
        'MozOsxFontSmoothing': 'grayscale',
        'textRendering': 'optimizeLegibility',
        'overflow': 'hidden',
        'animation': '$panelIn 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        '& ::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
        },
        '& ::-webkit-scrollbar-thumb': {
            'borderRadius': '3px',
            'background': 'rgba(128,128,128,0.18)',
            '&:hover': { background: 'rgba(128,128,128,0.32)' },
        },
    }),
    '@keyframes panelIn': {
        '0%': { opacity: 0, transform: 'translateY(6px) scale(0.985)' },
        '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
    },
    'header': (props: IThemedStyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '11px 14px 9px',
        flexShrink: 0,
        userSelect: 'none',
        color: props.theme.colors.contentSecondary,
    }),
    'brand': (props: IThemedStyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: 0,
        color: props.theme.colors.contentSecondary,
    }),
    'dot': () => ({
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #ff8a4c 0%, #c14fcb 60%, #5d6cff 100%)',
        boxShadow: '0 0 8px rgba(125,90,255,0.35)',
        flexShrink: 0,
    }),
    'title': (props: IThemedStyleProps) => ({
        fontSize: '10.5px',
        fontWeight: 600,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: props.theme.colors.contentSecondary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    }),
    'titleSeparator': () => ({
        opacity: 0.4,
        margin: '0 2px',
    }),
    'titleHost': (props: IThemedStyleProps) => ({
        textTransform: 'none',
        letterSpacing: 0,
        fontSize: '11px',
        fontWeight: 500,
        color: props.theme.colors.contentTertiary,
    }),
    'closeBtn': (props: IThemedStyleProps) => ({
        'display': 'flex',
        'alignItems': 'center',
        'justifyContent': 'center',
        'width': '22px',
        'height': '22px',
        'borderRadius': '11px',
        'cursor': 'pointer',
        'opacity': 0.55,
        'color': props.theme.colors.contentSecondary,
        'border': 'none',
        'background': 'transparent',
        'transition': 'opacity 0.15s ease, background 0.15s ease, transform 0.15s ease',
        '&:hover': {
            opacity: 1,
            background: hoverSurface(props.themeType ?? 'light'),
            transform: 'scale(1.05)',
        },
        '&:active': {
            transform: 'scale(0.95)',
        },
    }),
    'candidatesArea': () => ({
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '0 14px 12px',
        flexShrink: 0,
    }),
    'candidatesEmpty': (props: IThemedStyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 0',
        fontSize: '12px',
        color: props.theme.colors.contentTertiary,
    }),
    'chip': (props: IThemedStyleProps) => ({
        'display': 'inline-flex',
        'alignItems': 'baseline',
        'gap': '6px',
        'padding': '5px 10px 5px 8px',
        'borderRadius': '999px',
        'border': `1px solid ${hairline(props.themeType ?? 'light')}`,
        'background': subtleSurface(props.themeType ?? 'light'),
        'color': props.theme.colors.contentPrimary,
        'cursor': 'pointer',
        'fontSize': '12.5px',
        'fontWeight': 500,
        'lineHeight': 1.25,
        'transition': 'background 0.12s ease, border-color 0.12s ease, transform 0.1s ease',
        'maxWidth': '100%',
        '&:hover': {
            background: hoverSurface(props.themeType ?? 'light'),
        },
        '&:active': {
            transform: 'scale(0.98)',
        },
    }),
    'chipActive': (props: IThemedStyleProps) => ({
        background: activeFill(props.themeType ?? 'light'),
        borderColor: props.themeType === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)',
        color: props.theme.colors.contentPrimary,
        boxShadow:
            props.themeType === 'dark'
                ? '0 0 0 1px rgba(255,255,255,0.04) inset'
                : '0 0 0 1px rgba(255,255,255,0.7) inset',
    }),
    'chipKind': (props: IThemedStyleProps) => ({
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: props.theme.colors.contentTertiary,
        fontWeight: 600,
        transform: 'translateY(-1px)',
    }),
    'chipText': () => ({
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '320px',
    }),
    'divider': (props: IThemedStyleProps) => ({
        height: '1px',
        background: hairline(props.themeType ?? 'light'),
        marginInline: '14px',
        flexShrink: 0,
    }),
    'translationArea': (props: IThemedStyleProps) => ({
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px 12px',
        color: props.theme.colors.contentPrimary,
        fontSize: '14px',
        lineHeight: 1.65,
        userSelect: 'text',
    }),
    'translationPlaceholder': (props: IThemedStyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: props.theme.colors.contentTertiary,
        fontSize: '12.5px',
    }),
    'errorMsg': (props: IThemedStyleProps) => ({
        color: props.theme.colors.contentNegative ?? '#d44',
        fontSize: '12.5px',
    }),
    'footer': (props: IThemedStyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '8px 14px 10px',
        fontSize: '11px',
        color: props.theme.colors.contentTertiary,
        flexShrink: 0,
        userSelect: 'none',
    }),
    'footerHint': () => ({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        opacity: 0.85,
    }),
    'kbd': (props: IThemedStyleProps) => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '16px',
        height: '16px',
        padding: '0 4px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        border: `1px solid ${hairline(props.themeType ?? 'light')}`,
        background: subtleSurface(props.themeType ?? 'light'),
        color: props.theme.colors.contentSecondary,
    }),
    'actionBtn': (props: IThemedStyleProps) => ({
        'border': 'none',
        'background': 'transparent',
        'cursor': 'pointer',
        'color': props.theme.colors.contentSecondary,
        'fontSize': '11px',
        'padding': '3px 8px',
        'borderRadius': '6px',
        'transition': 'background 0.12s ease, color 0.12s ease',
        '&:hover': {
            background: hoverSurface(props.themeType ?? 'light'),
            color: props.theme.colors.contentPrimary,
        },
        '&:disabled': {
            opacity: 0.35,
            cursor: 'default',
            background: 'transparent',
        },
    }),
    'caret': () => ({
        display: 'inline-block',
        width: '0.45em',
        marginLeft: '2px',
        borderRight: '0.16em solid currentColor',
        animation: '$caret 700ms ease-in-out infinite',
    }),
    '@keyframes caret': {
        '0%, 100%': { borderColor: 'currentColor' },
        '50%': { borderColor: 'transparent' },
    },
})

function clipText(text: string, max = 180): string {
    if (!text) return ''
    const flat = text.replace(/\s+/g, ' ').trim()
    return flat.length > max ? flat.slice(0, max) + '…' : flat
}

function summarizeContext(ctx: AxContext): string {
    const parts: string[] = []
    if (ctx.selectedText.trim()) parts.push(`USER_SELECTED: "${clipText(ctx.selectedText, 200)}"`)
    if (ctx.hoveredText.trim()) parts.push(`UNDER_CURSOR: "${clipText(ctx.hoveredText, 220)}"`)
    if (ctx.focusedText.trim()) parts.push(`FOCUSED_ELEMENT: "${clipText(ctx.focusedText, 600)}"`)
    if (ctx.paragraphs.length) {
        const joined = ctx.paragraphs.map((p) => clipText(p, 280)).join('\n')
        parts.push(`WINDOW_PARAGRAPHS:\n${joined}`)
    }
    if (ctx.appName) parts.push(`APP: ${ctx.appName}${ctx.appBundleId ? ` (${ctx.appBundleId})` : ''}`)
    return parts.join('\n\n')
}

function summarizeHistory(items: Array<{ text: string; createdAt: number }>): string {
    if (!items.length) return 'No prior lookups recorded.'
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    const buckets = { week: 0, month: 0, quarter: 0, older: 0 }
    const lengths: number[] = []
    const recent: string[] = []
    for (const item of items) {
        const age = now - item.createdAt
        if (age < 7 * day) buckets.week += 1
        else if (age < 30 * day) buckets.month += 1
        else if (age < 90 * day) buckets.quarter += 1
        else buckets.older += 1
        lengths.push(item.text.trim().split(/\s+/).length)
        if (recent.length < 25) recent.push(item.text.trim())
    }
    const avgLen = lengths.length ? Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10 : 0
    const longish = items
        .filter((i) => i.text.trim().split(/\s+/).length >= 3)
        .slice(0, 8)
        .map((i) => i.text.trim())
    return [
        `Recent counts — 7d:${buckets.week}, 30d:${buckets.month}, 90d:${buckets.quarter}, older:${buckets.older}.`,
        `Average lookup length: ${avgLen} words.`,
        recent.length ? `Sample recent lookups: ${recent.slice(0, 12).join('; ')}` : '',
        longish.length ? `Sample multi-word lookups: ${longish.join('; ')}` : '',
    ]
        .filter(Boolean)
        .join('\n')
}

function buildPickerPrompts(ctx: AxContext, historyHint: string, targetLang: string) {
    const role = `You assist an English learner. The user can read but sometimes wants to look up a word, phrase, or sentence that appears in the screen reader text in front of them. Their typical lookup history reveals their level. Pick at most 4 candidates that they are most likely to want translated next. Prefer the rarest/most novel content over common words they would already know.

Target language for translation is ${targetLang}.

Output format — exactly one candidate per line, no preamble, no JSON, no markdown:
TYPE :: TEXT :: REASON
Where TYPE is one of word, phrase, sentence. TEXT is the exact span as it appears on screen (do not paraphrase). REASON is one short clause explaining why this candidate matters to this user.

Order candidates from most likely to least likely. Output 1–4 lines.`

    const userCtx = summarizeContext(ctx)
    const command = `User lookup history fingerprint:\n${historyHint}\n\nScreen context:\n${userCtx}\n\nReturn candidates now.`
    return { rolePrompt: role, commandPrompt: command }
}

function parseCandidates(stream: string): Candidate[] {
    const out: Candidate[] = []
    const lines = stream.split('\n')
    for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue
        const m = line.match(/^([0-9]+[).\s]+)?(word|phrase|sentence)\s*::\s*(.+?)\s*::\s*(.+)$/i)
        if (!m) continue
        const type = m[2].toLowerCase() as CandidateType
        const text = m[3].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
        const reason = m[4].trim()
        if (text && reason) out.push({ text, type, reason })
    }
    return out
}

export function QuickTranslator({ fetchContext, onClose, onHide }: QuickTranslatorProps) {
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const { settings } = useSettings()
    const styles = useStyles({ theme, themeType })

    const [ctx, setCtx] = useState<AxContext | null>(null)
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [pickerLoading, setPickerLoading] = useState(false)
    const [pickerError, setPickerError] = useState('')
    const [translation, setTranslation] = useState('')
    const [translating, setTranslating] = useState(false)
    const [translateError, setTranslateError] = useState('')
    const [wideUsed, setWideUsed] = useState(false)

    const pickerAbortRef = useRef<AbortController | null>(null)
    const translateAbortRef = useRef<AbortController | null>(null)

    const targetLang = settings.defaultTargetLanguage || 'en'

    const runPicker = useCallback(
        async (wide: boolean) => {
            pickerAbortRef.current?.abort()
            translateAbortRef.current?.abort()
            const controller = new AbortController()
            pickerAbortRef.current = controller

            setPickerLoading(true)
            setPickerError('')
            setCandidates([])
            setTranslation('')
            setTranslateError('')
            setActiveIndex(0)

            try {
                const [context, history] = await Promise.all([
                    fetchContext(wide),
                    historyInternalService.list({ limit: 200 }),
                ])
                if (controller.signal.aborted) return
                setCtx(context)
                const hasContext =
                    context.focusedText.trim() ||
                    context.hoveredText.trim() ||
                    context.selectedText.trim() ||
                    context.paragraphs.length
                if (!hasContext) {
                    setPickerLoading(false)
                    setPickerError(t('Unable to read text from the foreground app.'))
                    return
                }
                const historyHint = summarizeHistory(history.map((h) => ({ text: h.text, createdAt: h.createdAt })))
                const { rolePrompt, commandPrompt } = buildPickerPrompts(context, historyHint, targetLang)
                const engine = getEngine(settings.provider)
                let buffer = ''
                let parsed: Candidate[] = []
                let triggeredTranslate = false
                await engine.sendMessage({
                    rolePrompt,
                    commandPrompt,
                    signal: controller.signal,
                    onMessage: async (msg) => {
                        if (controller.signal.aborted) return
                        if (msg.isFullText) {
                            buffer = msg.content
                        } else {
                            buffer += msg.content
                        }
                        const next = parseCandidates(buffer)
                        if (next.length !== parsed.length) {
                            parsed = next
                            setCandidates(next)
                            if (!triggeredTranslate && next.length > 0) {
                                triggeredTranslate = true
                                runTranslateRef.current?.(next[0])
                            }
                        }
                    },
                    onError: (err) => {
                        if (controller.signal.aborted) return
                        setPickerError(err)
                        setPickerLoading(false)
                    },
                    onFinished: () => {
                        if (controller.signal.aborted) return
                        setPickerLoading(false)
                        const finalCandidates = parseCandidates(buffer)
                        if (finalCandidates.length === 0) {
                            setPickerError(t('Could not extract candidates from the screen text.'))
                        }
                    },
                })
            } catch (err) {
                if (controller.signal.aborted) return
                setPickerError(err instanceof Error ? err.message : String(err))
                setPickerLoading(false)
            }
        },
        [fetchContext, settings.provider, targetLang, t]
    )

    const runTranslate = useCallback(
        async (candidate: Candidate) => {
            translateAbortRef.current?.abort()
            const controller = new AbortController()
            translateAbortRef.current = controller
            setTranslating(true)
            setTranslateError('')
            setTranslation('')

            try {
                const action = await actionInternalService.getByMode('translate')
                if (!action) {
                    setTranslating(false)
                    setTranslateError(t('No translate action found.'))
                    return
                }
                const sourceLang = await detectLang(candidate.text)
                await translate({
                    text: candidate.text,
                    detectFrom: sourceLang,
                    detectTo: targetLang as LangCode,
                    mode: 'translate',
                    action,
                    signal: controller.signal,
                    onMessage: async (msg) => {
                        if (controller.signal.aborted) return
                        if (msg.role) return
                        setTranslation((prev) => (msg.isFullText ? msg.content : prev + msg.content))
                    },
                    onError: (err) => {
                        if (controller.signal.aborted) return
                        setTranslateError(err)
                        setTranslating(false)
                    },
                    onFinish: () => {
                        if (controller.signal.aborted) return
                        setTranslating(false)
                    },
                })
            } catch (err) {
                if (controller.signal.aborted) return
                setTranslateError(err instanceof Error ? err.message : String(err))
                setTranslating(false)
            }
        },
        [targetLang, t]
    )

    const runTranslateRef = useRef(runTranslate)
    useEffect(() => {
        runTranslateRef.current = runTranslate
    }, [runTranslate])

    useEffect(() => {
        runPicker(false)
        return () => {
            pickerAbortRef.current?.abort()
            translateAbortRef.current?.abort()
        }
    }, [runPicker])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onHide()
            }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onHide])

    const onSelectCandidate = useCallback(
        (index: number) => {
            setActiveIndex(index)
            const c = candidates[index]
            if (c) runTranslate(c)
        },
        [candidates, runTranslate]
    )

    const onExpandContext = useCallback(() => {
        setWideUsed(true)
        runPicker(true)
    }, [runPicker])

    const hostLabel = ctx?.appName ?? ''

    const activeCandidate = candidates[activeIndex]

    return (
        <div className={styles.container}>
            <div className={styles.header} data-tauri-drag-region>
                <div className={styles.brand}>
                    <span className={styles.dot} />
                    <span className={styles.title}>{t('Quick Translator')}</span>
                    {hostLabel && (
                        <>
                            <span className={styles.titleSeparator}>·</span>
                            <span className={styles.titleHost} title={hostLabel}>
                                {hostLabel}
                            </span>
                        </>
                    )}
                </div>
                <button className={styles.closeBtn} onClick={onClose} title={t('Close')}>
                    <RxCross2 size={13} />
                </button>
            </div>
            <div className={styles.candidatesArea}>
                {pickerLoading && candidates.length === 0 && (
                    <div className={styles.candidatesEmpty}>
                        <SpinnerIcon size={12} />
                        <span>{t('Detecting what you are reading…')}</span>
                    </div>
                )}
                {!pickerLoading && pickerError && candidates.length === 0 && (
                    <div className={styles.candidatesEmpty}>
                        <span>{pickerError}</span>
                    </div>
                )}
                {candidates.map((c, idx) => (
                    <button
                        key={`${c.text}-${idx}`}
                        className={`${styles.chip} ${idx === activeIndex ? styles.chipActive : ''}`}
                        onClick={() => onSelectCandidate(idx)}
                        title={c.reason}
                    >
                        <span className={styles.chipKind}>{c.type}</span>
                        <span className={styles.chipText}>{c.text}</span>
                    </button>
                ))}
            </div>
            {(candidates.length > 0 || translating || translation || translateError) && (
                <div className={styles.divider} />
            )}
            <div className={styles.translationArea} style={{ fontSize: settings.fontSize }}>
                {translateError && <div className={styles.errorMsg}>{translateError}</div>}
                {!translation && translating && (
                    <div className={styles.translationPlaceholder}>
                        <SpinnerIcon size={12} />
                        <span>
                            {activeCandidate
                                ? t('Translating “{{text}}”…', { text: activeCandidate.text })
                                : t('Translating…')}
                        </span>
                    </div>
                )}
                {translation && (
                    <div>
                        <Markdown>{translation}</Markdown>
                        {translating && <span className={styles.caret} />}
                    </div>
                )}
            </div>
            <div className={styles.footer}>
                <div className={styles.footerHint}>
                    <span className={styles.kbd}>esc</span>
                    <span>{t('close')}</span>
                    {ctx?.truncated && (
                        <>
                            <span style={{ opacity: 0.4, margin: '0 4px' }}>·</span>
                            <span>{t('context truncated')}</span>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                    <button className={styles.actionBtn} onClick={onExpandContext} disabled={pickerLoading || wideUsed}>
                        {wideUsed ? t('wider context') : t('use wider context')}
                    </button>
                    <button className={styles.actionBtn} onClick={() => runPicker(wideUsed)} disabled={pickerLoading}>
                        {t('re-detect')}
                    </button>
                </div>
            </div>
        </div>
    )
}
