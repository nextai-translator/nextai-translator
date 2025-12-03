import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { createUseStyles } from 'react-jss'
import { useTranslation } from 'react-i18next'
import { MdTranslate, MdHistory, MdSettings, MdMenuBook } from 'react-icons/md'
import { useTheme } from '../hooks/useTheme'
import { IThemedStyleProps } from '../types'
import { Client as Styletron } from 'styletron-engine-atomic'
import { Provider as StyletronProvider } from 'styletron-react'
import { BaseProvider } from 'baseui-sd'
import { PREFIX } from '../constants'
import LogoWithText from './LogoWithText'

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
})

interface NavigationItem {
    id: NavigationTarget
    icon: React.ReactNode
    labelKey: string
    testId: string
}

export interface InnerHomepageProps extends Omit<HomepageProps, 'engine'> {
    layoutModeOverride?: LayoutMode // For testing purposes
}

export function InnerHomepage({ onNavigate, layoutModeOverride }: InnerHomepageProps) {
    const { theme, themeType } = useTheme()
    const { t } = useTranslation()
    const { layoutMode: detectedLayoutMode, windowWidth } = useWindowSize()

    // Allow override for testing, otherwise use detected layout mode
    const layoutMode = layoutModeOverride ?? detectedLayoutMode

    const styles = useStyles({ theme, themeType, layoutMode })

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
            </div>
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
