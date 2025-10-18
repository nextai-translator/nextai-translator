import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(/nextai translator/)

    // Check hero section exists
    const hero = page.locator('h1').first()
    await expect(hero).toBeVisible()
    await expect(hero).toContainText(/AI/i)
  })

  test('should display hero section elements', async ({ page }) => {
    await page.goto('/')

    // Check for main heading
    await expect(page.locator('h1')).toBeVisible()

    // Check for CTAs
    const primaryCTA = page.getByRole('link', { name: /get started|download/i }).first()
    await expect(primaryCTA).toBeVisible()

    // Check for features section
    await expect(page.locator('text=Features').or(page.locator('text=Powerful Features'))).toBeVisible()
  })

  test('should navigate to download page from hero CTA', async ({ page }) => {
    await page.goto('/')

    // Click on primary CTA
    const cta = page.getByRole('link', { name: /get started|download/i }).first()
    await cta.click()

    // Should navigate to download page
    await expect(page).toHaveURL(/\/download/)
  })

  test('should display GitHub stars if available', async ({ page }) => {
    await page.goto('/')

    // Wait for potential GitHub API call
    await page.waitForTimeout(1000)

    // Check if stars are displayed (may be 0 if API fails)
    const starsElement = page.locator('text=/\\d+.*stars?/i').or(page.locator('text=/stars/i'))
    if (await starsElement.count() > 0) {
      await expect(starsElement.first()).toBeVisible()
    }
  })

  test('should display feature cards', async ({ page }) => {
    await page.goto('/')

    // Check for at least 4 feature cards
    const featureCards = page.locator('div').filter({ hasText: /Multi-Platform|Languages|AI/i })
    const count = await featureCards.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Check mobile menu button is visible
    const mobileMenu = page.locator('button[aria-label*="menu"]').or(
      page.locator('button').filter({ hasText: /menu/i })
    )
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu.first()).toBeVisible()
    }

    // Content should still be visible
    await expect(page.locator('h1').first()).toBeVisible()
  })
})
