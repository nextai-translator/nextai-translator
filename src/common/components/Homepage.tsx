import React, { useCallback, useMemo, useState, useEffect, memo } from 'react'
import { createUseStyles } from 'react-jss'
import { useTranslation } from 'react-i18next'
import { MdTranslate, MdHistory, MdSettings, MdMenuBook, MdClose, MdLightbulb } from 'react-icons/md'
import { useTheme } from '../hooks/useTheme'
import { IThemedStyleProps } from '../types'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider } from 'baseui-sd'
import { PREFIX } from '../constants'
import LogoWithText from './LogoWithText'
import { ProviderStatus } from './ProviderStatus'
import { RecentActivity } from './RecentActivity'
import { Provider } from '../engines'
import { HistoryItem } from '../internal-services/db'

export type NavigationTarget = 'translator' | 'settings' | 'vocabulary' | 'history'

// Breakpoints for responsive layout
export const BREAKPOINTS = {
    compact: 480, // Below this: compact vertical layout
    tablet: 768, // Below this: standard layout, above: expanded layout
    desktop: 1024, // Full desktop layout
} as const

export type LayoutMode = 'compact' | 'standard' | 'expanded'

export interface HomepageProps {
    engine?: Styletron
    onNavigate?: (target: NavigationTarget) => void
    showLogo?: boolean
    provider?: Provider
    showRecentActivity?: boolean
    onSelectTranslation?: (item: HistoryItem) => void
}

