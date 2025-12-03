import React, { useCallback, useMemo, useState, useEffect } from 'react'
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
import { Provider } from '../engines'

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
    container: (props: StyleProps) => ({
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
    }),
    header: (props: StyleProps) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: props.layoutMode === 'compact' ? '20px' : '32px',
    }),
    tagline: (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '12px' : '14px',
        color: props.theme.colors.contentSecondary,
        marginTop: '8px',
        textAlign: 'center',
        padding: '0 8px',
    }),
    providerStatusWrapper: {
        marginTop: '16px',
    },
    navigationGrid: (props: StyleProps) => ({
        display: 'grid',
        gridTemplateColumns:
            props.layoutMode === 'compact'
                ? 'repeat(2, 1fr)' // Compact: 2 columns but smaller
                : props.layoutMode === 'expanded'
                ? 'repeat(4, 1fr)' // Expanded: 4 columns in a row
                : 'repeat(2, 1fr)', // Standard: 2x2 grid
        gap: props.layoutMode === 'compact' ? '8px' : props.layoutMode === 'expanded' ? '24px' : '16px',
        width: '100%',
        maxWidth: props.layoutMode === 'compact' ? '280px' : props.layoutMode === 'expanded' ? '800px' : '320px',
    }),
    navItem: (props: StyleProps) => ({
        'display': 'flex',
        'flexDirection': 'column',
        'alignItems': 'center',
        'justifyContent': 'center',
        'padding':
            props.layoutMode === 'compact' ? '12px 8px' : props.layoutMode === 'expanded' ? '24px 20px' : '20px 16px',
        'borderRadius': props.layoutMode === 'compact' ? '8px' : '12px',
        'background':
            props.themeType === 'dark' ? props.theme.colors.backgroundSecondary : props.theme.colors.backgroundTertiary,
        'cursor': 'pointer',
        'transition': 'all 0.2s ease',
        'border': `1px solid ${props.theme.colors.borderOpaque}`,
        'minWidth': 0, // Prevents flex items from overflowing
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        '&:active': {
            transform: 'translateY(0)',
        },
    }),
    navIcon: (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '24px' : props.layoutMode === 'expanded' ? '40px' : '32px',
        marginBottom: props.layoutMode === 'compact' ? '4px' : '8px',
        color: props.theme.colors.accent,
    }),
    navLabel: (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '12px' : '14px',
        fontWeight: 500,
        color: props.theme.colors.contentPrimary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
    }),
    // Onboarding styles
    onboardingContainer: (props: StyleProps) => ({
        width: '100%',
        maxWidth: props.layoutMode === 'compact' ? '280px' : props.layoutMode === 'expanded' ? '800px' : '320px',
        marginBottom: props.layoutMode === 'compact' ? '16px' : '24px',
        padding: props.layoutMode === 'compact' ? '12px' : '16px',
        borderRadius: '12px',
        background:
            props.themeType === 'dark'
                ? `linear-gradient(135deg, ${props.theme.colors.accent}15, ${props.theme.colors.accent}08)`
                : `linear-gradient(135deg, ${props.theme.colors.accent}12, ${props.theme.colors.accent}05)`,
        border: `1px solid ${props.theme.colors.accent}30`,
        position: 'relative',
    }),
    onboardingHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
    },
    onboardingWelcome: (props: StyleProps) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: props.layoutMode === 'compact' ? '14px' : '16px',
        fontWeight: 600,
        color: props.theme.colors.contentPrimary,
    }),
    onboardingIcon: (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '18px' : '22px',
        color: props.theme.colors.accent,
    }),
    onboardingDismissBtn: (props: StyleProps) => ({
        'display': 'flex',
        'alignItems': 'center',
        'justifyContent': 'center',
        'padding': '4px',
        'borderRadius': '50%',
        'cursor': 'pointer',
        'transition': 'background 0.2s ease',
        'background': 'transparent',
        'color': props.theme.colors.contentSecondary,
        '&:hover': {
            background: props.theme.colors.backgroundTertiary,
        },
    }),
    onboardingTips: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    onboardingTipItem: (props: StyleProps) => ({
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        fontSize: props.layoutMode === 'compact' ? '12px' : '13px',
        color: props.theme.colors.contentSecondary,
        lineHeight: 1.5,
    }),
    onboardingTipBullet: (props: StyleProps) => ({
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: props.theme.colors.accent,
        marginTop: '6px',
        flexShrink: 0,
    }),
    onboardingEmptyState: (props: StyleProps) => ({
        marginTop: '8px',
        padding: '12px',
        borderRadius: '8px',
        background:
            props.themeType === 'dark' ? props.theme.colors.backgroundSecondary : props.theme.colors.backgroundTertiary,
        textAlign: 'center',
    }),
    onboardingEmptyStateText: (props: StyleProps) => ({
        fontSize: props.layoutMode === 'compact' ? '12px' : '13px',
        color: props.theme.colors.accent,
        fontWeight: 500,
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
}

export function InnerHomepage({
    onNavigate,
    provider,
    layoutModeOverride,
    isNewUser = false,
    hasTranslationHistory = true,
    onboardingDismissed = false,
    onDismissOnboarding,
}: InnerHomepageProps) {
    const { theme, themeType } = useTheme()
    const { t } = useTranslation()
    const { layoutMode: detectedLayoutMode, windowWidth } = useWindowSize()

    // Allow override for testing, otherwise use detected layout mode
    const layoutMode = layoutModeOverride ?? detectedLayoutMode

    const styles = useStyles({ theme, themeType, layoutMode })

    // Determine if onboarding should be shown
    const showOnboarding = isNewUser && !onboardingDismissed

    // Handle dismiss onboarding
    const handleDismissOnboarding = useCallback(() => {
        onDismissOnboarding?.()
    }, [onDismissOnboarding])

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
            <div className={styles.header} data-testid='homepage-header'>
                <LogoWithText />
                <p className={styles.tagline} data-testid='homepage-tagline'>
                    {t('AI-powered translation at your fingertips')}
                </p>
                <div className={styles.providerStatusWrapper}>
                    <ProviderStatus provider={provider} />
                </div>
            </div>

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
        </div>
    )
}

const defaultEngine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

export function Homepage({ engine, ...props }: HomepageProps) {
    const { theme } = useTheme()
    const styletronEngine = engine ?? defaultEngine

    return (
        <StyletronProvider value={styletronEngine}>
            <BaseProvider theme={theme}>
                <InnerHomepage {...props} />
            </BaseProvider>
        </StyletronProvider>
    )
}

export default Homepage
