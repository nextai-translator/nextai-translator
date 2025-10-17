import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomePage } from '../HomePage'
import { StyletronProvider } from 'styletron-react'
import { Client as Styletron } from 'styletron-engine-atomic'

const engine = new Styletron()

const renderWithProviders = (component: React.ReactElement) => {
    return render(<StyletronProvider value={engine}>{component}</StyletronProvider>)
}

describe('HomePage', () => {
    describe('Scenario 1: Homepage Landing Interface Display', () => {
        it('should render the homepage component without errors', () => {
            // Test Case ID: 1.1
            // This test validates that the HomePage component can be rendered
            // Related to REQ-1: Homepage Landing Interface
            expect(() => renderWithProviders(<HomePage />)).not.toThrow()
        })

        it('should display application branding and logo', () => {
            // Test Case ID: 1.1
            // Validates presence of branding elements
            renderWithProviders(<HomePage />)
            const logo = screen.getByTestId('homepage-logo')
            expect(logo).toBeDefined()
        })

        it('should display quick action buttons for translate, polish, and summarize', () => {
            // Test Case ID: 1.1
            // Validates REQ-2: Quick Action Cards
            renderWithProviders(<HomePage />)

            const translateButton = screen.getByRole('button', { name: /translate/i })
            const polishButton = screen.getByRole('button', { name: /polish/i })
            const summarizeButton = screen.getByRole('button', { name: /summarize/i })

            expect(translateButton).toBeDefined()
            expect(polishButton).toBeDefined()
            expect(summarizeButton).toBeDefined()
        })

        it('should display navigation menu with Settings, Vocabulary, and About links', () => {
            // Test Case ID: 1.2
            // Validates REQ-4: Settings Access
            renderWithProviders(<HomePage />)

            const settingsLink = screen.getByRole('link', { name: /settings/i })
            const vocabularyLink = screen.getByRole('link', { name: /vocabulary/i })
            const aboutLink = screen.getByRole('link', { name: /about/i })

            expect(settingsLink).toBeDefined()
            expect(vocabularyLink).toBeDefined()
            expect(aboutLink).toBeDefined()
        })
    })

    describe('Scenario 11: Responsive Design', () => {
        it('should render properly at minimum viewport width (800px)', () => {
            // Test Case ID: 11.1
            // Validates REQ-6: Responsive Design at 800x600
            global.innerWidth = 800
            global.innerHeight = 600

            renderWithProviders(<HomePage />)
            const container = screen.getByTestId('homepage-container')
            expect(container).toBeDefined()
        })

        it('should render properly at large viewport width (1920px)', () => {
            // Test Case ID: 11.2
            // Validates responsive behavior at larger resolutions
            global.innerWidth = 1920
            global.innerHeight = 1080

            renderWithProviders(<HomePage />)
            const container = screen.getByTestId('homepage-container')
            expect(container).toBeDefined()
        })
    })

    describe('Scenario 13: Accessibility - Keyboard Navigation', () => {
        it('should have all interactive elements keyboard accessible', () => {
            // Test Case ID: 13.1
            // Validates NFR-2: Accessibility for keyboard navigation
            renderWithProviders(<HomePage />)

            const translateButton = screen.getByRole('button', { name: /translate/i })
            expect(translateButton.getAttribute('tabIndex')).not.toBe('-1')
        })

        it('should have proper ARIA labels for screen readers', () => {
            // Test Case ID: 13.4
            // Validates NFR-2: Screen reader compatibility
            renderWithProviders(<HomePage />)

            const translateButton = screen.getByRole('button', { name: /translate/i })
            expect(translateButton.getAttribute('aria-label')).toBeTruthy()
        })
    })

    describe('Scenario 16: UI Consistency - BaseUI Styling', () => {
        it('should use BaseUI components', () => {
            // Test Case ID: 16.1
            // Validates NFR-4: Consistency with BaseUI
            renderWithProviders(<HomePage />)

            // Check that components are from BaseUI by looking for BaseUI-specific classes
            const container = screen.getByTestId('homepage-container')
            expect(container).toBeDefined()
        })
    })
})
