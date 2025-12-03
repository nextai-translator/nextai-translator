import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { InnerHomepage, NavigationTarget } from '../components/Homepage'

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
        themeType: 'light',
    }),
}))

// Mock LogoWithText component
vi.mock('../components/LogoWithText', () => ({
    default: () => <div data-testid='logo-with-text'>NextAI Translator</div>,
}))

describe('Cross-Platform Accessibility Tests', () => {
    let mockOnNavigate: ReturnType<typeof vi.fn>
    let originalInnerWidth: number
    let originalInnerHeight: number

    beforeEach(() => {
        mockOnNavigate = vi.fn()
        originalInnerWidth = window.innerWidth
        originalInnerHeight = window.innerHeight
    })

    afterEach(() => {
        // Restore original window dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            value: originalInnerWidth,
        })
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            value: originalInnerHeight,
        })
        vi.clearAllMocks()
    })

    // Test Case 1: Render Homepage in browser extension popup context (400x600px constraints)
    describe('Browser Extension Popup Context (400x600px)', () => {
        beforeEach(() => {
            // Simulate popup size constraints
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 400,
            })
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                value: 600,
            })
        })

        it('should render Homepage correctly within 400x600px popup constraints', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            // Verify homepage renders
            const homepageContainer = screen.getByTestId('homepage-container')
            expect(homepageContainer).toBeInTheDocument()

            // Verify all navigation items are visible
            expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
            expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
            expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
            expect(screen.getByTestId('nav-history')).toBeInTheDocument()

            // Verify navigation grid is present
            const navGrid = screen.getByTestId('navigation-grid')
            expect(navGrid).toBeInTheDocument()

            // Verify logo and tagline render in constrained space
            expect(screen.getByTestId('logo-with-text')).toBeInTheDocument()
            expect(screen.getByText('AI-powered translation at your fingertips')).toBeInTheDocument()
        })

        it('should have compact navigation grid for popup context', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            const navGrid = screen.getByTestId('navigation-grid')
            // Verify the grid has the expected structure with all 4 items
            const navItems = within(navGrid).getAllByRole('button')
            expect(navItems).toHaveLength(4)
        })

        it('should support touch/click interactions in popup', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            const translateNav = screen.getByTestId('nav-translate')
            fireEvent.click(translateNav)
            expect(mockOnNavigate).toHaveBeenCalledWith('translator')
        })
    })

    // Test Case 2: Render Homepage in options page context (full layout)
    describe('Browser Extension Options Page Context', () => {
        beforeEach(() => {
            // Simulate options page with more screen space (768px max width per PRD)
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 768,
            })
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                value: 900,
            })
        })

        it('should render Homepage correctly with full layout in options page', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            // Verify homepage renders with full layout
            const homepageContainer = screen.getByTestId('homepage-container')
            expect(homepageContainer).toBeInTheDocument()

            // All navigation items should be visible
            expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
            expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
            expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
            expect(screen.getByTestId('nav-history')).toBeInTheDocument()

            // Verify text labels are fully visible
            expect(screen.getByText('Translate')).toBeInTheDocument()
            expect(screen.getByText('Settings')).toBeInTheDocument()
            expect(screen.getByText('Vocabulary')).toBeInTheDocument()
            expect(screen.getByText('History')).toBeInTheDocument()
        })

        it('should have proper accessibility attributes for options page', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            const navGrid = screen.getByTestId('navigation-grid')
            expect(navGrid).toHaveAttribute('role', 'navigation')
            expect(navGrid).toHaveAttribute('aria-label', 'Main navigation')

            // All buttons should have proper roles
            const navItems = within(navGrid).getAllByRole('button')
            navItems.forEach((item) => {
                expect(item).toHaveAttribute('tabIndex', '0')
            })
        })
    })

    // Test Case 3: Render Homepage in Tauri desktop window (flexible sizes)
    describe('Tauri Desktop Window Context', () => {
        beforeEach(() => {
            // Simulate flexible desktop window size
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 1200,
            })
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                value: 800,
            })
        })

        it('should render Homepage correctly with desktop-specific features', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            // Verify homepage renders for desktop
            const homepageContainer = screen.getByTestId('homepage-container')
            expect(homepageContainer).toBeInTheDocument()

            // All navigation items should be visible
            expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
            expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
            expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
            expect(screen.getByTestId('nav-history')).toBeInTheDocument()

            // Verify icons are rendered
            expect(screen.getByTestId('translate-icon')).toBeInTheDocument()
            expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
            expect(screen.getByTestId('vocabulary-icon')).toBeInTheDocument()
            expect(screen.getByTestId('history-icon')).toBeInTheDocument()
        })

        it('should render logo and branding for desktop', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            expect(screen.getByTestId('logo-with-text')).toBeInTheDocument()
            expect(screen.getByText('AI-powered translation at your fingertips')).toBeInTheDocument()
        })

        it('should handle window resize gracefully', () => {
            const { rerender } = render(<InnerHomepage onNavigate={mockOnNavigate} />)

            // Resize to smaller window
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 600,
            })
            window.dispatchEvent(new Event('resize'))

            // Re-render and verify still works
            rerender(<InnerHomepage onNavigate={mockOnNavigate} />)

            expect(screen.getByTestId('homepage-container')).toBeInTheDocument()
            expect(screen.getByTestId('navigation-grid')).toBeInTheDocument()
        })
    })

    // Test Case 4: Navigate from Homepage to Settings in popup
    describe('Navigation in Popup Context', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 400,
            })
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                value: 600,
            })
        })

        it('should navigate to Settings correctly in popup context', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            const settingsNav = screen.getByTestId('nav-settings')
            fireEvent.click(settingsNav)

            expect(mockOnNavigate).toHaveBeenCalledTimes(1)
            expect(mockOnNavigate).toHaveBeenCalledWith('settings')
        })

        it('should support keyboard navigation in popup', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            const settingsNav = screen.getByTestId('nav-settings')

            // Test Enter key
            fireEvent.keyDown(settingsNav, { key: 'Enter' })
            expect(mockOnNavigate).toHaveBeenCalledWith('settings')

            mockOnNavigate.mockClear()

            // Test Space key
            fireEvent.keyDown(settingsNav, { key: ' ' })
            expect(mockOnNavigate).toHaveBeenCalledWith('settings')
        })

        it('should navigate to all targets from popup', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            const targets: Array<{ testId: string; expected: NavigationTarget }> = [
                { testId: 'nav-translate', expected: 'translator' },
                { testId: 'nav-settings', expected: 'settings' },
                { testId: 'nav-vocabulary', expected: 'vocabulary' },
                { testId: 'nav-history', expected: 'history' },
            ]

            targets.forEach(({ testId, expected }) => {
                mockOnNavigate.mockClear()
                const navItem = screen.getByTestId(testId)
                fireEvent.click(navItem)
                expect(mockOnNavigate).toHaveBeenCalledWith(expected)
            })
        })
    })

    // Test Case 5: Navigate from Homepage to Settings in desktop app
    describe('Navigation in Desktop App Context', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 1200,
            })
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                value: 800,
            })
        })

        it('should navigate to Settings correctly using desktop navigation', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            const settingsNav = screen.getByTestId('nav-settings')
            fireEvent.click(settingsNav)

            expect(mockOnNavigate).toHaveBeenCalledTimes(1)
            expect(mockOnNavigate).toHaveBeenCalledWith('settings')
        })

        it('should support keyboard navigation for accessibility in desktop', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            const settingsNav = screen.getByTestId('nav-settings')

            // Test Enter key navigation
            fireEvent.keyDown(settingsNav, { key: 'Enter' })
            expect(mockOnNavigate).toHaveBeenCalledWith('settings')
        })

        it('should have proper focus management for desktop', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            const navItems = screen.getAllByRole('button')

            // All navigation items should be focusable
            navItems.forEach((item) => {
                expect(item).toHaveAttribute('tabIndex', '0')
            })
        })

        it('should trigger navigation with correct target type for window management', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} />)

            // In desktop context, navigation targets should map to Tauri window labels
            const settingsNav = screen.getByTestId('nav-settings')
            fireEvent.click(settingsNav)

            // Verify the navigation target is 'settings' which corresponds to Tauri settings window
            expect(mockOnNavigate).toHaveBeenCalledWith('settings')
        })
    })

    // Additional cross-platform consistency tests
    describe('Cross-Platform Consistency', () => {
        it('should render identical content across all viewport sizes', () => {
            const viewports = [
                { width: 400, height: 600 }, // Popup
                { width: 768, height: 900 }, // Options
                { width: 1200, height: 800 }, // Desktop
            ]

            viewports.forEach(({ width, height }) => {
                Object.defineProperty(window, 'innerWidth', {
                    writable: true,
                    value: width,
                })
                Object.defineProperty(window, 'innerHeight', {
                    writable: true,
                    value: height,
                })

                const { unmount } = render(<InnerHomepage onNavigate={mockOnNavigate} />)

                // Core elements should always be present
                expect(screen.getByTestId('homepage-container')).toBeInTheDocument()
                expect(screen.getByTestId('navigation-grid')).toBeInTheDocument()
                expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
                expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
                expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
                expect(screen.getByTestId('nav-history')).toBeInTheDocument()
                expect(screen.getByTestId('logo-with-text')).toBeInTheDocument()

                unmount()
            })
        })

        it('should maintain consistent navigation behavior across platforms', () => {
            const viewports = [
                { width: 400, height: 600 },
                { width: 768, height: 900 },
                { width: 1200, height: 800 },
            ]

            viewports.forEach(({ width, height }) => {
                Object.defineProperty(window, 'innerWidth', {
                    writable: true,
                    value: width,
                })
                Object.defineProperty(window, 'innerHeight', {
                    writable: true,
                    value: height,
                })

                mockOnNavigate.mockClear()
                const { unmount } = render(<InnerHomepage onNavigate={mockOnNavigate} />)

                const settingsNav = screen.getByTestId('nav-settings')
                fireEvent.click(settingsNav)

                expect(mockOnNavigate).toHaveBeenCalledWith('settings')

                unmount()
            })
        })

        it('should have consistent accessibility features across all platforms', () => {
            const viewports = [
                { width: 400, height: 600 },
                { width: 768, height: 900 },
                { width: 1200, height: 800 },
            ]

            viewports.forEach(({ width, height }) => {
                Object.defineProperty(window, 'innerWidth', {
                    writable: true,
                    value: width,
                })
                Object.defineProperty(window, 'innerHeight', {
                    writable: true,
                    value: height,
                })

                const { unmount } = render(<InnerHomepage onNavigate={mockOnNavigate} />)

                // Navigation should have proper ARIA attributes
                const navGrid = screen.getByTestId('navigation-grid')
                expect(navGrid).toHaveAttribute('role', 'navigation')

                // All buttons should have proper accessibility
                const buttons = within(navGrid).getAllByRole('button')
                buttons.forEach((button) => {
                    expect(button).toHaveAttribute('tabIndex', '0')
                    expect(button).toHaveAttribute('aria-label')
                })

                unmount()
            })
        })
    })
})
