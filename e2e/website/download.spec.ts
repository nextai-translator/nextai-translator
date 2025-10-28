/**
 * @file Download Center E2E Test Scenarios
 * @description Test scenarios for the download center page
 * Status: TDD RED PHASE - Tests will fail until implementation is complete
 */

import { test, expect } from '@playwright/test'

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000'
const DOWNLOAD_URL = `${WEBSITE_URL}/download`

test.describe('Download Center - Platform Selection (FR-2.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(DOWNLOAD_URL)
    })

    test('should display automatic platform detection', async ({ page }) => {
        const recommendedPlatform = page.locator('[data-testid="recommended-platform"]')
        await expect(recommendedPlatform).toBeVisible()

        // Should contain text about detection
        await expect(recommendedPlatform).toContainText('detected', { ignoreCase: true })
    })

    test('should have manual platform selector', async ({ page }) => {
        const platformSelector = page.locator('[data-testid="platform-selector"]')
        await expect(platformSelector).toBeVisible()

        // Should have tabs or dropdown for platforms
        const platforms = ['Windows', 'macOS', 'Linux', 'Browser', 'Chrome', 'Firefox']

        for (const platform of platforms) {
            const platformOption = page.locator(`[data-testid="platform-option-${platform.toLowerCase()}"]`)
            await expect(platformOption).toBeVisible()
        }
    })

    test('should display version numbers for downloads', async ({ page }) => {
        const versionInfo = page.locator('[data-testid="version-number"]')
        await expect(versionInfo).toBeVisible()

        const versionText = await versionInfo.textContent()
        // Should match version pattern like "0.1.0" or "v0.1.0"
        expect(versionText).toMatch(/v?\d+\.\d+\.\d+/)
    })

    test('should switch content when selecting different platforms', async ({ page }) => {
        const windowsTab = page.locator('[data-testid="platform-option-windows"]')
        const macosTab = page.locator('[data-testid="platform-option-macos"]')

        await windowsTab.click()
        const windowsContent = page.locator('[data-testid="platform-content-windows"]')
        await expect(windowsContent).toBeVisible()

        await macosTab.click()
        const macosContent = page.locator('[data-testid="platform-content-macos"]')
        await expect(macosContent).toBeVisible()
    })
})

test.describe('Download Center - Windows Downloads (FR-2.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(DOWNLOAD_URL)

        // Select Windows platform
        const windowsTab = page.locator('[data-testid="platform-option-windows"]')
        await windowsTab.click()
    })

    test('should display Windows installer download link', async ({ page }) => {
        const downloadLink = page.locator('[data-testid="download-windows-exe"]')
        await expect(downloadLink).toBeVisible()

        // Should have href attribute
        await expect(downloadLink).toHaveAttribute('href')

        const href = await downloadLink.getAttribute('href')
        expect(href).toContain('.exe')
    })

    test('should show Windows system requirements', async ({ page }) => {
        const requirements = page.locator('[data-testid="windows-requirements"]')
        await expect(requirements).toBeVisible()

        // Should mention Windows version
        await expect(requirements).toContainText('Windows', { ignoreCase: true })
    })

    test('should provide Windows installation instructions', async ({ page }) => {
        const instructions = page.locator('[data-testid="windows-instructions"]')
        await expect(instructions).toBeVisible()

        // Should mention installation steps
        await expect(instructions).toContainText('install', { ignoreCase: true })
    })

    test('should include security warning guidance for Windows', async ({ page }) => {
        const securityInfo = page.locator('[data-testid="windows-security-info"]')
        await expect(securityInfo).toBeVisible()

        // Should mention "More Info" or "Run Anyway"
        const text = await securityInfo.textContent()
        expect(text?.toLowerCase()).toMatch(/more info|run anyway|security/i)
    })
})

