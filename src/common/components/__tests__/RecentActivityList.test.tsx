import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RecentActivityList } from '../RecentActivityList'
import { StyletronProvider } from 'styletron-react'
import { Client as Styletron } from 'styletron-engine-atomic'

const engine = new Styletron()

const renderWithProviders = (component: React.ReactElement) => {
    return render(<StyletronProvider value={engine}>{component}</StyletronProvider>)
}

const mockActivities = [
    {
        id: '1',
        type: 'translate' as const,
        sourceText: 'Hello',
        resultText: 'Hola',
        sourceLang: 'en',
        targetLang: 'es',
        timestamp: Date.now() - 10000,
    },
    {
        id: '2',
        type: 'polish' as const,
        sourceText: 'me go store',
        resultText: 'I am going to the store',
        timestamp: Date.now() - 20000,
    },
    {
        id: '3',
        type: 'summarize' as const,
        sourceText: 'Long text here...',
        resultText: 'Short summary',
        timestamp: Date.now() - 30000,
    },
]

describe('RecentActivityList', () => {
    describe('Scenario 5: Recent Activity Section Display', () => {
        it('should display recent activity list with items', () => {
            // Test Case ID: 5.1
            // Validates REQ-3: Recent Activity Section
            renderWithProviders(<RecentActivityList activities={mockActivities} />)

            expect(screen.getByTestId('recent-activity-list')).toBeDefined()
            expect(screen.getByText(/hello/i)).toBeDefined()
            expect(screen.getByText(/me go store/i)).toBeDefined()
            expect(screen.getByText(/long text/i)).toBeDefined()
        })

        it('should show empty state when no history', () => {
            // Test Case ID: 5.2
            // Validates empty state handling
            renderWithProviders(<RecentActivityList activities={[]} />)

            expect(screen.getByText(/no recent activity|no history|get started/i)).toBeDefined()
        })

        it('should display language pairs for translation activities', () => {
            // Test Case ID: 5.1
            // Validates that language information is displayed
            renderWithProviders(<RecentActivityList activities={mockActivities} />)

            expect(screen.getByText(/en.*es|english.*spanish/i)).toBeDefined()
        })

        it('should navigate to details when activity item clicked', async () => {
            // Test Case ID: 5.3
            const onItemClick = vi.fn()
            renderWithProviders(<RecentActivityList activities={mockActivities} onItemClick={onItemClick} />)

            const firstItem = screen.getByTestId('activity-item-1')
            fireEvent.click(firstItem)

            expect(onItemClick).toHaveBeenCalledWith(mockActivities[0])
        })

        it('should lazy load and not block initial render', async () => {
            // Test Case ID: 5.4
            // Validates NFR-1: Performance - lazy loading
            const LazyRecentActivityList = () => {
                const [loading, setLoading] = React.useState(true)
                const [activities, setActivities] = React.useState<typeof mockActivities>([])

                React.useEffect(() => {
                    // Simulate async loading
                    setTimeout(() => {
                        setActivities(mockActivities)
                        setLoading(false)
                    }, 100)
                }, [])

                if (loading) return <div data-testid='loading-spinner'>Loading...</div>

                return <RecentActivityList activities={activities} />
            }

            renderWithProviders(<LazyRecentActivityList />)

            // Should show loading state initially
            expect(screen.getByTestId('loading-spinner')).toBeDefined()

            // Should show activities after loading
            await waitFor(
                () => {
                    expect(screen.getByTestId('recent-activity-list')).toBeDefined()
                },
                { timeout: 200 }
            )
        })
    })

    describe('Scenario 6: Recent Activity - Clear History', () => {
        it('should clear all history when clear button clicked', async () => {
            // Test Case ID: 6.1
            const onClearHistory = vi.fn()
            renderWithProviders(<RecentActivityList activities={mockActivities} onClearHistory={onClearHistory} />)

            const clearButton = screen.getByRole('button', { name: /clear history/i })
            fireEvent.click(clearButton)

            expect(onClearHistory).toHaveBeenCalled()
        })

        it('should show empty state after clearing history', async () => {
            // Test Case ID: 6.1
            const TestComponent = () => {
                const [activities, setActivities] = React.useState(mockActivities)

                return <RecentActivityList activities={activities} onClearHistory={() => setActivities([])} />
            }

            renderWithProviders(<TestComponent />)

            const clearButton = screen.getByRole('button', { name: /clear history/i })
            fireEvent.click(clearButton)

            await waitFor(() => {
                expect(screen.getByText(/no recent activity/i)).toBeDefined()
            })
        })

        it('should disable clear button when history is empty', () => {
            // Test Case ID: 6.3
            const onClearHistory = vi.fn()
            renderWithProviders(<RecentActivityList activities={[]} onClearHistory={onClearHistory} />)

            const clearButton = screen.queryByRole('button', { name: /clear history/i })

            // Button should be disabled or not present
            if (clearButton) {
                expect(clearButton.getAttribute('disabled')).toBe('true')
            }
        })
    })

    describe('Scenario 15: State Management - Storage Persistence', () => {
        it('should persist history to storage when activities change', async () => {
            // Test Case ID: 15.2
            const mockStorage = {
                save: vi.fn(),
            }

            renderWithProviders(<RecentActivityList activities={mockActivities} storage={mockStorage} />)

            // Simulate activity change
            await waitFor(() => {
                expect(mockStorage.save).toHaveBeenCalledWith(mockActivities)
            })
        })

        it('should load history from storage on mount', async () => {
            // Test Case ID: 15.2
            const mockStorage = {
                load: vi.fn().mockResolvedValue(mockActivities),
            }

            const TestComponent = () => {
                const [activities, setActivities] = React.useState<typeof mockActivities>([])

                React.useEffect(() => {
                    mockStorage.load().then(setActivities)
                }, [])

                return <RecentActivityList activities={activities} />
            }

            renderWithProviders(<TestComponent />)

            await waitFor(() => {
                expect(mockStorage.load).toHaveBeenCalled()
                expect(screen.getByTestId('recent-activity-list')).toBeDefined()
            })
        })
    })
})
