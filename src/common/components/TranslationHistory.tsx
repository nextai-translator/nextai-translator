import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal, ModalBody, ModalHeader } from 'baseui-sd/modal'
import { Input } from 'baseui-sd/input'
import { Select, Value, Option } from 'baseui-sd/select'
import { Button } from 'baseui-sd/button'
import { Checkbox } from 'baseui-sd/checkbox'
import { createUseStyles } from 'react-jss'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../hooks/useTheme'
import { HistoryItem, Action } from '../internal-services/db'
import { historyService } from '../services/history'
import { useLiveQuery } from 'dexie-react-hooks'
import { Tooltip } from './Tooltip'
import { LuStar, LuStarOff } from 'react-icons/lu'
import { RxTrash, RxCopy } from 'react-icons/rx'
import { MdReplay } from 'react-icons/md'
import color from 'color'
import toast from 'react-hot-toast/headless'

interface TranslationHistoryProps {
    isOpen: boolean
    actions: Action[]
    activeActionId?: number
    onClose: () => void
    onRestore: (item: HistoryItem) => void
}

const useStyles = createUseStyles({
    body: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxHeight: '70vh',
        width: 'min(720px, 90vw)',
    },
    controls: {
        display: 'grid',
        gridTemplateColumns: '1fr 220px auto',
        gap: '12px',
        alignItems: 'center',
    },
    historyList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
        paddingRight: '4px',
    },
    historyItem: {
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    historyMeta: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        gap: '8px',
        flexWrap: 'wrap',
    },
    historyText: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    historyTextLabel: {
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 600,
    },
    historyTextBlock: {
        fontSize: '14px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    historyActions: {
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    divider: {
        height: '1px',
        opacity: 0.4,
        borderRadius: '1px',
    },
    empty: {
        fontSize: '14px',
        textAlign: 'center',
        padding: '32px 0',
    },
})

const ALL_ACTIONS_OPTION_ID = '__all__'

function useActionOptions(actions: Action[], t: (key: string) => string): Option[] {
    return useMemo(() => {
        const base: Option = {
            id: ALL_ACTIONS_OPTION_ID,
            label: t('All Actions'),
        }
        return [
            base,
            ...actions.map((action) => ({
                id: action.id ?? action.mode ?? '',
                label: action.mode ? t(action.name) : action.name,
                data: action,
            })),
        ]
    }, [actions, t])
}

