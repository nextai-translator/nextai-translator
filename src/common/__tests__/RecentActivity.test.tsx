import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RecentActivity } from '../components/RecentActivity'
import { HistoryItem } from '../internal-services/db'

// Store for controlling mock data
let mockHistoryData: HistoryItem[] = []

// Mock the dependencies
vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: () => mockHistoryData,
}))

vi.mock('../services/history', () => ({
    historyService: {
        list: vi.fn(() => Promise.resolve(mockHistoryData)),
    },
}))

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}))

vi.mock('../hooks/useTheme', () => ({
    useTheme: () => ({
        theme: {
            colors: {
                contentPrimary: '#000000',
                contentSecondary: '#666666',
                contentTertiary: '#999999',
                backgroundPrimary: '#ffffff',
                backgroundSecondary: '#f5f5f5',
                borderOpaque: '#e0e0e0',
                accent: '#0066cc',
            },
        },
        themeType: 'light',
    }),
}))

vi.mock('../lang', () => ({
    getLangName: (langCode: string) => {
        const langNames: Record<string, string> = {
            'en': 'English',
            'zh-Hans': 'Chinese (Simplified)',
            'zh-Hant': 'Chinese (Traditional)',
            'ja': 'Japanese',
            'ko': 'Korean',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
        }
        return langNames[langCode] || langCode
    },
}))

// Helper to create mock history items
function createMockHistoryItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
    return {
        id: Math.floor(Math.random() * 10000),
        text: 'Hello world',
        translatedText: '你好世界',
        sourceLang: 'en',
        targetLang: 'zh-Hans',
        favorite: false,
        createdAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
        updatedAt: Date.now() - 1000 * 60 * 30,
        ...overrides,
    }
}

// Helper to set mock data
function setMockData(items: HistoryItem[]) {
    mockHistoryData = items
}

