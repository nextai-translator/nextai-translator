import { test, expect } from './fixtures'
import { getPopupPageUrl } from './common'

/**
 * E2E Tests for Homepage Feature
 * These tests validate the homepage functionality across different platforms
 */

test.describe('Homepage - Basic Display', () => {
    test('Scenario 1.3: homepage should be visible on popup open', async ({ page, extensionId }) => {
        // Test Case ID: 1.3
        // Validates REQ-1: Homepage Landing Interface
        await page.goto(getPopupPageUrl(extensionId))
        await expect(page.getByTestId('homepage-container')).toBeVisible()
    })

    test('Scenario 1: homepage should display logo and branding', async ({ page, extensionId }) => {
        await page.goto(getPopupPageUrl(extensionId))
        await expect(page.getByTestId('homepage-logo')).toBeVisible()
    })

    test('Scenario 1: homepage should display all quick action buttons', async ({ page, extensionId }) => {
        await page.goto(getPopupPageUrl(extensionId))

        await expect(page.getByRole('button', { name: /translate/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /polish/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /summarize/i })).toBeVisible()
    })

    test('Scenario 1: homepage should display navigation menu', async ({ page, extensionId }) => {
        await page.goto(getPopupPageUrl(extensionId))

        await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /vocabulary/i })).toBeVisible()
    })
})

test.describe('Homepage - Quick Actions', () => {
    test('Scenario 2: translate quick action should expand on click', async ({ page, extensionId }) => {
        // Test Case ID: 2.2
        await page.goto(getPopupPageUrl(extensionId))

        const translateButton = page.getByRole('button', { name: /translate/i })
        await translateButton.click()

        await expect(page.getByPlaceholderText(/enter text/i)).toBeVisible()
        await expect(page.getByRole('combobox', { name: /target language/i })).toBeVisible()
    })

    test('Scenario 2: polish quick action should expand on click', async ({ page, extensionId }) => {
        // Test Case ID: 3.2
        await page.goto(getPopupPageUrl(extensionId))

        const polishButton = page.getByRole('button', { name: /polish/i })
        await polishButton.click()

        await expect(page.getByPlaceholderText(/enter text/i)).toBeVisible()
    })

    test('Scenario 2: summarize quick action should expand on click', async ({ page, extensionId }) => {
        // Test Case ID: 4.2
        await page.goto(getPopupPageUrl(extensionId))

        const summarizeButton = page.getByRole('button', { name: /summarize/i })
        await summarizeButton.click()

        await expect(page.getByPlaceholderText(/enter text/i)).toBeVisible()
    })
})

test.describe('Homepage - Navigation', () => {
    test('Scenario 7: should navigate to settings from homepage', async ({ page, extensionId }) => {
        // Test Case ID: 7.3
        await page.goto(getPopupPageUrl(extensionId))

        const settingsLink = page.getByRole('link', { name: /settings/i })
        await settingsLink.click()

        await expect(page.getByTestId('settings-container')).toBeVisible()
    })

    test('Scenario 8: should navigate to vocabulary from homepage', async ({ page, extensionId }) => {
        // Test Case ID: 8.2
        await page.goto(getPopupPageUrl(extensionId))

        const vocabularyLink = page.getByRole('link', { name: /vocabulary/i })
        await vocabularyLink.click()

        await expect(page.getByTestId('vocabulary-container')).toBeVisible()
    })

    test('Scenario 7.5: should navigate back to homepage from settings', async ({ page, extensionId }) => {
        // Test Case ID: 7.3 - Round-trip navigation
        await page.goto(getPopupPageUrl(extensionId))

        // Navigate to settings
        await page.getByRole('link', { name: /settings/i }).click()
        await expect(page.getByTestId('settings-container')).toBeVisible()

        // Navigate back to homepage
        await page.getByRole('link', { name: /home/i }).click()
        await expect(page.getByTestId('homepage-container')).toBeVisible()
    })
})

test.describe('Homepage - Recent Activity', () => {
    test('Scenario 5: should display recent activity section when history exists', async ({ page, extensionId }) => {
        // Test Case ID: 5.1
        // Note: This test assumes mock history data is available
        await page.goto(getPopupPageUrl(extensionId))

        const recentActivity = page.getByTestId('recent-activity-list')
        await expect(recentActivity).toBeVisible()
    })

    test('Scenario 6: should clear history when clear button clicked', async ({ page, extensionId }) => {
        // Test Case ID: 6.1
        await page.goto(getPopupPageUrl(extensionId))

        const clearButton = page.getByRole('button', { name: /clear history/i })
        if (await clearButton.isVisible()) {
            await clearButton.click()

            await expect(page.getByText(/no recent activity/i)).toBeVisible()
        }
    })
})

test.describe('Homepage - Performance', () => {
    test('Scenario 12: homepage should load within 1 second', async ({ page, extensionId }) => {
        // Test Case ID: 12.2
        // Validates NFR-1: Performance requirement
        const startTime = Date.now()

        await page.goto(getPopupPageUrl(extensionId))
        await expect(page.getByTestId('homepage-container')).toBeVisible()

        const loadTime = Date.now() - startTime

        // Homepage should be visible within 1000ms
        expect(loadTime).toBeLessThan(1000)
    })
})

test.describe('Homepage - Accessibility', () => {
    test('Scenario 13: should support keyboard navigation', async ({ page, extensionId }) => {
        // Test Case ID: 13.1
        await page.goto(getPopupPageUrl(extensionId))

        // Tab to first interactive element
        await page.keyboard.press('Tab')

        // Check that focus is on an interactive element
        const focusedElement = await page.evaluate(() => {
            return document.activeElement?.tagName
        })

        expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement)
    })

    test('Scenario 13: should activate quick action with Enter key', async ({ page, extensionId }) => {
        // Test Case ID: 13.2
        await page.goto(getPopupPageUrl(extensionId))

        // Tab to translate button
        await page.keyboard.press('Tab')

        // Activate with Enter
        await page.keyboard.press('Enter')

        // Input field should appear
        await expect(page.getByPlaceholderText(/enter text/i)).toBeVisible()
    })
})

test.describe('Homepage - Integration Workflow', () => {
    test('Scenario 18: complete homepage workflow - translate and verify history', async ({ page, extensionId }) => {
        // Test Case ID: 18.1
        // Full integration test of homepage features

        // 1. Open homepage
        await page.goto(getPopupPageUrl(extensionId))
        await expect(page.getByTestId('homepage-container')).toBeVisible()

        // 2. Use translate quick action
        const translateButton = page.getByRole('button', { name: /translate/i })
        await translateButton.click()

        await page.getByPlaceholderText(/enter text/i).fill('Hello World')

        const languageSelector = page.getByRole('combobox', { name: /target language/i })
        await languageSelector.selectOption('es')

        const submitButton = page.getByRole('button', { name: /submit|go|translate/i })
        await submitButton.click()

        // 3. Verify translation initiated (may need mock or test API)
        // This part depends on implementation

        // 4. Navigate to settings
        await page.getByRole('link', { name: /settings/i }).click()
        await expect(page.getByTestId('settings-container')).toBeVisible()

        // 5. Return to homepage
        await page.getByRole('link', { name: /home/i }).click()
        await expect(page.getByTestId('homepage-container')).toBeVisible()

        // 6. Verify recent activity shows the translation
        const recentActivity = page.getByTestId('recent-activity-list')
        await expect(recentActivity).toBeVisible()
        await expect(recentActivity.getByText(/hello world/i)).toBeVisible()
    })
})
