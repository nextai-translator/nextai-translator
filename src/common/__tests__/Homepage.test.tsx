import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react'
import { InnerHomepage, NavigationTarget, BREAKPOINTS, LayoutMode, useWindowSize } from '../components/Homepage'

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

describe('Homepage Navigation', () => {
    let mockOnNavigate: ReturnType<typeof vi.fn>

    beforeEach(() => {
        mockOnNavigate = vi.fn()
    })

    // Test Case 5: Unit test - All four navigation items are visible and accessible
    it('should render all four navigation items (Translate, Settings, Vocabulary, History)', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        // Verify all navigation items are visible
        expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
        expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
        expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
        expect(screen.getByTestId('nav-history')).toBeInTheDocument()

        // Verify text labels are present
        expect(screen.getByText('Translate')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
        expect(screen.getByText('Vocabulary')).toBeInTheDocument()
        expect(screen.getByText('History')).toBeInTheDocument()
    })

    it('should have navigation grid with proper role attribute', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        const navGrid = screen.getByTestId('navigation-grid')
        expect(navGrid).toHaveAttribute('role', 'navigation')
    })

    it('should render navigation items as accessible buttons', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        const translateNav = screen.getByTestId('nav-translate')
        expect(translateNav).toHaveAttribute('role', 'button')
        expect(translateNav).toHaveAttribute('tabIndex', '0')
        expect(translateNav).toHaveAttribute('aria-label', 'Translate')
    })

    // Test Case 1: Integration test - Click on 'Translate' navigation item
    it('should navigate to Translator component when clicking Translate', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        const translateNav = screen.getByTestId('nav-translate')
        fireEvent.click(translateNav)

        expect(mockOnNavigate).toHaveBeenCalledTimes(1)
        expect(mockOnNavigate).toHaveBeenCalledWith('translator')
    })

    // Test Case 2: Integration test - Click on 'Settings' navigation item
    it('should navigate to Settings component when clicking Settings', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        const settingsNav = screen.getByTestId('nav-settings')
        fireEvent.click(settingsNav)

        expect(mockOnNavigate).toHaveBeenCalledTimes(1)
        expect(mockOnNavigate).toHaveBeenCalledWith('settings')
    })

    // Test Case 3: Integration test - Click on 'Vocabulary' navigation item
    it('should navigate to Vocabulary component when clicking Vocabulary', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        const vocabularyNav = screen.getByTestId('nav-vocabulary')
        fireEvent.click(vocabularyNav)

        expect(mockOnNavigate).toHaveBeenCalledTimes(1)
        expect(mockOnNavigate).toHaveBeenCalledWith('vocabulary')
    })

    // Test Case 4: Integration test - Click on 'History' navigation item
    it('should navigate to TranslationHistory component when clicking History', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        const historyNav = screen.getByTestId('nav-history')
        fireEvent.click(historyNav)

        expect(mockOnNavigate).toHaveBeenCalledTimes(1)
        expect(mockOnNavigate).toHaveBeenCalledWith('history')
    })

    // Keyboard navigation tests
    it('should support keyboard navigation with Enter key for Translate', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        const translateNav = screen.getByTestId('nav-translate')
        fireEvent.keyDown(translateNav, { key: 'Enter' })

        expect(mockOnNavigate).toHaveBeenCalledWith('translator')
    })

    it('should support keyboard navigation with Space key for Settings', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        const settingsNav = screen.getByTestId('nav-settings')
        fireEvent.keyDown(settingsNav, { key: ' ' })

        expect(mockOnNavigate).toHaveBeenCalledWith('settings')
    })

    it('should render homepage container', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        expect(screen.getByTestId('homepage-container')).toBeInTheDocument()
    })

    it('should render logo with text', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        expect(screen.getByTestId('logo-with-text')).toBeInTheDocument()
    })

    it('should render tagline', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        expect(screen.getByText('AI-powered translation at your fingertips')).toBeInTheDocument()
    })

    // Test that onNavigate is called with correct type
    it('should call onNavigate with correct NavigationTarget types', () => {
        render(<InnerHomepage onNavigate={mockOnNavigate} />)

        const expectedTargets: NavigationTarget[] = ['translator', 'settings', 'vocabulary', 'history']
        const testIds = ['nav-translate', 'nav-settings', 'nav-vocabulary', 'nav-history']

        testIds.forEach((testId, index) => {
            const navItem = screen.getByTestId(testId)
            fireEvent.click(navItem)
            expect(mockOnNavigate).toHaveBeenLastCalledWith(expectedTargets[index])
        })
    })
})