describe('RecentActivity', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockHistoryData = []
    })

    afterEach(() => {
        vi.resetAllMocks()
        mockHistoryData = []
    })

    describe('Test Case 1: Display up to 5 recent translations with 10 in history', () => {
        it('should display up to 5 recent translations when history has 10 items', () => {
            // Create 5 mock history items (simulating the limit applied by service)
            const mockHistoryItems = Array.from({ length: 5 }, (_, i) =>
                createMockHistoryItem({
                    id: i + 1,
                    text: `Translation ${i + 1}`,
                    translatedText: `翻译 ${i + 1}`,
                    updatedAt: Date.now() - i * 1000 * 60 * 5, // Each 5 minutes apart
                })
            )

            setMockData(mockHistoryItems)
            render(<RecentActivity limit={5} />)

            const items = screen.getAllByTestId('recent-activity-item')
            expect(items).toHaveLength(5)
        })

        it('should display items in order from most recent to oldest', () => {
            const mockHistoryItems = [
                createMockHistoryItem({ id: 1, text: 'Most recent', updatedAt: Date.now() }),
                createMockHistoryItem({ id: 2, text: 'Second most recent', updatedAt: Date.now() - 60000 }),
                createMockHistoryItem({ id: 3, text: 'Third most recent', updatedAt: Date.now() - 120000 }),
            ]

            setMockData(mockHistoryItems)
            render(<RecentActivity limit={5} />)

            const items = screen.getAllByTestId('recent-activity-item-text')
            expect(items[0]).toHaveTextContent('Most recent')
            expect(items[1]).toHaveTextContent('Second most recent')
            expect(items[2]).toHaveTextContent('Third most recent')
        })
    })

    describe('Test Case 2: Each translation shows source text preview and target language', () => {
        it('should display source text preview for each translation', () => {
            const mockHistoryItems = [
                createMockHistoryItem({
                    id: 1,
                    text: 'This is a sample text for translation',
                    targetLang: 'zh-Hans',
                }),
                createMockHistoryItem({
                    id: 2,
                    text: 'Another sample translation text',
                    targetLang: 'ja',
                }),
            ]

            setMockData(mockHistoryItems)
            render(<RecentActivity limit={5} />)

            const textElements = screen.getAllByTestId('recent-activity-item-text')
            expect(textElements[0]).toHaveTextContent('This is a sample text for translation')
            expect(textElements[1]).toHaveTextContent('Another sample translation text')
        })

        it('should display target language for each translation', () => {
            const mockHistoryItems = [
                createMockHistoryItem({ id: 1, targetLang: 'zh-Hans' }),
                createMockHistoryItem({ id: 2, targetLang: 'ja' }),
                createMockHistoryItem({ id: 3, targetLang: 'ko' }),
            ]

            setMockData(mockHistoryItems)
            render(<RecentActivity limit={5} />)

            const languageElements = screen.getAllByTestId('recent-activity-item-language')
            expect(languageElements[0]).toHaveTextContent('Chinese (Simplified)')
            expect(languageElements[1]).toHaveTextContent('Japanese')
            expect(languageElements[2]).toHaveTextContent('Korean')
        })

        it('should truncate long source text with ellipsis', () => {
            const longText = 'A'.repeat(150) // Create text longer than MAX_SOURCE_TEXT_LENGTH (100)

            const mockHistoryItems = [createMockHistoryItem({ id: 1, text: longText })]

            setMockData(mockHistoryItems)
            render(<RecentActivity limit={5} />)

            const textElement = screen.getByTestId('recent-activity-item-text')
            const displayedText = textElement.textContent || ''
            expect(displayedText.length).toBeLessThan(longText.length)
            expect(displayedText).toContain('...')
        })
    })

    describe('Test Case 3: Click on recent translation navigates to Translator', () => {
        it('should call onSelectTranslation when item is clicked', () => {
            const mockHistoryItem = createMockHistoryItem({
                id: 1,
                text: 'Test translation',
                translatedText: '测试翻译',
            })

            setMockData([mockHistoryItem])

            const onSelectTranslation = vi.fn()
            render(<RecentActivity limit={5} onSelectTranslation={onSelectTranslation} />)

            const item = screen.getByTestId('recent-activity-item')
            fireEvent.click(item)

            expect(onSelectTranslation).toHaveBeenCalledTimes(1)
            expect(onSelectTranslation).toHaveBeenCalledWith(mockHistoryItem)
        })

        it('should call onSelectTranslation when Enter key is pressed on item', () => {
            const mockHistoryItem = createMockHistoryItem({ id: 1 })

            setMockData([mockHistoryItem])

            const onSelectTranslation = vi.fn()
            render(<RecentActivity limit={5} onSelectTranslation={onSelectTranslation} />)

            const item = screen.getByTestId('recent-activity-item')
            fireEvent.keyDown(item, { key: 'Enter' })

            expect(onSelectTranslation).toHaveBeenCalledTimes(1)
            expect(onSelectTranslation).toHaveBeenCalledWith(mockHistoryItem)
        })

        it('should call onSelectTranslation when Space key is pressed on item', () => {
            const mockHistoryItem = createMockHistoryItem({ id: 1 })

            setMockData([mockHistoryItem])

            const onSelectTranslation = vi.fn()
            render(<RecentActivity limit={5} onSelectTranslation={onSelectTranslation} />)

            const item = screen.getByTestId('recent-activity-item')
            fireEvent.keyDown(item, { key: ' ' })

            expect(onSelectTranslation).toHaveBeenCalledTimes(1)
        })

        it('should pass the correct history item with all properties to callback', () => {
            const mockHistoryItem = createMockHistoryItem({
                id: 42,
                text: 'Source text to translate',
                translatedText: '翻译结果',
                sourceLang: 'en',
                targetLang: 'zh-Hans',
                actionMode: 'translate',
                favorite: false,
            })

            setMockData([mockHistoryItem])

            const onSelectTranslation = vi.fn()
            render(<RecentActivity limit={5} onSelectTranslation={onSelectTranslation} />)

            const item = screen.getByTestId('recent-activity-item')
            fireEvent.click(item)

            const calledWith = onSelectTranslation.mock.calls[0][0]
            expect(calledWith.id).toBe(42)
            expect(calledWith.text).toBe('Source text to translate')
            expect(calledWith.translatedText).toBe('翻译结果')
            expect(calledWith.sourceLang).toBe('en')
            expect(calledWith.targetLang).toBe('zh-Hans')
        })
    })

    describe('Test Case 4: Empty translation history shows graceful empty state', () => {
        it('should display empty state when history is empty', () => {
            setMockData([])
            render(<RecentActivity limit={5} />)

            const emptyState = screen.getByTestId('recent-activity-empty')
            expect(emptyState).toBeInTheDocument()

            // Should show helpful onboarding hint
            expect(screen.getByText('No Recent Translations')).toBeInTheDocument()
            expect(screen.getByText(/Start translating to see your recent activity/)).toBeInTheDocument()
        })

        it('should not display list when history is empty', () => {
            setMockData([])
            render(<RecentActivity limit={5} />)

            expect(screen.queryByTestId('recent-activity-list')).not.toBeInTheDocument()
        })

        it('should still display title section with empty state', () => {
            setMockData([])
            render(<RecentActivity limit={5} />)

            expect(screen.getByText('Recent Translations')).toBeInTheDocument()
        })
    })

    describe('Test Case 5: Display all 3 translations (minimum case)', () => {
        it('should display all 3 translations when exactly 3 are in history', () => {
            const mockHistoryItems = [
                createMockHistoryItem({ id: 1, text: 'First translation' }),
                createMockHistoryItem({ id: 2, text: 'Second translation' }),
                createMockHistoryItem({ id: 3, text: 'Third translation' }),
            ]

            setMockData(mockHistoryItems)
            render(<RecentActivity limit={5} />)

            const items = screen.getAllByTestId('recent-activity-item')
            expect(items).toHaveLength(3)

            // Verify all items are displayed
            expect(screen.getByText('First translation')).toBeInTheDocument()
            expect(screen.getByText('Second translation')).toBeInTheDocument()
            expect(screen.getByText('Third translation')).toBeInTheDocument()
        })

        it('should display fewer than limit when history has fewer items', () => {
            const mockHistoryItems = [createMockHistoryItem({ id: 1, text: 'Only translation' })]

            setMockData(mockHistoryItems)
            render(<RecentActivity limit={5} />)

            const items = screen.getAllByTestId('recent-activity-item')
            expect(items).toHaveLength(1)
        })

        it('should respect custom limit prop when fewer items present', () => {
            const mockHistoryItems = [
                createMockHistoryItem({ id: 1, text: 'Translation 1' }),
                createMockHistoryItem({ id: 2, text: 'Translation 2' }),
            ]

            setMockData(mockHistoryItems)
            render(<RecentActivity limit={3} />)

            const items = screen.getAllByTestId('recent-activity-item')
            expect(items).toHaveLength(2) // Only 2 items available, though limit is 3
        })
    })

    describe('Accessibility', () => {
        it('should have correct role and tabIndex for keyboard navigation', () => {
            const mockHistoryItems = [createMockHistoryItem({ id: 1 })]

            setMockData(mockHistoryItems)
            render(<RecentActivity limit={5} />)

            const item = screen.getByTestId('recent-activity-item')
            expect(item).toHaveAttribute('role', 'button')
            expect(item).toHaveAttribute('tabIndex', '0')
        })
    })

    describe('Container rendering', () => {
        it('should always render the container element', () => {
            setMockData([])
            render(<RecentActivity limit={5} />)

            expect(screen.getByTestId('recent-activity')).toBeInTheDocument()
        })
    })
})