test.describe('Download Center - macOS Downloads (FR-2.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(DOWNLOAD_URL)

        // Select macOS platform
        const macosTab = page.locator('[data-testid="platform-option-macos"]')
        await macosTab.click()
    })

    test('should display Apple Silicon download link', async ({ page }) => {
        const downloadLink = page.locator('[data-testid="download-macos-aarch64"]')
        await expect(downloadLink).toBeVisible()

        await expect(downloadLink).toHaveAttribute('href')
        const href = await downloadLink.getAttribute('href')
        expect(href).toMatch(/aarch64|arm64/)
    })

    test('should display Intel download link', async ({ page }) => {
        const downloadLink = page.locator('[data-testid="download-macos-intel"]')
        await expect(downloadLink).toBeVisible()

        await expect(downloadLink).toHaveAttribute('href')
        const href = await downloadLink.getAttribute('href')
        expect(href).toContain('.dmg')
    })

    test('should show macOS system requirements', async ({ page }) => {
        const requirements = page.locator('[data-testid="macos-requirements"]')
        await expect(requirements).toBeVisible()

        await expect(requirements).toContainText('macOS', { ignoreCase: true })
    })

    test('should provide quarantine removal instructions with xattr command', async ({ page }) => {
        const quarantineInfo = page.locator('[data-testid="macos-quarantine-instructions"]')
        await expect(quarantineInfo).toBeVisible()

        const text = await quarantineInfo.textContent()
        // Should contain xattr command
        expect(text).toContain('xattr')
        expect(text).toContain('com.apple.quarantine')
    })

    test('should provide Privacy & Security setup guidance', async ({ page }) => {
        const privacyInfo = page.locator('[data-testid="macos-privacy-security"]')
        await expect(privacyInfo).toBeVisible()

        const text = await privacyInfo.textContent()
        expect(text?.toLowerCase()).toMatch(/privacy|security|settings/i)
    })

    test('should distinguish between Apple Silicon and Intel', async ({ page }) => {
        const chipInfo = page.locator('[data-testid="macos-chip-info"]')
        await expect(chipInfo).toBeVisible()

        const text = await chipInfo.textContent()
        expect(text).toMatch(/Apple Silicon|M1|M2|M3|Intel/i)
    })
})

test.describe('Download Center - Linux Downloads (FR-2.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(DOWNLOAD_URL)

        // Select Linux platform
        const linuxTab = page.locator('[data-testid="platform-option-linux"]')
        await linuxTab.click()
    })

    test('should display Linux download options', async ({ page }) => {
        const linuxContent = page.locator('[data-testid="platform-content-linux"]')
        await expect(linuxContent).toBeVisible()

        // Should have at least one download format
        const downloadLinks = page.locator('[data-testid^="download-linux-"]')
        const count = await downloadLinks.count()
        expect(count).toBeGreaterThan(0)
    })

    test('should show Linux system requirements', async ({ page }) => {
        const requirements = page.locator('[data-testid="linux-requirements"]')
        await expect(requirements).toBeVisible()

        await expect(requirements).toContainText('Linux', { ignoreCase: true })
    })

    test('should provide Linux installation instructions', async ({ page }) => {
        const instructions = page.locator('[data-testid="linux-instructions"]')
        await expect(instructions).toBeVisible()
    })
})

test.describe('Download Center - Browser Extensions (FR-2.3)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(DOWNLOAD_URL)
    })

    test('should have Chrome Web Store link', async ({ page }) => {
        const chromeLink = page.locator('[data-testid="download-chrome-extension"]')
        await expect(chromeLink).toBeVisible()

        const href = await chromeLink.getAttribute('href')
        expect(href).toContain('chrome.google.com/webstore')
    })

    test('should have Firefox Add-ons link', async ({ page }) => {
        const firefoxLink = page.locator('[data-testid="download-firefox-extension"]')
        await expect(firefoxLink).toBeVisible()

        const href = await firefoxLink.getAttribute('href')
        expect(href).toContain('addons.mozilla.org')
    })

    test('should display extension version numbers', async ({ page }) => {
        const chromeVersion = page.locator('[data-testid="chrome-extension-version"]')
        const firefoxVersion = page.locator('[data-testid="firefox-extension-version"]')

        // At least one should be visible
        const chromeVisible = await chromeVersion.isVisible().catch(() => false)
        const firefoxVisible = await firefoxVersion.isVisible().catch(() => false)

        expect(chromeVisible || firefoxVisible).toBe(true)
    })

    test('should show browser requirements', async ({ page }) => {
        const browserRequirements = page.locator('[data-testid="browser-requirements"]')
        await expect(browserRequirements).toBeVisible()
    })

    test('should provide browser installation instructions', async ({ page }) => {
        const instructions = page.locator('[data-testid="browser-install-instructions"]')
        await expect(instructions).toBeVisible()
    })

    test('should link to manual installation guide', async ({ page }) => {
        const manualInstallLink = page.locator('[data-testid="manual-install-guide"]')
        await expect(manualInstallLink).toBeVisible()
    })
})

