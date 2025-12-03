import React, { useCallback, useMemo } from 'react'
import { createUseStyles } from 'react-jss'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../hooks/useTheme'
import { HistoryItem } from '../internal-services/db'
import { historyService } from '../services/history'
import { useLiveQuery } from 'dexie-react-hooks'
import { getLangName, LangCode } from '../lang'
import color from 'color'

export interface RecentActivityProps {
    /**
     * Maximum number of recent translations to display (default: 5)
     */
    limit?: number
    /**
     * Callback invoked when a translation item is clicked
     */
    onSelectTranslation?: (item: HistoryItem) => void
}

const useStyles = createUseStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: '14px',
        fontWeight: 600,
        letterSpacing: '0.02em',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    item: {
        'borderRadius': '8px',
        'padding': '12px',
        'display': 'flex',
        'flexDirection': 'column',
        'gap': '6px',
        'cursor': 'pointer',
        'transition': 'transform 0.1s ease, box-shadow 0.1s ease',
        '&:hover': {
            transform: 'translateY(-1px)',
        },
        '&:active': {
            transform: 'translateY(0)',
        },
    },
    itemSourceText: {
        fontSize: '14px',
        lineHeight: 1.4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
    },
    itemMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
    },
    languageBadge: {
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        textAlign: 'center',
        gap: '8px',
    },
    emptyTitle: {
        fontSize: '14px',
        fontWeight: 500,
    },
    emptyHint: {
        fontSize: '12px',
        maxWidth: '280px',
        lineHeight: 1.5,
    },
})

const MAX_SOURCE_TEXT_LENGTH = 100

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text
    }
    return text.substring(0, maxLength).trim() + '...'
}

export function RecentActivity(props: RecentActivityProps) {
    const { limit = 5, onSelectTranslation } = props
    const { t } = useTranslation()
    const { theme, themeType } = useTheme()
    const styles = useStyles()

    const recentTranslations = useLiveQuery(() => historyService.list({ limit }), [limit], [])

    const displayTranslations = useMemo(() => {
        return recentTranslations?.slice(0, limit) ?? []
    }, [recentTranslations, limit])

    const handleItemClick = useCallback(
        (item: HistoryItem) => {
            if (onSelectTranslation) {
                onSelectTranslation(item)
            }
        },
        [onSelectTranslation]
    )

    const handleItemKeyDown = useCallback(
        (event: React.KeyboardEvent, item: HistoryItem) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleItemClick(item)
            }
        },
        [handleItemClick]
    )

    const getItemBackground = useCallback(() => {
        return themeType === 'dark'
            ? color(theme.colors.backgroundPrimary).lighten(0.15).alpha(0.85).string()
            : color(theme.colors.backgroundSecondary).alpha(0.9).string()
    }, [theme.colors.backgroundPrimary, theme.colors.backgroundSecondary, themeType])

    const getBadgeBackground = useCallback(() => {
        return themeType === 'dark'
            ? color(theme.colors.accent).alpha(0.2).string()
            : color(theme.colors.accent).alpha(0.1).string()
    }, [theme.colors.accent, themeType])

    if (!displayTranslations || displayTranslations.length === 0) {
        return (
            <div className={styles.container} data-testid='recent-activity'>
                <div className={styles.header}>
                    <span className={styles.title} style={{ color: theme.colors.contentPrimary }}>
                        {t('Recent Translations')}
                    </span>
                </div>
                <div
                    className={styles.emptyState}
                    style={{
                        background: getItemBackground(),
                        borderRadius: '8px',
                    }}
                    data-testid='recent-activity-empty'
                >
                    <span className={styles.emptyTitle} style={{ color: theme.colors.contentPrimary }}>
                        {t('No Recent Translations')}
                    </span>
                    <span className={styles.emptyHint} style={{ color: theme.colors.contentSecondary }}>
                        {t(
                            'Start translating to see your recent activity here. Your translations will be saved for quick access.'
                        )}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container} data-testid='recent-activity'>
            <div className={styles.header}>
                <span className={styles.title} style={{ color: theme.colors.contentPrimary }}>
                    {t('Recent Translations')}
                </span>
            </div>
            <div className={styles.list} data-testid='recent-activity-list'>
                {displayTranslations.map((item) => (
                    <div
                        key={item.id}
                        className={styles.item}
                        style={{
                            background: getItemBackground(),
                            border: `1px solid ${theme.colors.borderOpaque}`,
                        }}
                        role='button'
                        tabIndex={0}
                        onClick={() => handleItemClick(item)}
                        onKeyDown={(e) => handleItemKeyDown(e, item)}
                        data-testid='recent-activity-item'
                    >
                        <span
                            className={styles.itemSourceText}
                            style={{ color: theme.colors.contentPrimary }}
                            data-testid='recent-activity-item-text'
                        >
                            {truncateText(item.text, MAX_SOURCE_TEXT_LENGTH)}
                        </span>
                        <div className={styles.itemMeta}>
                            <span
                                className={styles.languageBadge}
                                style={{
                                    background: getBadgeBackground(),
                                    color: theme.colors.accent,
                                }}
                                data-testid='recent-activity-item-language'
                            >
                                {getLangName(item.targetLang as LangCode)}
                            </span>
                            <span style={{ color: theme.colors.contentTertiary }}>
                                {formatRelativeTime(item.updatedAt)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function formatRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) {
        return 'Just now'
    } else if (minutes < 60) {
        return `${minutes}m ago`
    } else if (hours < 24) {
        return `${hours}h ago`
    } else if (days < 7) {
        return `${days}d ago`
    } else {
        return new Date(timestamp).toLocaleDateString()
    }
}

export default RecentActivity