// Hook to get current window width and layout mode
export function useWindowSize() {
    const [windowWidth, setWindowWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.tablet
    )

    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleResize = () => {
            setWindowWidth(window.innerWidth)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const layoutMode: LayoutMode = useMemo(() => {
        if (windowWidth < BREAKPOINTS.compact) return 'compact'
        if (windowWidth < BREAKPOINTS.tablet) return 'standard'
        return 'expanded'
    }, [windowWidth])

    return { windowWidth, layoutMode }
}

interface StyleProps extends IThemedStyleProps {
    layoutMode: LayoutMode
}

const useStyles = createUseStyles({
    // CSS containment for layout performance
    '@keyframes fadeIn': {
        from: { opacity: 0, transform: 'translateY(8px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
    },
    '@keyframes slideUp': {
        from: { opacity: 0, transform: 'translateY(16px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
    },
    'container': (props: StyleProps) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: props.layoutMode === 'compact' ? '16px' : '24px',
        minHeight: props.layoutMode === 'compact' ? '300px' : '400px',
        background: props.theme.colors.backgroundPrimary,
        color: props.theme.colors.contentPrimary,
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        contain: 'layout style',
        animation: '$fadeIn 0.3s ease-out',
    }),
    // Skip link for keyboard users
    'skipLink': (props: StyleProps) => ({
        'position': 'absolute',
        'top': '-40px',
        'left': '50%',
        'transform': 'translateX(-50%)',
        'padding': '8px 16px',
        'background': props.theme.colors.accent,
        'color': props.theme.colors.contentOnColor || '#fff',
        'borderRadius': '4px',
        'zIndex': 1000,
        'transition': 'top 0.2s ease',
        'textDecoration': 'none',
        'fontSize': '14px',
        'fontWeight': 500,
        '&:focus': {
            top: '8px',
            outline: `2px solid ${props.theme.colors.borderAccent || props.theme.colors.accent}`,
            outlineOffset: '2px',
        },
    }),
    'header': (props: StyleProps) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: props.layoutMode === 'compact' ? '20px' : '32px',
        animation: '$slideUp 0.4s ease-out',
        animationDelay: '0.1s',
        animationFillMode: 'backwards',
    }),
    'tagline': (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '12px' : '14px',
        color: props.theme.colors.contentSecondary,
        marginTop: '8px',
        textAlign: 'center',
        padding: '0 8px',
        letterSpacing: '0.01em',
        lineHeight: 1.5,
    }),
    'providerStatusWrapper': {
        marginTop: '16px',
    },
    'navigationGrid': (props: StyleProps) => ({
        display: 'grid',
        gridTemplateColumns:
            props.layoutMode === 'compact'
                ? 'repeat(2, 1fr)'
                : props.layoutMode === 'expanded'
                ? 'repeat(4, 1fr)'
                : 'repeat(2, 1fr)',
        gap: props.layoutMode === 'compact' ? '10px' : props.layoutMode === 'expanded' ? '24px' : '16px',
        width: '100%',
        maxWidth: props.layoutMode === 'compact' ? '280px' : props.layoutMode === 'expanded' ? '800px' : '320px',
        animation: '$slideUp 0.4s ease-out',
        animationDelay: '0.2s',
        animationFillMode: 'backwards',
    }),
    'navItem': (props: StyleProps) => ({
        'display': 'flex',
        'flexDirection': 'column',
        'alignItems': 'center',
        'justifyContent': 'center',
        'padding':
            props.layoutMode === 'compact' ? '14px 10px' : props.layoutMode === 'expanded' ? '24px 20px' : '20px 16px',
        'borderRadius': props.layoutMode === 'compact' ? '10px' : '14px',
        'background':
            props.themeType === 'dark' ? props.theme.colors.backgroundSecondary : props.theme.colors.backgroundTertiary,
        'cursor': 'pointer',
        'transition': 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'border': `1px solid ${props.theme.colors.borderOpaque}`,
        'minWidth': 0,
        'position': 'relative',
        'overflow': 'hidden',
        // Focus styles for accessibility
        'outline': 'none',
        '&:focus-visible': {
            boxShadow: `0 0 0 3px ${props.theme.colors.accent}40`,
            borderColor: props.theme.colors.accent,
        },
        '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: props.themeType === 'dark' ? '0 8px 24px rgba(0, 0, 0, 0.3)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
            borderColor: props.theme.colors.accent + '50',
        },
        '&:active': {
            transform: 'translateY(-1px)',
            boxShadow: props.themeType === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
        },
    }),
    'navIcon': (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '26px' : props.layoutMode === 'expanded' ? '42px' : '34px',
        marginBottom: props.layoutMode === 'compact' ? '6px' : '10px',
        color: props.theme.colors.accent,
        transition: 'transform 0.2s ease',
    }),
    'navLabel': (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '12px' : '14px',
        fontWeight: 600,
        color: props.theme.colors.contentPrimary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
        letterSpacing: '0.02em',
    }),
    // Recent activity section
    'recentActivityWrapper': (props: StyleProps) => ({
        width: '100%',
        maxWidth: props.layoutMode === 'compact' ? '280px' : props.layoutMode === 'expanded' ? '800px' : '320px',
        marginTop: props.layoutMode === 'compact' ? '20px' : '28px',
        animation: '$slideUp 0.4s ease-out',
        animationDelay: '0.3s',
        animationFillMode: 'backwards',
    }),
    // Onboarding styles
    'onboardingContainer': (props: StyleProps) => ({
        width: '100%',
        maxWidth: props.layoutMode === 'compact' ? '280px' : props.layoutMode === 'expanded' ? '800px' : '320px',
        marginBottom: props.layoutMode === 'compact' ? '16px' : '24px',
        padding: props.layoutMode === 'compact' ? '14px' : '18px',
        borderRadius: '14px',
        background:
            props.themeType === 'dark'
                ? `linear-gradient(135deg, ${props.theme.colors.accent}18, ${props.theme.colors.accent}08)`
                : `linear-gradient(135deg, ${props.theme.colors.accent}15, ${props.theme.colors.accent}06)`,
        border: `1px solid ${props.theme.colors.accent}35`,
        position: 'relative',
        animation: '$slideUp 0.4s ease-out',
        animationDelay: '0.15s',
        animationFillMode: 'backwards',
        boxShadow:
            props.themeType === 'dark'
                ? `0 4px 16px ${props.theme.colors.accent}10`
                : `0 4px 16px ${props.theme.colors.accent}08`,
    }),
    'onboardingHeader': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
    },
    'onboardingWelcome': (props: StyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: props.layoutMode === 'compact' ? '14px' : '16px',
        fontWeight: 600,
        color: props.theme.colors.contentPrimary,
    }),
    'onboardingIcon': (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '20px' : '24px',
        color: props.theme.colors.accent,
    }),
    'onboardingDismissBtn': (props: StyleProps) => ({
        'display': 'flex',
        'alignItems': 'center',
        'justifyContent': 'center',
        'padding': '6px',
        'borderRadius': '50%',
        'cursor': 'pointer',
        'transition': 'all 0.2s ease',
        'background': 'transparent',
        'color': props.theme.colors.contentSecondary,
        'outline': 'none',
        '&:hover': {
            background: props.theme.colors.backgroundTertiary,
            color: props.theme.colors.contentPrimary,
        },
        '&:focus-visible': {
            boxShadow: `0 0 0 2px ${props.theme.colors.accent}`,
            background: props.theme.colors.backgroundTertiary,
        },
    }),
    'onboardingTips': {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    'onboardingTipItem': (props: StyleProps) => ({
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        fontSize: props.layoutMode === 'compact' ? '12px' : '13px',
        color: props.theme.colors.contentSecondary,
        lineHeight: 1.6,
    }),
    'onboardingTipBullet': (props: StyleProps) => ({
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: props.theme.colors.accent,
        marginTop: '7px',
        flexShrink: 0,
    }),
    'onboardingEmptyState': (props: StyleProps) => ({
        marginTop: '12px',
        padding: '14px',
        borderRadius: '10px',
        background:
            props.themeType === 'dark' ? props.theme.colors.backgroundSecondary : props.theme.colors.backgroundTertiary,
        textAlign: 'center',
    }),
    'onboardingEmptyStateText': (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '12px' : '13px',
        color: props.theme.colors.accent,
        fontWeight: 600,
        letterSpacing: '0.01em',
    }),
})

