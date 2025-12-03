import React, { useCallback, useMemo } from 'react'
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

export interface HomepageProps {
    engine?: Styletron
    onNavigate?: (target: NavigationTarget) => void
    showLogo?: boolean
}

const useStyles = createUseStyles({
    container: (props: IThemedStyleProps) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        minHeight: '400px',
        background: props.theme.colors.backgroundPrimary,
        color: props.theme.colors.contentPrimary,
    }),
    header: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '32px',
    },
    tagline: (props: IThemedStyleProps) => ({
        fontSize: '14px',
        color: props.theme.colors.contentSecondary,
        marginTop: '8px',
        textAlign: 'center',
    }),
    navigationGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        width: '100%',
        maxWidth: '320px',
    },
    navItem: (props: IThemedStyleProps) => ({
        'display': 'flex',
        'flexDirection': 'column',
        'alignItems': 'center',
        'justifyContent': 'center',
        'padding': '20px 16px',
        'borderRadius': '12px',
        'background':
            props.themeType === 'dark' ? props.theme.colors.backgroundSecondary : props.theme.colors.backgroundTertiary,
        'cursor': 'pointer',
        'transition': 'all 0.2s ease',
        'border': `1px solid ${props.theme.colors.borderOpaque}`,
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        '&:active': {
            transform: 'translateY(0)',
        },
    }),
    navIcon: (props: IThemedStyleProps) => ({
        fontSize: '32px',
        marginBottom: '8px',
        color: props.theme.colors.accent,
    }),
    navLabel: (props: IThemedStyleProps) => ({
        fontSize: '14px',
        fontWeight: 500,
        color: props.theme.colors.contentPrimary,
    }),
})

interface NavigationItem {
    id: NavigationTarget
    icon: React.ReactNode
    labelKey: string
    testId: string
}

export function InnerHomepage({ onNavigate }: Omit<HomepageProps, 'engine'>) {
    const { theme, themeType } = useTheme()
    const { t } = useTranslation()
    const styles = useStyles({ theme, themeType })

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
        <div className={styles.container} data-testid='homepage-container'>
            <div className={styles.header}>
                <LogoWithText />
                <p className={styles.tagline}>{t('AI-powered translation at your fingertips')}</p>
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
