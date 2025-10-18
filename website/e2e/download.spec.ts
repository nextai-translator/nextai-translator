import { test, expect } from '@playwright/test'

test.describe('Download Page', () => {
  test('should load download page', async ({ page }) => {
    await page.goto('/download')

    // Check page heading
    await expect(page.locator('h1')).toContainText(/download/i)
  })

  test('should display download options', async ({ page }) => {
    await page.goto('/download')

    // Wait for platform detection
    await page.waitForTimeout(500)

    // Check for download cards
    const downloadCards = page.locator('text=/chrome|firefox|windows|macos|linux/i')
    const count = await downloadCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should show recommended download based on platform', async ({ page }) => {
    await page.goto('/download')

    // Wait for platform detection
    await page.waitForTimeout(500)

    // Check if "Recommended" badge exists
    const recommended = page.locator('text=/recommended/i')
    if (await recommended.count() > 0) {
      await expect(recommended.first()).toBeVisible()
    }
  })

  test('should display installation instructions', async ({ page }) => {
    await page.goto('/download')

    // Check for installation instructions section
    await expect(page.locator('text=/installation instructions/i')).toBeVisible()
  })

  test('should display system requirements', async ({ page }) => {
    await page.goto('/download')

    // Scroll to system requirements
    await page.locator('text=/system requirements/i').scrollIntoViewIfNeeded()
    await expect(page.locator('text=/system requirements/i')).toBeVisible()
  })
})
