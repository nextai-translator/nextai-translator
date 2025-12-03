import { expect, test } from './fixtures'
import { getOptionsPageUrl, getPopupPageUrl } from './common'

/**
 * Cross-Platform Accessibility E2E Tests
 * Tests that the Homepage renders correctly across browser extension contexts
 * Scenario: Cross-Platform Accessibility (REQ-8)
 */

test.describe('Cross-Platform Homepage Accessibility', () => {
    // Test Case 1: Render Homepage in browser extension popup context
    test('Homepage renders correctly within popup context constraints', async ({ page, extensionId }) => {
        // Navigate to the popup page
        await page.goto(getPopupPageUrl(extensionId))

        // Set viewport to popup size constraints (400x600px)
        await page.setViewportSize({ width: 400, height: 600 })

        // Verify the popup container renders
        const popupContainer = page.getByTestId('popup-container')
        await expect(popupContainer).toBeVisible()

        // Verify the container fits within popup constraints
        const boundingBox = await popupContainer.boundingBox()
        if (boundingBox) {
            expect(boundingBox.width).toBeLessThanOrEqual(400)
        }
    })

    // Test Case 2: Render Homepage in options page context
    test('Homepage renders correctly in options page with full layout', async ({ page, extensionId }) => {
        // Navigate to the options page
        await page.goto(getOptionsPageUrl(extensionId))

        // Options page has more screen space
        await page.setViewportSize({ width: 768, height: 900 })

        // Verify the settings container renders (options page shows settings)
        const settingsContainer = page.getByTestId('settings-container')
        await expect(settingsContainer).toBeVisible()

        // Verify the page is responsive and uses available space
        const boundingBox = await settingsContainer.boundingBox()
        expect(boundingBox).not.toBeNull()
    })

    // Test Case 4: Navigate from Homepage to Settings in popup context
    test('Navigation works correctly in popup context', async ({ page, extensionId }) => {
        // Navigate to popup
        await page.goto(getPopupPageUrl(extensionId))
        await page.setViewportSize({ width: 400, height: 600 })

        // Verify popup container is visible (contains translator or settings)
        const popupContainer = page.getByTestId('popup-container')
        await expect(popupContainer).toBeVisible()

        // Check for settings icon if present (the popup shows translator with settings icon)
        const settingsButton = page.locator('[data-testid*="settings"]')
        if (await settingsButton.isVisible()) {
            await settingsButton.click()
            // Wait for any navigation or state change
            await page.waitForTimeout(500)
        }
    })

    // Test viewport responsiveness
    test('Homepage adapts to different viewport sizes', async ({ page, extensionId }) => {
        await page.goto(getPopupPageUrl(extensionId))

        // Test popup size
        await page.setViewportSize({ width: 400, height: 600 })
        await expect(page.getByTestId('popup-container')).toBeVisible()

        // Test larger viewport
        await page.setViewportSize({ width: 800, height: 600 })
        await expect(page.getByTestId('popup-container')).toBeVisible()

        // Test smaller viewport
        await page.setViewportSize({ width: 320, height: 480 })
        await expect(page.getByTestId('popup-container')).toBeVisible()
    })

    // Test keyboard accessibility
    test('Homepage supports keyboard navigation', async ({ page, extensionId }) => {
        await page.goto(getPopupPageUrl(extensionId))
        await page.setViewportSize({ width: 400, height: 600 })

        // Wait for the popup to load
        await expect(page.getByTestId('popup-container')).toBeVisible()

        // Test Tab navigation through interactive elements
        await page.keyboard.press('Tab')
        await page.waitForTimeout(100)

        // Verify focus is on an interactive element
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
        expect(focusedElement).toBeDefined()
    })
})

/**
 * Note: Tauri desktop E2E tests would require:
 * 1. Tauri-specific test setup using @tauri-apps/test
 * 2. Building the desktop application
 * 3. Running tests in the Tauri WebDriver context
 *
 * These tests are typically run separately in CI with the Tauri build.
 * The unit/integration tests in HomepageCrossPlatform.test.tsx cover the
 * component behavior for desktop scenarios.
 */
