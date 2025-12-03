import React from 'react'
import { createUseStyles } from 'react-jss'
import { useTranslation } from 'react-i18next'
import { IoWarning } from 'react-icons/io5'
import { useTheme } from '../hooks/useTheme'
import { IThemedStyleProps } from '../types'
import { Provider, engineIcons } from '../engines'

export interface ProviderStatusProps {
    provider?: Provider
}

const useStyles = createUseStyles({
    container: (props: IThemedStyleProps & { isWarning?: boolean }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: props.isWarning
            ? props.themeType === 'dark'
                ? 'rgba(255, 152, 0, 0.15)'
                : 'rgba(255, 152, 0, 0.1)'
            : props.themeType === 'dark'
            ? props.theme.colors.backgroundSecondary
            : props.theme.colors.backgroundTertiary,
        border: `1px solid ${props.isWarning ? 'rgba(255, 152, 0, 0.3)' : props.theme.colors.borderOpaque}`,
    }),
    icon: (props: IThemedStyleProps & { isWarning?: boolean }) => ({
        fontSize: '18px',
        color: props.isWarning ? '#ff9800' : props.theme.colors.accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }),
    providerName: (props: IThemedStyleProps & { isWarning?: boolean }) => ({
        fontSize: '13px',
        fontWeight: 500,
        color: props.isWarning ? '#ff9800' : props.theme.colors.contentPrimary,
    }),
})

export function ProviderStatus({ provider }: ProviderStatusProps) {
    const { theme, themeType } = useTheme()
    const { t } = useTranslation()

    const isValidProvider = provider && provider.length > 0
    const isWarning = !isValidProvider

    const styles = useStyles({ theme, themeType, isWarning })

    const ProviderIcon = isValidProvider ? engineIcons[provider] : null

    const ariaLabel = isValidProvider
        ? t('Current AI provider: {{provider}}', { provider })
        : t('Warning: No AI provider configured')

    return (
        <div
            className={styles.container}
            data-testid='provider-status'
            data-provider={isValidProvider ? provider : undefined}
            data-warning={isWarning ? 'true' : undefined}
            role='status'
            aria-label={ariaLabel}
        >
            <span className={styles.icon} data-testid={isWarning ? 'warning-icon' : 'provider-icon'}>
                {isValidProvider && ProviderIcon ? <ProviderIcon /> : <IoWarning />}
            </span>
            <span className={styles.providerName}>{isValidProvider ? provider : t('Configure AI Provider')}</span>
        </div>
    )
}

export default ProviderStatus
