import React, { Suspense } from 'react'
import { useStyletron } from 'baseui-sd'
import { Button, SIZE, KIND } from 'baseui-sd/button'
import { HeadingXSmall, LabelSmall, ParagraphSmall } from 'baseui-sd/typography'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { getLocalDB, RecentActivity } from '../internal-services/db'
import { TranslateMode } from '../translate'

export interface RecentActivityListProps {
    onActivityClick?: (activity: RecentActivity) => void
}

const RecentActivityListContent: React.FC<RecentActivityListProps> = ({ onActivityClick }) => {
    const [css, theme] = useStyletron()
    const { t } = useTranslation()

    // Query last 10 activities, ordered by timestamp descending
    const activities = useLiveQuery(async () => {
        const db = getLocalDB()
        return await db.recentActivity.orderBy('timestamp').reverse().limit(10).toArray()
    }, [])

    const handleClearHistory = async () => {
        const db = getLocalDB()
        await db.recentActivity.clear()
    }

    const getModeLabel = (mode: TranslateMode) => {
        switch (mode) {
            case 'translate':
                return t('Translate')
            case 'polishing':
                return t('Polishing')
            case 'summarize':
                return t('Summarize')
            default:
                return mode
        }
    }

    const truncateText = (text: string, maxLength: number = 50) => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }

    if (!activities || activities.length === 0) {
        return (
            <div
                className={css({
                    padding: theme.sizing.scale600,
                    textAlign: 'center',
                })}
            >
                <ParagraphSmall color={theme.colors.contentSecondary}>
                    {t('homepage.recentActivity.empty')}
                </ParagraphSmall>
            </div>
        )
    }

    return (
        <div
            data-testid="recent-activity-list"
            className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: theme.sizing.scale400,
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                })}
            >
                <HeadingXSmall margin={0}>{t('homepage.recentActivity.title')}</HeadingXSmall>
                <Button size={SIZE.mini} kind={KIND.tertiary} onClick={handleClearHistory}>
                    {t('homepage.recentActivity.clearHistory')}
                </Button>
            </div>

            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.sizing.scale300,
                })}
            >
                {activities.map((activity) => (
                    <div
                        key={activity.id}
                        className={css({
                            padding: theme.sizing.scale400,
                            backgroundColor: theme.colors.backgroundSecondary,
                            borderRadius: theme.borders.radius300,
                            cursor: onActivityClick ? 'pointer' : 'default',
                            transition: 'background-color 0.2s ease',
                            ':hover': onActivityClick
                                ? {
                                      backgroundColor: theme.colors.backgroundTertiary,
                                  }
                                : {},
                        })}
                        onClick={() => onActivityClick?.(activity)}
                        role={onActivityClick ? 'button' : undefined}
                        tabIndex={onActivityClick ? 0 : undefined}
                        onKeyDown={(e) => {
                            if (onActivityClick && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault()
                                onActivityClick(activity)
                            }
                        }}
                    >
                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: theme.sizing.scale200,
                            })}
                        >
                            <LabelSmall
                                overrides={{
                                    Block: {
                                        style: {
                                            fontWeight: 600,
                                            color: theme.colors.primary,
                                        },
                                    },
                                }}
                            >
                                {getModeLabel(activity.mode)}
                            </LabelSmall>
                            <LabelSmall color={theme.colors.contentSecondary}>
                                {new Date(activity.timestamp).toLocaleString()}
                            </LabelSmall>
                        </div>

                        {activity.sourceLang && activity.targetLang && (
                            <LabelSmall
                                overrides={{
                                    Block: {
                                        style: {
                                            marginBottom: theme.sizing.scale200,
                                            color: theme.colors.contentSecondary,
                                        },
                                    },
                                }}
                            >
                                {activity.sourceLang} → {activity.targetLang}
                            </LabelSmall>
                        )}

                        <ParagraphSmall margin={0} color={theme.colors.contentPrimary}>
                            {truncateText(activity.sourceText)}
                        </ParagraphSmall>
                    </div>
                ))}
            </div>
        </div>
    )
}

export const RecentActivityList: React.FC<RecentActivityListProps> = (props) => {
    const [css, theme] = useStyletron()

    return (
        <Suspense
            fallback={
                <div
                    className={css({
                        padding: theme.sizing.scale600,
                        textAlign: 'center',
                    })}
                >
                    <ParagraphSmall color={theme.colors.contentSecondary}>Loading...</ParagraphSmall>
                </div>
            }
        >
            <RecentActivityListContent {...props} />
        </Suspense>
    )
}
