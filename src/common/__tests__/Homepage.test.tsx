import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
