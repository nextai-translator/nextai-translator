import { test, expect } from '@playwright/test';

/**
 * TDD RED PHASE - Internationalization E2E Tests
 *
 * These tests will fail until i18n is implemented.
 * They define the expected behavior for language switching functionality.
 */

test.describe('Internationalization (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Update URL when website is deployed
    await page.goto('http://localhost:3000');
  });

  test('should detect and display browser language on first visit', async ({ page, context }) => {
    // TODO: Implement browser language detection
    // Expected: Site loads in Chinese if Accept-Language is zh-CN
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'language', { value: 'zh-CN' });
    });
    await page.reload();
    // Check for Chinese text
    const chineseText = page.locator('text=/[\u4e00-\u9fa5]/');
    await expect(chineseText.first()).toBeVisible();
  });

  test('should display language switcher in navigation', async ({ page }) => {
    // TODO: Implement language switcher component
    // Expected: Button or dropdown to switch languages
    const languageSwitcher = page.locator('[data-testid="language-switcher"], button:has-text("EN"), button:has-text("中文")');
    await expect(languageSwitcher.first()).toBeVisible();
  });

  test('should switch all content when language is changed', async ({ page }) => {
    // TODO: Implement language switching
    // Expected: Clicking language switcher changes all text
    const languageSwitcher = page.locator('button:has-text("中文")').first();
    await languageSwitcher.click();

    // Check that Chinese text appears
    const chineseHeading = page.locator('h1:has-text(/[\u4e00-\u9fa5]/)');
    await expect(chineseHeading.first()).toBeVisible();
  });

  test('should persist language preference across page reloads', async ({ page }) => {
    // TODO: Implement localStorage persistence
    // Expected: Language choice saved and restored
    const languageSwitcher = page.locator('button:has-text("中文")').first();
    await languageSwitcher.click();

    await page.reload();

    // Should still be in Chinese after reload
    const chineseText = page.locator('text=/[\u4e00-\u9fa5]/');
    await expect(chineseText.first()).toBeVisible();
  });

  test('should update URL to reflect current language', async ({ page }) => {
    // TODO: Implement language-based routing
    // Expected: URL changes to /en or /zh
    const languageSwitcher = page.locator('button:has-text("中文")').first();
    await languageSwitcher.click();

    await page.waitForURL(/\/(zh|cn)/);
    expect(page.url()).toMatch(/\/(zh|cn)/);
  });
});
