import { test, expect } from '@playwright/test';

/**
 * TDD RED PHASE - Download Section E2E Tests
 *
 * These tests will fail until the download page is implemented.
 * They define the expected behavior for multi-platform download functionality.
 */

test.describe('Download Section', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Update URL when website is deployed
    await page.goto('http://localhost:3000/download');
  });

  test('should display all 7 platform options', async ({ page }) => {
    // TODO: Implement download page with platform cards
    // Expected: Cards for Chrome, Firefox, Safari, Windows, macOS, Linux, Userscript
    const platforms = ['Chrome', 'Firefox', 'Safari', 'Windows', 'macOS', 'Linux', 'Userscript'];

    for (const platform of platforms) {
      await expect(page.locator(`text=${platform}`)).toBeVisible();
    }
  });

  test('should highlight recommended platform based on user agent', async ({ page, context }) => {
    // TODO: Implement platform detection and highlighting
    // Expected: Detected platform has 'recommended' or highlighted styling
    const recommendedCard = page.locator('[data-recommended="true"]').first();
    await expect(recommendedCard).toBeVisible();
  });

  test('should display version numbers from GitHub API', async ({ page }) => {
    // TODO: Implement GitHub API integration
    // Expected: Version numbers displayed (e.g., "v0.1.0")
    const versionText = page.locator('text=/v?\\d+\\.\\d+\\.\\d+/').first();
    await expect(versionText).toBeVisible();
  });

  test('should have functional download links', async ({ page }) => {
    // TODO: Implement download links to stores/releases
    // Expected: Links point to Chrome Web Store, GitHub releases, etc.
    const downloadLinks = page.locator('a[href*="chrome.google.com"], a[href*="github.com/"]');
    await expect(downloadLinks.first()).toHaveAttribute('href', /.+/);
  });

  test('should display system requirements for each platform', async ({ page }) => {
    // TODO: Implement system requirements display
    // Expected: Requirements like "Chrome 90+", "macOS 10.15+"
    const requirements = page.locator('text=/Chrome \\d+|macOS \\d+|Windows \\d+/i').first();
    await expect(requirements).toBeVisible();
  });
});
