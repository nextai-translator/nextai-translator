import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuickActionCard } from '../QuickActionCard'
import { StyletronProvider } from 'styletron-react'
import { Client as Styletron } from 'styletron-engine-atomic'

const engine = new Styletron()

const renderWithProviders = (component: React.ReactElement) => {
    return render(<StyletronProvider value={engine}>{component}</StyletronProvider>)
}

describe('QuickActionCard', () => {
    describe('Scenario 2: Quick Action Cards - Translation', () => {
        it('should render translate card with icon and label', () => {
            // Test Case ID: 2.1
            // Validates REQ-2: Quick Action Cards for translation
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-translate')
            expect(card).toBeDefined()
            expect(screen.getByText(/translate/i)).toBeDefined()
        })

        it('should show text input and language selector when clicked', async () => {
            // Test Case ID: 2.2
            // Validates that clicking reveals input interface
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-translate')
            fireEvent.click(card)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
                expect(screen.getByRole('combobox', { name: /target language/i })).toBeDefined()
            })
        })

        it('should initiate translation when text entered and submitted', async () => {
            // Test Case ID: 2.3
            // Validates end-to-end translation from homepage
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-translate')
            fireEvent.click(card)

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/enter text/i)
                fireEvent.change(input, { target: { value: 'Hello' } })

                const languageSelector = screen.getByRole('combobox', { name: /target language/i })
                fireEvent.change(languageSelector, { target: { value: 'es' } })

                const submitButton = screen.getByRole('button', { name: /submit|go|translate/i })
                fireEvent.click(submitButton)
            })

            expect(onAction).toHaveBeenCalledWith('Hello', 'es')
        })

        it('should be keyboard accessible', () => {
            // Test Case ID: 2.4
            // Validates NFR-2: Keyboard accessibility
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-translate')
            expect(card.getAttribute('tabIndex')).not.toBe('-1')

            // Should activate on Enter key
            card.focus()
            fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })

            // Input field should appear
            waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })
        })
    })

    describe('Scenario 3: Quick Action Cards - Polish', () => {
        it('should render polish card with icon and label', () => {
            // Test Case ID: 3.1
            // Validates REQ-2: Quick Action Cards for polishing
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='polish' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-polish')
            expect(card).toBeDefined()
            expect(screen.getByText(/polish/i)).toBeDefined()
        })

        it('should show text input when clicked', async () => {
            // Test Case ID: 3.2
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='polish' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-polish')
            fireEvent.click(card)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })
        })

        it('should initiate polishing when text entered and submitted', async () => {
            // Test Case ID: 3.3
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='polish' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-polish')
            fireEvent.click(card)

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/enter text/i)
                fireEvent.change(input, { target: { value: 'me go store buy thing' } })

                const submitButton = screen.getByRole('button', { name: /submit|go|polish/i })
                fireEvent.click(submitButton)
            })

            expect(onAction).toHaveBeenCalledWith('me go store buy thing', expect.anything())
        })
    })

    describe('Scenario 4: Quick Action Cards - Summarize', () => {
        it('should render summarize card with icon and label', () => {
            // Test Case ID: 4.1
            // Validates REQ-2: Quick Action Cards for summarization
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='summarize' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-summarize')
            expect(card).toBeDefined()
            expect(screen.getByText(/summarize/i)).toBeDefined()
        })

        it('should show text input when clicked', async () => {
            // Test Case ID: 4.2
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='summarize' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-summarize')
            fireEvent.click(card)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })
        })

        it('should handle longer text inputs efficiently', async () => {
            // Test Case ID: 4.3
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='summarize' onAction={onAction} />)

            const longText = 'Lorem ipsum '.repeat(100) // ~1200 characters

            const card = screen.getByTestId('quick-action-card-summarize')
            fireEvent.click(card)

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/enter text/i)
                fireEvent.change(input, { target: { value: longText } })

                const submitButton = screen.getByRole('button', { name: /submit|go|summarize/i })
                fireEvent.click(submitButton)
            })

            expect(onAction).toHaveBeenCalledWith(longText, expect.anything())
        })
    })

    describe('Scenario 17: Error Handling - Quick Action Failures', () => {
        it('should display error message when action fails with no API key', async () => {
            // Test Case ID: 17.1
            const onAction = vi.fn().mockRejectedValue({ code: 'NO_API_KEY' })
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-translate')
            fireEvent.click(card)

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/enter text/i)
                fireEvent.change(input, { target: { value: 'Hello' } })

                const submitButton = screen.getByRole('button', { name: /submit|go|translate/i })
                fireEvent.click(submitButton)
            })

            await waitFor(() => {
                expect(screen.getByText(/api key/i)).toBeDefined()
            })
        })

        it('should display error message on network failure', async () => {
            // Test Case ID: 17.2
            const onAction = vi.fn().mockRejectedValue({ code: 'NETWORK_ERROR' })
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-translate')
            fireEvent.click(card)

            await waitFor(() => {
                const input = screen.getByPlaceholderText(/enter text/i)
                fireEvent.change(input, { target: { value: 'Hello' } })

                const submitButton = screen.getByRole('button', { name: /submit|go|translate/i })
                fireEvent.click(submitButton)
            })

            await waitFor(() => {
                expect(screen.getByText(/network error/i)).toBeDefined()
            })
        })

        it('should show validation error when submitting empty text', async () => {
            // Test Case ID: 17.4
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByTestId('quick-action-card-translate')
            fireEvent.click(card)

            await waitFor(() => {
                const submitButton = screen.getByRole('button', { name: /submit|go|translate/i })
                fireEvent.click(submitButton)
            })

            await waitFor(() => {
                expect(screen.getByText(/required|empty|enter text/i)).toBeDefined()
            })

            expect(onAction).not.toHaveBeenCalled()
        })
    })
})