export function TranslationHistory(props: TranslationHistoryProps) {
    const { isOpen, onClose, actions, activeActionId, onRestore } = props
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const styles = useStyles()
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [search, setSearch] = useState('')
    const [favoritesOnly, setFavoritesOnly] = useState(false)
    const actionsOptions = useActionOptions(actions, t)
    const [selectedAction, setSelectedAction] = useState<Value>([actionsOptions[0]])

    useEffect(() => {
        if (!isOpen) {
            return
        }
        const timer = window.setTimeout(() => {
            searchInputRef.current?.focus()
        }, 120)
        return () => {
            window.clearTimeout(timer)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) {
            setSearch('')
            setFavoritesOnly(false)
            setSelectedAction([actionsOptions[0]])
        }
    }, [isOpen, actionsOptions])

    const historyItems = useLiveQuery(
        () =>
            historyService.list({
                search,
                favoritesOnly,
                limit: 200,
                actionId:
                    selectedAction[0]?.id === ALL_ACTIONS_OPTION_ID
                        ? undefined
                        : typeof selectedAction[0]?.data?.id === 'number'
                        ? selectedAction[0]?.data?.id
                        : undefined,
                actionMode: selectedAction[0]?.id === ALL_ACTIONS_OPTION_ID ? undefined : selectedAction[0]?.data?.mode,
            }),
        [search, favoritesOnly, selectedAction],
        []
    )

    const handleRestore = useCallback(
        async (item: HistoryItem) => {
            onRestore(item)
            if (item.id !== undefined) {
                await historyService.touch(item.id)
            }
        },
        [onRestore]
    )

    const onToggleFavorite = async (item: HistoryItem) => {
        if (item.id === undefined) {
            return
        }
        await historyService.updateFavorite(item.id, !item.favorite)
    }

    const onDelete = async (item: HistoryItem) => {
        if (item.id === undefined) {
            return
        }
        await historyService.delete(item.id)
    }

    const onClear = async () => {
        if (!historyItems?.length) {
            return
        }
        const confirmed = window.confirm(t('Clear All History?'))
        if (!confirmed) {
            return
        }
        await historyService.clear()
    }

    const formatTimestamp = (timestamp: number) => {
        try {
            return new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(new Date(timestamp))
        } catch {
            return new Date(timestamp).toLocaleString()
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            closeable
            animate
            size='default'
            overrides={{
                Dialog: {
                    style: {
                        width: 'auto',
                    },
                },
            }}
        >
            <ModalHeader>
                {t('History')}
                {historyItems?.length ? ` (${historyItems.length})` : ''}
            </ModalHeader>
            <ModalBody>
                <div className={styles.body}>
                    <div className={styles.controls}>
                        <Input
                            inputRef={searchInputRef}
                            value={search}
                            clearable
                            placeholder={t('Search History')}
                            size='compact'
                            onChange={(e) => setSearch(e.currentTarget.value)}
                            onClear={() => setSearch('')}
                        />
                        <Select
                            size='compact'
                            clearable={false}
                            options={actionsOptions}
                            value={selectedAction}
                            onChange={({ value }) => {
                                setSelectedAction(value)
                            }}
                        />
                        <Checkbox
                            checked={favoritesOnly}
                            onChange={(event) => setFavoritesOnly(event.currentTarget.checked)}
                        >
                            {t('Favorites Only')}
                        </Checkbox>
                    </div>
                    <div className={styles.historyList}>
                        {historyItems && historyItems.length > 0 ? (
                            historyItems.map((item) => {
                                const matchedAction =
                                    actions.find((action) => action.id === item.actionId) ??
                                    actions.find((action) => action.mode && action.mode === item.actionMode)
                                const isActive = activeActionId !== undefined && matchedAction?.id === activeActionId
                                const borderColor = isActive ? theme.colors.accent : theme.colors.borderOpaque
                                const backgroundColor =
                                    themeType === 'dark'
                                        ? color(theme.colors.backgroundPrimary)
                                              .lighten(isActive ? 0.3 : 0.15)
                                              .alpha(0.85)
                                              .string()
                                        : color(theme.colors.backgroundSecondary)
                                              .lighten(isActive ? 0.05 : 0)
                                              .alpha(isActive ? 1 : 0.9)
                                              .string()
                                return (
                                    <div
                                        key={item.id}
                                        className={styles.historyItem}
                                        style={{
                                            border: `1px solid ${borderColor}`,
                                            background: backgroundColor,
                                            cursor: 'pointer',
                                        }}
                                        role='button'
                                        tabIndex={0}
                                        onClick={() => {
                                            void handleRestore(item)
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault()
                                                void handleRestore(item)
                                            }
                                        }}
                                    >
                                        <div
                                            className={styles.historyMeta}
                                            style={{ color: theme.colors.contentSecondary }}
                                        >
                                            <div>
                                                {formatTimestamp(item.updatedAt)}
                                                {' · '}
                                                {item.sourceLang} → {item.targetLang}
                                                {matchedAction
                                                    ? ` · ${
                                                          matchedAction.mode
                                                              ? t(matchedAction.name)
                                                              : matchedAction.name
                                                      }`
                                                    : ''}
                                            </div>
                                            <div className={styles.historyActions}>
                                                <Tooltip
                                                    content={item.favorite ? t('Unfavorite') : t('Favorite')}
                                                    placement='bottom'
                                                >
                                                    <Button
                                                        size='mini'
                                                        kind='tertiary'
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            void onToggleFavorite(item)
                                                        }}
                                                        overrides={{
                                                            BaseButton: {
                                                                style: { paddingLeft: '6px', paddingRight: '6px' },
                                                            },
                                                        }}
                                                    >
                                                        {item.favorite ? <LuStar size={16} /> : <LuStarOff size={16} />}
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t('Reuse')} placement='bottom'>
                                                    <Button
                                                        size='mini'
                                                        kind='tertiary'
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            void handleRestore(item)
                                                        }}
                                                        overrides={{
                                                            BaseButton: {
                                                                style: { paddingLeft: '6px', paddingRight: '6px' },
                                                            },
                                                        }}
                                                    >
                                                        <MdReplay size={16} />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t('Copy Translation')} placement='bottom'>
                                                    <Button
                                                        size='mini'
                                                        kind='tertiary'
                                                        onClick={async (event) => {
                                                            event.stopPropagation()
                                                            try {
                                                                if (!navigator?.clipboard?.writeText) {
                                                                    throw new Error('Clipboard API unavailable')
                                                                }
                                                                await navigator.clipboard.writeText(item.translatedText)
                                                                toast(t('Copy to clipboard'), {
                                                                    duration: 3000,
                                                                    icon: '👏',
                                                                })
                                                            } catch (error) {
                                                                console.error(error)
                                                                toast(t('Copy failed'), {
                                                                    duration: 3000,
                                                                    icon: '⚠️',
                                                                })
                                                            }
                                                        }}
                                                        overrides={{
                                                            BaseButton: {
                                                                style: { paddingLeft: '6px', paddingRight: '6px' },
                                                            },
                                                        }}
                                                    >
                                                        <RxCopy size={16} />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t('Delete')} placement='bottom'>
                                                    <Button
                                                        size='mini'
                                                        kind='tertiary'
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            void onDelete(item)
                                                        }}
                                                        overrides={{
                                                            BaseButton: {
                                                                style: { paddingLeft: '6px', paddingRight: '6px' },
                                                            },
                                                        }}
                                                    >
                                                        <RxTrash size={16} />
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        <div className={styles.historyText}>
                                            <div
                                                className={styles.historyTextLabel}
                                                style={{ color: theme.colors.contentTertiary }}
                                            >
                                                {t('Original Text')}
                                            </div>
                                            <div
                                                className={styles.historyTextBlock}
                                                style={{ color: theme.colors.contentPrimary }}
                                            >
                                                {item.text}
                                            </div>
                                        </div>
                                        <div
                                            className={styles.divider}
                                            style={{ background: theme.colors.borderOpaque }}
                                        />
                                        <div className={styles.historyText}>
                                            <div
                                                className={styles.historyTextLabel}
                                                style={{ color: theme.colors.contentTertiary }}
                                            >
                                                {t('Translation')}
                                            </div>
                                            <div
                                                className={styles.historyTextBlock}
                                                style={{ color: theme.colors.contentPrimary }}
                                            >
                                                {item.translatedText}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className={styles.empty} style={{ color: theme.colors.contentSecondary }}>
                                {t('No History Yet')}
                            </div>
                        )}
                    </div>
                    <div className={styles.historyActions}>
                        <Button size='compact' kind='tertiary' onClick={onClose}>
                            {t('Close')}
                        </Button>
                        <Button size='compact' kind='secondary' onClick={onClear} disabled={!historyItems?.length}>
                            {t('Clear History')}
                        </Button>
                    </div>
                </div>
            </ModalBody>
        </Modal>
    )
}