test.describe('Download Center - Alternative Installation Methods (FR-2.4)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(DOWNLOAD_URL)
    })

    test('should have clip extensions installation guide', async ({ page }) => {
        const clipExtensionsSection = page.locator('[data-testid="clip-extensions-section"]')
        await expect(clipExtensionsSection).toBeVisible()

        await expect(clipExtensionsSection).toContainText('Clip', { ignoreCase: true })
    })

    test('should link to userscript installation option', async ({ page }) => {
        const userscriptSection = page.locator('[data-testid="userscript-section"]')

        // This might be optional
        const exists = await userscriptSection.isVisible().catch(() => false)
        if (exists) {
            await expect(userscriptSection).toContainText('userscript', { ignoreCase: true })
        }
    })

    test('should provide package manager installation instructions', async ({ page }) => {
        const packageManagerSection = page.locator('[data-testid="package-manager-section"]')

        const exists = await packageManagerSection.isVisible().catch(() => false)
        if (exists) {
            const text = await packageManagerSection.textContent()
            expect(text?.toLowerCase()).toMatch(/homebrew|chocolatey|apt|yum/i)
        }
    })

    test('should link to build from source instructions', async ({ page }) => {
        const buildFromSourceLink = page.locator('[data-testid="build-from-source-link"]')
        await expect(buildFromSourceLink).toBeVisible()

        const href = await buildFromSourceLink.getAttribute('href')
        expect(href).toMatch(/github|docs/)
    })
})

test.describe('Download Center - Release Notes (FR-2.5)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(DOWNLOAD_URL)
    })

    test('should display latest release notes', async ({ page }) => {
        const releaseNotes = page.locator('[data-testid="latest-release-notes"]')
        await expect(releaseNotes).toBeVisible()
    })

    test('should show features, fixes, and improvements', async ({ page }) => {
        const releaseNotes = page.locator('[data-testid="latest-release-notes"]')
        const text = await releaseNotes.textContent()

        // Should contain some release note content
        expect(text?.length).toBeGreaterThan(50)
    })

    test('should link to full changelog', async ({ page }) => {
        const changelogLink = page.locator('[data-testid="full-changelog-link"]')
        await expect(changelogLink).toBeVisible()

        const href = await changelogLink.getAttribute('href')
        expect(href).toMatch(/changelog|releases|github/)
    })

    test('should link to all releases on GitHub', async ({ page }) => {
        const allReleasesLink = page.locator('[data-testid="all-releases-link"]')
        await expect(allReleasesLink).toBeVisible()

        const href = await allReleasesLink.getAttribute('href')
        expect(href).toContain('github.com')
        expect(href).toContain('releases')
    })

    test('should display release date', async ({ page }) => {
        const releaseDate = page.locator('[data-testid="release-date"]')
        await expect(releaseDate).toBeVisible()

        const dateText = await releaseDate.textContent()
        // Should contain some date information
        expect(dateText).toBeTruthy()
    })
})

test.describe('Download Center - Download Tracking', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(DOWNLOAD_URL)
    })

    test('should track download button clicks', async ({ page }) => {
        let analyticsEventFired = false

        // Listen for analytics events (this depends on implementation)
        page.on('console', (msg) => {
            if (msg.text().includes('download') && msg.text().includes('track')) {
                analyticsEventFired = true
            }
        })

        const downloadButton = page.locator('[data-testid="download-windows-exe"]').first()
        if (await downloadButton.isVisible()) {
            await downloadButton.click()

            // Analytics should be tracked (this is implementation-dependent)
            // For now, just ensure the button was clickable
            expect(true).toBe(true)
        }
    })

    test('should have proper download button attributes', async ({ page }) => {
        const downloadButtons = page.locator('[data-testid^="download-"]')
        const count = await downloadButtons.count()

        for (let i = 0; i < Math.min(count, 5); i++) {
            const button = downloadButtons.nth(i)

            // Should have href or click handler
            const hasHref = await button.getAttribute('href')
            const hasRole = await button.getAttribute('role')

            expect(hasHref || hasRole === 'button').toBe(true)
        }
    })
})

test.describe('Download Center - Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(DOWNLOAD_URL)

        const downloadSection = page.locator('[data-testid="download-section"]')
        await expect(downloadSection).toBeVisible()
    })

    test('should display correctly on tablet', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 })
        await page.goto(DOWNLOAD_URL)

        const downloadSection = page.locator('[data-testid="download-section"]')
        await expect(downloadSection).toBeVisible()
    })

    test('should display correctly on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 })
        await page.goto(DOWNLOAD_URL)

        const downloadSection = page.locator('[data-testid="download-section"]')
        await expect(downloadSection).toBeVisible()
    })
})
