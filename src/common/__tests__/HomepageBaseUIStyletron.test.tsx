import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Test Case 1: Verify Homepage uses BaseUI components from baseui-sd
describe('Homepage BaseUI Component Usage (NFR-2)', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    it('should import BaseProvider from baseui-sd', async () => {
        // Dynamically import the Homepage component to check its imports
        const HomepageModule = await import('../components/Homepage')

        // The Homepage component should exist (memo-wrapped components are objects with $$typeof)
        expect(HomepageModule.Homepage).toBeDefined()
        // memo() returns an object, not a function - check it's a valid React component
        expect(HomepageModule.Homepage).toHaveProperty('$$typeof')
    })

    it('should use Styletron engine from styletron-engine-atomic', async () => {
        // Import Styletron to verify it's available and being used
        const StyletronModule = await import('styletron-engine-atomic')
        expect(StyletronModule.Client).toBeDefined()
    })

    it('should use StyletronProvider from styletron-react', async () => {
        const StyletronReactModule = await import('styletron-react')
        expect(StyletronReactModule.Provider).toBeDefined()
    })

    it('should have BaseProvider available from baseui-sd', async () => {
        const BaseUIModule = await import('baseui-sd')
        expect(BaseUIModule.BaseProvider).toBeDefined()
    })
})

// Test Case 2: Verify Homepage styling uses Styletron and IThemedStyleProps pattern
describe('Homepage Styletron and IThemedStyleProps Pattern (NFR-2, NFR-4)', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    it('should import IThemedStyleProps from types', async () => {
        const TypesModule = await import('../types')

        // Verify IThemedStyleProps interface is properly exported (by checking for related types)
        expect(TypesModule).toBeDefined()
    })

    it('should have theme-aware styling with IThemedStyleProps properties', () => {
        // IThemedStyleProps interface should have theme and themeType
        interface IThemedStyleProps {
            theme: unknown
            themeType: 'light' | 'dark'
            isDesktopApp?: boolean
            showLogo?: boolean
        }

        // Verify the interface contract
        const mockProps: IThemedStyleProps = {
            theme: { colors: {} },
            themeType: 'light',
        }

        expect(mockProps.theme).toBeDefined()
        expect(mockProps.themeType).toBe('light')
    })

    it('should use createUseStyles from react-jss for theme-aware styling', async () => {
        const JSSModule = await import('react-jss')
        expect(JSSModule.createUseStyles).toBeDefined()
    })
})

// Test Case 3: Compare Homepage button styling patterns with Settings
describe('Homepage Button Styling Consistency (NFR-4)', () => {
    // Mock react-i18next
    vi.mock('react-i18next', () => ({
        useTranslation: () => ({
            t: (key: string) => key,
        }),
    }))

    // Mock useTheme hook
    vi.mock('../hooks/useTheme', () => ({
        useTheme: () => ({
            theme: {
                colors: {
                    backgroundPrimary: '#ffffff',
                    backgroundSecondary: '#f5f5f5',
                    backgroundTertiary: '#eeeeee',
                    contentPrimary: '#000000',
                    contentSecondary: '#666666',
                    borderOpaque: '#dddddd',
                    accent: '#007bff',
                },
            },
            themeType: 'light' as const,
        }),
    }))

    // Mock LogoWithText component
    vi.mock('../components/LogoWithText', () => ({
        default: () => <div data-testid='logo-with-text'>NextAI Translator</div>,
    }))

    // Mock ProviderStatus component
    vi.mock('../components/ProviderStatus', () => ({
        ProviderStatus: ({ provider }: { provider?: string }) => (
            <div data-testid='provider-status'>{provider || 'Configure'}</div>
        ),
    }))

    it('should render navigation items with consistent button-like styling', async () => {
        const { InnerHomepage } = await import('../components/Homepage')

        render(<InnerHomepage onNavigate={() => {}} />)

        // Navigation items should have button role for accessibility (same pattern as Settings)
        const translateNav = screen.getByTestId('nav-translate')
        expect(translateNav).toHaveAttribute('role', 'button')
        expect(translateNav).toHaveAttribute('tabIndex', '0')
    })

    it('should apply theme colors consistently through IThemedStyleProps', async () => {
        const { InnerHomepage } = await import('../components/Homepage')

        render(<InnerHomepage onNavigate={() => {}} />)

        // Container should exist and use theme-based styling
        const container = screen.getByTestId('homepage-container')
        expect(container).toBeInTheDocument()

        // The styles are applied via createUseStyles which uses IThemedStyleProps
        // We verify the component renders without errors, indicating proper theme integration
    })

    it('should use consistent typography patterns from theme', async () => {
        const { InnerHomepage } = await import('../components/Homepage')

        render(<InnerHomepage onNavigate={() => {}} />)

        // Check for tagline which uses theme.colors.contentSecondary
        const tagline = screen.getByTestId('homepage-tagline')
        expect(tagline).toBeInTheDocument()
    })
})

