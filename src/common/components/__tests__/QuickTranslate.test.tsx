import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuickActionCard } from '../QuickActionCard'
import { StyletronProvider } from 'styletron-react'
import { Client as Styletron } from 'styletron-engine-atomic'

const engine = new Styletron()

const renderWithProviders = (component: React.ReactElement) => {
    return render(<StyletronProvider value={engine}>{component}</StyletronProvider>)
}

describe('Quick Translation Feature', () => {
    describe('Test Case 1: Basic Translation on Homepage', () => {
        it('should translate text and show result without leaving the page', async () => {
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            // Click to expand the card
            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            expect(card).toBeDefined()
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            // Enter text
            const input = screen.getByPlaceholderText(/enter text/i) as HTMLTextAreaElement
            fireEvent.change(input, { target: { value: 'Hello' } })
            expect(input.value).toBe('Hello')

            // Select language (optional, should default to English)
            const submitButton = screen.getByRole('button', { name: /submit/i })
            fireEvent.click(submitButton)

            expect(onAction).toHaveBeenCalledWith('Hello', 'en')
        })
    })

    describe('Test Case 2: Long Text Handling (500+ characters)', () => {
        it('should handle long text appropriately and allow translation', async () => {
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            // Create 500 character text
            const longText = 'Lorem ipsum dolor sit amet, '.repeat(17) // ~510 chars
            const input = screen.getByPlaceholderText(/enter text/i) as HTMLTextAreaElement
            fireEvent.change(input, { target: { value: longText } })

            expect(input.value).toBe(longText)
            expect(longText.length).toBeGreaterThan(500)

            const submitButton = screen.getByRole('button', { name: /submit/i })
            fireEvent.click(submitButton)

            expect(onAction).toHaveBeenCalledWith(longText, 'en')
        })
    })

    describe('Test Case 3: Enter Key Submission', () => {
        it('should submit translation with Ctrl+Enter key combination', async () => {
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            const input = screen.getByPlaceholderText(/enter text/i) as HTMLTextAreaElement
            fireEvent.change(input, { target: { value: 'Test text' } })

            // Press Ctrl+Enter
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', ctrlKey: true })

            expect(onAction).toHaveBeenCalledWith('Test text', 'en')
        })

        it('should NOT submit with Enter key alone (requires Ctrl/Cmd)', async () => {
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            const input = screen.getByPlaceholderText(/enter text/i) as HTMLTextAreaElement
            fireEvent.change(input, { target: { value: 'Test text' } })

            // Press Enter alone (no Ctrl)
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

            // Should NOT submit
            expect(onAction).not.toHaveBeenCalled()
        })
    })

    describe('Test Case 4: Empty Field Validation', () => {
        it('should show validation and disable submit button for empty field', async () => {
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            // Do not enter any text
            const submitButton = screen.getByRole('button', { name: /submit/i })

            // Button should be disabled
            expect(submitButton.hasAttribute('disabled')).toBe(true)

            // Try to submit
            fireEvent.click(submitButton)

            // Should NOT call onAction
            expect(onAction).not.toHaveBeenCalled()
        })

        it('should enable submit button when text is entered', async () => {
            renderWithProviders(<QuickActionCard type='translate' />)

            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            const input = screen.getByPlaceholderText(/enter text/i) as HTMLTextAreaElement
            const submitButton = screen.getByRole('button', { name: /submit/i })

            // Initially disabled
            expect(submitButton.hasAttribute('disabled')).toBe(true)

            // Enter text
            fireEvent.change(input, { target: { value: 'Hello' } })

            // Now enabled
            expect(submitButton.hasAttribute('disabled')).toBe(false)
        })
    })

    describe('Test Case 5: Language Settings Respect', () => {
        it('should use selected target language from dropdown', async () => {
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            const input = screen.getByPlaceholderText(/enter text/i) as HTMLTextAreaElement
            fireEvent.change(input, { target: { value: 'Bonjour' } })

            // Change language to Spanish
            const languageSelector = screen.getByRole('combobox')
            fireEvent.change(languageSelector, { target: { value: 'es' } })

            const submitButton = screen.getByRole('button', { name: /submit/i })
            fireEvent.click(submitButton)

            // Should call with Spanish language code
            expect(onAction).toHaveBeenCalledWith('Bonjour', 'es')
        })
    })

    describe('Test Case 6: Compact/Popup Mode Compatibility', () => {
        it('should work in compact popup layout', async () => {
            const onAction = vi.fn()
            renderWithProviders(
                <div style={{ width: '350px', height: '500px' }}>
                    <QuickActionCard type='translate' onAction={onAction} />
                </div>
            )

            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            expect(card).toBeDefined()
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            // Should fit within popup dimensions
            const input = screen.getByPlaceholderText(/enter text/i) as HTMLTextAreaElement
            fireEvent.change(input, { target: { value: 'Test' } })

            const submitButton = screen.getByRole('button', { name: /submit/i })
            fireEvent.click(submitButton)

            expect(onAction).toHaveBeenCalled()
        })
    })

    describe('Additional: Cleanup and UX', () => {
        it('should clear text after successful submission', async () => {
            const onAction = vi.fn()
            renderWithProviders(<QuickActionCard type='translate' onAction={onAction} />)

            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            const input = screen.getByPlaceholderText(/enter text/i) as HTMLTextAreaElement
            fireEvent.change(input, { target: { value: 'Temporary text' } })
            expect(input.value).toBe('Temporary text')

            const submitButton = screen.getByRole('button', { name: /submit/i })
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(input.value).toBe('')
            })
        })

        it('should collapse card when cancel is clicked', async () => {
            renderWithProviders(<QuickActionCard type='translate' />)

            const card = screen.getByText(/translate/i).closest('div[class*="card"]')
            fireEvent.click(card!)

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/enter text/i)).toBeDefined()
            })

            const cancelButton = screen.getByRole('button', { name: /cancel/i })
            fireEvent.click(cancelButton)

            await waitFor(() => {
                expect(screen.queryByPlaceholderText(/enter text/i)).toBeNull()
            })
        })
    })
})