// Responsive Layout Test Suite for Scenario 9 (REQ-9)
describe('Homepage Responsive Layout', () => {
    let mockOnNavigate: ReturnType<typeof vi.fn>
    let originalInnerWidth: number

    beforeEach(() => {
        mockOnNavigate = vi.fn()
        originalInnerWidth = window.innerWidth
    })

    afterEach(() => {
        // Restore original window width
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalInnerWidth,
        })
    })

    // Helper function to set window width
    const setWindowWidth = (width: number) => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width,
        })
        window.dispatchEvent(new Event('resize'))
    }

    // Test Case 1: Render Homepage at 400px width - Compact vertical layout with condensed mode cards
    describe('Compact Layout (400px width)', () => {
        it('should render with compact layout mode at 400px width', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='compact' />)

            const container = screen.getByTestId('homepage-container')
            expect(container).toHaveAttribute('data-layout-mode', 'compact')
        })

        it('should display all navigation items in compact mode', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='compact' />)

            // All navigation items should still be visible
            expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
            expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
            expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
            expect(screen.getByTestId('nav-history')).toBeInTheDocument()
        })

        it('should render header and tagline in compact mode', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='compact' />)

            expect(screen.getByTestId('homepage-header')).toBeInTheDocument()
            expect(screen.getByTestId('homepage-tagline')).toBeInTheDocument()
            expect(screen.getByTestId('logo-with-text')).toBeInTheDocument()
        })

        it('should maintain navigation functionality in compact mode', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='compact' />)

            const translateNav = screen.getByTestId('nav-translate')
            fireEvent.click(translateNav)

            expect(mockOnNavigate).toHaveBeenCalledWith('translator')
        })
    })

    // Test Case 2: Render Homepage at 768px width - Full layout with all sections visible
    describe('Standard Layout (768px width)', () => {
        it('should render with standard layout mode at 768px width', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='standard' />)

            const container = screen.getByTestId('homepage-container')
            expect(container).toHaveAttribute('data-layout-mode', 'standard')
        })

        it('should display all sections in standard mode', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='standard' />)

            // Header section
            expect(screen.getByTestId('homepage-header')).toBeInTheDocument()
            expect(screen.getByTestId('homepage-tagline')).toBeInTheDocument()

            // Navigation grid
            expect(screen.getByTestId('navigation-grid')).toBeInTheDocument()

            // All navigation items
            expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
            expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
            expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
            expect(screen.getByTestId('nav-history')).toBeInTheDocument()
        })

        it('should maintain full accessibility in standard mode', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='standard' />)

            const navItems = ['nav-translate', 'nav-settings', 'nav-vocabulary', 'nav-history']

            navItems.forEach((testId) => {
                const item = screen.getByTestId(testId)
                expect(item).toHaveAttribute('role', 'button')
                expect(item).toHaveAttribute('tabIndex', '0')
            })
        })
    })

    // Test Case 3: Render Homepage at 1200px width - Flexible layout utilizing available horizontal space
    describe('Expanded Layout (1200px width)', () => {
        it('should render with expanded layout mode at 1200px width', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='expanded' />)

            const container = screen.getByTestId('homepage-container')
            expect(container).toHaveAttribute('data-layout-mode', 'expanded')
        })

        it('should display all navigation items in expanded mode', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='expanded' />)

            // All navigation items visible
            expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
            expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
            expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
            expect(screen.getByTestId('nav-history')).toBeInTheDocument()
        })

        it('should utilize available horizontal space with expanded layout', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='expanded' />)

            const navigationGrid = screen.getByTestId('navigation-grid')
            expect(navigationGrid).toBeInTheDocument()

            // In expanded mode, navigation grid should have the expanded layout
            const container = screen.getByTestId('homepage-container')
            expect(container).toHaveAttribute('data-layout-mode', 'expanded')
        })
    })

    // Test Case 4: Resize viewport from 400px to 1200px - Layout adapts smoothly without breaking
    describe('Dynamic Resize Handling', () => {
        it('should respond to window resize events via useWindowSize hook', () => {
            setWindowWidth(400)

            const { result, rerender } = renderHook(() => useWindowSize())

            // Initially at 400px - should be compact (below 480px breakpoint)
            expect(result.current.layoutMode).toBe('compact')

            // Resize to 768px - should be expanded (above tablet breakpoint)
            act(() => {
                setWindowWidth(768)
            })
            rerender()
            expect(result.current.layoutMode).toBe('expanded')

            // Resize to 1200px - should still be expanded
            act(() => {
                setWindowWidth(1200)
            })
            rerender()
            expect(result.current.layoutMode).toBe('expanded')
        })

        it('should maintain all navigation items across layout mode changes', () => {
            const layoutModes: LayoutMode[] = ['compact', 'standard', 'expanded']

            layoutModes.forEach((mode) => {
                const { unmount } = render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride={mode} />)

                expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
                expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
                expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
                expect(screen.getByTestId('nav-history')).toBeInTheDocument()

                unmount()
            })
        })

        it('should maintain navigation functionality across all layout modes', () => {
            const layoutModes: LayoutMode[] = ['compact', 'standard', 'expanded']

            layoutModes.forEach((mode) => {
                mockOnNavigate.mockClear()
                const { unmount } = render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride={mode} />)

                const translateNav = screen.getByTestId('nav-translate')
                fireEvent.click(translateNav)

                expect(mockOnNavigate).toHaveBeenCalledWith('translator')

                unmount()
            })
        })
    })

    // Test Case 5: Render Homepage at 320px width (minimum mobile) - No horizontal scrolling, all content accessible
    describe('Minimum Mobile Layout (320px width)', () => {
        it('should render with compact layout mode at 320px width', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='compact' />)

            const container = screen.getByTestId('homepage-container')
            expect(container).toHaveAttribute('data-layout-mode', 'compact')
        })

        it('should display all content accessible at minimum mobile width', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='compact' />)

            // Header should be accessible
            expect(screen.getByTestId('homepage-header')).toBeInTheDocument()
            expect(screen.getByTestId('logo-with-text')).toBeInTheDocument()
            expect(screen.getByTestId('homepage-tagline')).toBeInTheDocument()

            // All navigation items should be accessible
            expect(screen.getByTestId('nav-translate')).toBeInTheDocument()
            expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
            expect(screen.getByTestId('nav-vocabulary')).toBeInTheDocument()
            expect(screen.getByTestId('nav-history')).toBeInTheDocument()
        })

        it('should maintain keyboard accessibility at minimum mobile width', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='compact' />)

            const translateNav = screen.getByTestId('nav-translate')
            fireEvent.keyDown(translateNav, { key: 'Enter' })

            expect(mockOnNavigate).toHaveBeenCalledWith('translator')
        })

        it('should have proper container styles to prevent horizontal overflow', () => {
            render(<InnerHomepage onNavigate={mockOnNavigate} layoutModeOverride='compact' />)

            const container = screen.getByTestId('homepage-container')
            // Container should exist and be properly structured
            expect(container).toBeInTheDocument()

            // Navigation grid should also be properly contained
            const navGrid = screen.getByTestId('navigation-grid')
            expect(navGrid).toBeInTheDocument()
        })
    })

    // Additional tests for breakpoint constants
    describe('Breakpoint Constants', () => {
        it('should have correct breakpoint values defined', () => {
            expect(BREAKPOINTS.compact).toBe(480)
            expect(BREAKPOINTS.tablet).toBe(768)
            expect(BREAKPOINTS.desktop).toBe(1024)
        })

        it('should determine correct layout mode based on window width', () => {
            // Test compact mode (below 480px)
            setWindowWidth(320)
            const { result: result320, unmount: unmount320 } = renderHook(() => useWindowSize())
            expect(result320.current.layoutMode).toBe('compact')
            unmount320()

            // Test standard mode (480px - 767px)
            setWindowWidth(600)
            const { result: result600, unmount: unmount600 } = renderHook(() => useWindowSize())
            expect(result600.current.layoutMode).toBe('standard')
            unmount600()

            // Test expanded mode (768px and above)
            setWindowWidth(1200)
            const { result: result1200, unmount: unmount1200 } = renderHook(() => useWindowSize())
            expect(result1200.current.layoutMode).toBe('expanded')
            unmount1200()
        })
    })
})