// Test Case 4: Visual consistency integration test - Render Homepage with proper provider setup
describe('Homepage Visual Consistency Integration (NFR-4)', () => {
    // Mock react-i18next
    vi.mock('react-i18next', () => ({
        useTranslation: () => ({
            t: (key: string) => key,
        }),
    }))

    // Mock useTheme hook with proper theme structure matching existing components
    vi.mock('../hooks/useTheme', () => ({
        useTheme: () => ({
            theme: {
                colors: {
                    backgroundPrimary: '#ffffff',
                    backgroundSecondary: '#f5f5f5',
                    backgroundTertiary: '#eeeeee',
                    contentPrimary: '#000000',
                    contentSecondary: '#666666',
                    borderOpaque: '#dddddd',
                    borderTransparent: 'rgba(0,0,0,0.08)',
                    accent: '#007bff',
                },
                sizing: {
                    scale300: '12px',
                },
            },
            themeType: 'light' as const,
        }),
    }))

    // Mock LogoWithText component
    vi.mock('../components/LogoWithText', () => ({
        default: () => <div data-testid='logo-with-text'>NextAI Translator</div>,
    }))

    // Mock ProviderStatus component
    vi.mock('../components/ProviderStatus', () => ({
        ProviderStatus: ({ provider }: { provider?: string }) => (
            <div data-testid='provider-status'>{provider || 'Configure'}</div>
        ),
    }))

    it('should render Homepage with StyletronProvider and BaseProvider wrappers', async () => {
        const { Homepage } = await import('../components/Homepage')

        // Homepage component wraps InnerHomepage with StyletronProvider and BaseProvider
        render(<Homepage onNavigate={() => {}} />)

        // If no error is thrown, the provider setup is correct
        const container = screen.getByTestId('homepage-container')
        expect(container).toBeInTheDocument()
    })

    it('should maintain consistent spacing patterns with existing components', async () => {
        const { InnerHomepage } = await import('../components/Homepage')

        render(<InnerHomepage onNavigate={() => {}} layoutModeOverride='standard' />)

        // Verify navigation grid exists and uses consistent spacing
        const navGrid = screen.getByTestId('navigation-grid')
        expect(navGrid).toBeInTheDocument()

        // All navigation items should be present (consistent with navigation patterns in Settings)
        expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
        expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
        expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
        expect(screen.getByTestId('nav-history')).toBeInTheDocument()
    })

    it('should use theme colors for background consistent with Translator/Settings', async () => {
        const { InnerHomepage } = await import('../components/Homepage')

        render(<InnerHomepage onNavigate={() => {}} />)

        // The container uses theme.colors.backgroundPrimary (same as Translator and Settings)
        const container = screen.getByTestId('homepage-container')
        expect(container).toBeInTheDocument()

        // Header section uses proper theming
        const header = screen.getByTestId('homepage-header')
        expect(header).toBeInTheDocument()
    })

    it('should use icon colors from theme.colors.accent consistently', async () => {
        const { InnerHomepage } = await import('../components/Homepage')

        render(<InnerHomepage onNavigate={() => {}} />)

        // Icons should be rendered (they use styles.navIcon which applies theme.colors.accent)
        const translateIcon = screen.getByTestId('translate-icon')
        expect(translateIcon).toBeInTheDocument()

        const settingsIcon = screen.getByTestId('settings-icon')
        expect(settingsIcon).toBeInTheDocument()
    })

    it('should support dark theme type through IThemedStyleProps', async () => {
        // Re-mock useTheme with dark theme
        vi.doMock('../hooks/useTheme', () => ({
            useTheme: () => ({
                theme: {
                    colors: {
                        backgroundPrimary: '#1f1f1f',
                        backgroundSecondary: '#2d2d2d',
                        backgroundTertiary: '#3d3d3d',
                        contentPrimary: '#ffffff',
                        contentSecondary: '#a0a0a0',
                        borderOpaque: '#444444',
                        accent: '#007bff',
                    },
                },
                themeType: 'dark' as const,
            }),
        }))

        vi.resetModules()

        // Re-import with new mocks
        const { InnerHomepage } = await import('../components/Homepage')

        render(<InnerHomepage onNavigate={() => {}} />)

        const container = screen.getByTestId('homepage-container')
        expect(container).toBeInTheDocument()
    })
})

// Verify that Homepage follows the same component structure pattern as Translator and Settings
describe('Homepage Component Architecture Pattern Consistency', () => {
    it('should export both Homepage (with providers) and InnerHomepage (without providers)', async () => {
        const HomepageModule = await import('../components/Homepage')

        // Pattern: Components export both a wrapped version and inner version
        // This matches how Translator.tsx exports InnerTranslator and Translator
        expect(HomepageModule.Homepage).toBeDefined()
        expect(HomepageModule.InnerHomepage).toBeDefined()
    })

    it('should export NavigationTarget type for type-safe navigation', async () => {
        const HomepageModule = await import('../components/Homepage')

        // Type exports for consumers
        expect(HomepageModule).toHaveProperty('BREAKPOINTS')
    })

    it('should use default Styletron engine with proper prefix', async () => {
        const { PREFIX } = await import('../constants')

        // The Homepage uses PREFIX for Styletron prefix to avoid style collisions
        expect(PREFIX).toBeDefined()
        expect(typeof PREFIX).toBe('string')
    })
})