interface NavigationItem {
    id: NavigationTarget
    icon: React.ReactNode
    labelKey: string
    testId: string
}

export interface InnerHomepageProps extends Omit<HomepageProps, 'engine'> {
    layoutModeOverride?: LayoutMode // For testing purposes
    isNewUser?: boolean // Whether this is a new user (shows onboarding)
    hasTranslationHistory?: boolean // Whether user has translation history
    onboardingDismissed?: boolean // Whether onboarding has been dismissed
    onDismissOnboarding?: () => void // Callback when onboarding is dismissed
    showRecentActivity?: boolean // Whether to show recent activity section
    onSelectTranslation?: (item: HistoryItem) => void // Callback when a translation is selected
}

export const InnerHomepage = memo(function InnerHomepage({
    onNavigate,
    provider,
    layoutModeOverride,
    isNewUser = false,
    hasTranslationHistory = true,
    onboardingDismissed = false,
    onDismissOnboarding,
    showRecentActivity = false,
    onSelectTranslation,
}: InnerHomepageProps) {
    const { theme, themeType } = useTheme()
    const { t } = useTranslation()
    const { layoutMode: detectedLayoutMode, windowWidth } = useWindowSize()

    // Allow override for testing, otherwise use detected layout mode
    const layoutMode = layoutModeOverride ?? detectedLayoutMode

    const styles = useStyles({ theme, themeType, layoutMode })

    // Determine if onboarding should be shown
    const showOnboarding = isNewUser && !onboardingDismissed

    // Handle dismiss onboarding - memoized for performance
    const handleDismissOnboarding = useCallback(() => {
        onDismissOnboarding?.()
    }, [onDismissOnboarding])

    // Handle translation selection - memoized for performance
    const handleSelectTranslation = useCallback(
        (item: HistoryItem) => {
            onSelectTranslation?.(item)
        },
        [onSelectTranslation]
    )

    const navigationItems: NavigationItem[] = useMemo(
        () => [
            {
                id: 'translator',
                icon: <MdTranslate className={styles.navIcon} data-testid='translate-icon' />,
                labelKey: 'Translate',
                testId: 'nav-translate',
            },
            {
                id: 'settings',
                icon: <MdSettings className={styles.navIcon} data-testid='settings-icon' />,
                labelKey: 'Settings',
                testId: 'nav-settings',
            },
            {
                id: 'vocabulary',
                icon: <MdMenuBook className={styles.navIcon} data-testid='vocabulary-icon' />,
                labelKey: 'Vocabulary',
                testId: 'nav-vocabulary',
            },
            {
                id: 'history',
                icon: <MdHistory className={styles.navIcon} data-testid='history-icon' />,
                labelKey: 'History',
                testId: 'nav-history',
            },
        ],
        [styles.navIcon]
    )

    const handleNavigation = useCallback(
        (target: NavigationTarget) => {
            onNavigate?.(target)
        },
        [onNavigate]
    )

    return (
        <div
            className={styles.container}
            data-testid='homepage-container'
            data-layout-mode={layoutMode}
            data-window-width={windowWidth}
        >
            {/* Skip link for keyboard users */}
            <a href='#main-navigation' className={styles.skipLink} data-testid='skip-link'>
                {t('Skip to navigation')}
            </a>

            <header className={styles.header} data-testid='homepage-header'>
                <LogoWithText />
                <p className={styles.tagline} data-testid='homepage-tagline'>
                    {t('AI-powered translation at your fingertips')}
                </p>
                <div className={styles.providerStatusWrapper}>
                    <ProviderStatus provider={provider} />
                </div>
            </header>

            {/* Onboarding hints for new users */}
            {showOnboarding && (
                <div
                    className={styles.onboardingContainer}
                    data-testid='onboarding-hints'
                    role='region'
                    aria-label={t('Getting started tips')}
                >
                    <div className={styles.onboardingHeader}>
                        <div className={styles.onboardingWelcome} data-testid='onboarding-welcome'>
                            <MdLightbulb className={styles.onboardingIcon} />
                            <span>{t('Welcome to NextAI Translator!')}</span>
                        </div>
                        <div
                            className={styles.onboardingDismissBtn}
                            data-testid='onboarding-dismiss-btn'
                            role='button'
                            tabIndex={0}
                            aria-label={t('Dismiss onboarding tips')}
                            onClick={handleDismissOnboarding}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleDismissOnboarding()
                                }
                            }}
                        >
                            <MdClose />
                        </div>
                    </div>
                    <div className={styles.onboardingTips} data-testid='onboarding-tips'>
                        <div className={styles.onboardingTipItem}>
                            <span className={styles.onboardingTipBullet} />
                            <span>{t('Select text on any webpage to translate instantly')}</span>
                        </div>
                        <div className={styles.onboardingTipItem}>
                            <span className={styles.onboardingTipBullet} />
                            <span>{t('Configure your AI provider in Settings for best results')}</span>
                        </div>
                        <div className={styles.onboardingTipItem}>
                            <span className={styles.onboardingTipBullet} />
                            <span>{t('Save words to Vocabulary to build your personal dictionary')}</span>
                        </div>
                    </div>
                    {/* Empty state message when no translation history */}
                    {!hasTranslationHistory && (
                        <div className={styles.onboardingEmptyState} data-testid='onboarding-empty-state'>
                            <span className={styles.onboardingEmptyStateText}>
                                {t('Get started by clicking Translate!')}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <nav
                id='main-navigation'
                className={styles.navigationGrid}
                data-testid='navigation-grid'
                role='navigation'
                aria-label={t('Main navigation')}
            >
                {navigationItems.map((item) => (
                    <div
                        key={item.id}
                        className={styles.navItem}
                        onClick={() => handleNavigation(item.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleNavigation(item.id)
                            }
                        }}
                        data-testid={item.testId}
                        role='button'
                        tabIndex={0}
                        aria-label={t(item.labelKey)}
                    >
                        {item.icon}
                        <span className={styles.navLabel}>{t(item.labelKey)}</span>
                    </div>
                ))}
            </nav>

            {/* Recent activity section */}
            {showRecentActivity && (
                <section
                    className={styles.recentActivityWrapper}
                    data-testid='recent-activity-section'
                    aria-label={t('Recent translations')}
                >
                    <RecentActivity
                        limit={layoutMode === 'compact' ? 3 : 5}
                        onSelectTranslation={handleSelectTranslation}
                    />
                </section>
            )}
        </div>
    )
})

const defaultEngine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

export const Homepage = memo(function Homepage({ engine, ...props }: HomepageProps) {
    const { theme } = useTheme()
    const styletronEngine = engine ?? defaultEngine

    return (
        <StyletronProvider value={styletronEngine}>
            <BaseProvider theme={theme}>
                <InnerHomepage {...props} />
            </BaseProvider>
        </StyletronProvider>
    )
})

export default Homepage
