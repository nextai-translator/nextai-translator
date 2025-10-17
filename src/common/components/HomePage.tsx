import React from 'react'
import { useStyletron } from 'baseui-sd'
import { Button, SIZE, KIND } from 'baseui-sd/button'
import { HeadingLarge, ParagraphMedium } from 'baseui-sd/typography'
import { useTranslation } from 'react-i18next'
import { useAtom } from 'jotai'
import { RiTranslate, RiQuillPenLine, RiArticleLine, RiSettings3Line, RiBookOpenLine } from 'react-icons/ri'
import { QuickActionCard } from './QuickActionCard'
import { RecentActivityList, RecentActivityListProps } from './RecentActivityList'
import LogoWithText from './LogoWithText'
import { showSettingsAtom } from '../store/setting'
import { TranslateMode } from '../translate'
import { useSettings } from '../hooks/useSettings'

export interface HomePageProps {
    onQuickAction?: (mode: TranslateMode, text: string, targetLang?: string) => void
    onNavigateToSettings?: () => void
    onNavigateToVocabulary?: () => void
    onActivityClick?: RecentActivityListProps['onActivityClick']
}

export const HomePage: React.FC<HomePageProps> = ({
    onQuickAction,
    onNavigateToSettings,
    onNavigateToVocabulary,
    onActivityClick,
}) => {
    const [css, theme] = useStyletron()
    const { t } = useTranslation()
    const [, setShowSettings] = useAtom(showSettingsAtom)
    const { settings } = useSettings()

    const handleQuickAction = (mode: TranslateMode) => (text: string, targetLang?: string) => {
        onQuickAction?.(mode, text, targetLang)
    }

    const handleSettingsClick = () => {
        if (onNavigateToSettings) {
            onNavigateToSettings()
        } else {
            setShowSettings(true)
        }
    }

    const handleVocabularyClick = () => {
        onNavigateToVocabulary?.()
    }

    const showRecentActivity = settings?.showRecentActivity !== false

    return (
        <div
            data-testid='homepage-container'
            className={css({
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                backgroundColor: theme.colors.backgroundPrimary,
                padding: theme.sizing.scale800,
                gap: theme.sizing.scale800,
            })}
        >
            {/* Header with Logo and Navigation */}
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: theme.sizing.scale400,
                })}
            >
                <div data-testid='homepage-logo'>
                    <LogoWithText />
                </div>

                <div
                    className={css({
                        display: 'flex',
                        gap: theme.sizing.scale300,
                    })}
                >
                    <Button
                        size={SIZE.compact}
                        kind={KIND.secondary}
                        onClick={handleSettingsClick}
                        startEnhancer={<RiSettings3Line />}
                    >
                        {t('Go to Settings')}
                    </Button>
                    <Button
                        size={SIZE.compact}
                        kind={KIND.secondary}
                        onClick={handleVocabularyClick}
                        startEnhancer={<RiBookOpenLine />}
                    >
                        {t('vocabulary')}
                    </Button>
                </div>
            </div>

            {/* Welcome Section */}
            <div
                className={css({
                    textAlign: 'center',
                    marginTop: theme.sizing.scale600,
                    marginBottom: theme.sizing.scale400,
                })}
            >
                <HeadingLarge margin={0} marginBottom={theme.sizing.scale400}>
                    {t('homepage.title')}
                </HeadingLarge>
                <ParagraphMedium margin={0} color={theme.colors.contentSecondary}>
                    {t('homepage.subtitle')}
                </ParagraphMedium>
            </div>

            {/* Quick Action Cards */}
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: theme.sizing.scale600,
                    marginBottom: theme.sizing.scale800,
                })}
            >
                <QuickActionCard type='translate' icon={<RiTranslate />} onAction={handleQuickAction('translate')} />
                <QuickActionCard type='polishing' icon={<RiQuillPenLine />} onAction={handleQuickAction('polishing')} />
                <QuickActionCard type='summarize' icon={<RiArticleLine />} onAction={handleQuickAction('summarize')} />
            </div>

            {/* Recent Activity Section */}
            {showRecentActivity && (
                <div
                    className={css({
                        marginTop: theme.sizing.scale600,
                    })}
                >
                    <RecentActivityList onActivityClick={onActivityClick} />
                </div>
            )}
        </div>
    )
}
