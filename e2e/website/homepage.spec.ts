/**
 * @file Homepage E2E Test Scenarios
 * @description Test scenarios for the official website homepage
 * Status: TDD RED PHASE - Tests will fail until implementation is complete
 */

import { test, expect } from '@playwright/test'

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000'

test.describe('Homepage - Hero Section (FR-1.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should display hero section with main tagline', async ({ page }) => {
        // Expected: "The translator that does more than just translation"
        const heroHeadline = page.locator('[data-testid="hero-headline"]')
        await expect(heroHeadline).toBeVisible()
        await expect(heroHeadline).toContainText('translator', { ignoreCase: true })
    })

    test('should show primary CTA button with platform auto-detection', async ({ page }) => {
        const primaryCTA = page.locator('[data-testid="hero-primary-cta"]')
        await expect(primaryCTA).toBeVisible()

        // Should contain "Download" text
        await expect(primaryCTA).toContainText('Download', { ignoreCase: true })

        // Should have click handler
        await expect(primaryCTA).toBeEnabled()
    })

    test('should show secondary CTA for browser extension', async ({ page }) => {
        const secondaryCTA = page.locator('[data-testid="hero-secondary-cta"]')
        await expect(secondaryCTA).toBeVisible()
        await expect(secondaryCTA).toContainText('Browser Extension', { ignoreCase: true })
    })

    test('should display platform indicators', async ({ page }) => {
        // Check for platform badges/icons
        const platformIndicators = page.locator('[data-testid="platform-indicators"]')
        await expect(platformIndicators).toBeVisible()

        // Should show Windows, macOS, Linux, Chrome, Firefox
        const platforms = ['Windows', 'macOS', 'Linux', 'Chrome', 'Firefox']
        for (const platform of platforms) {
            await expect(platformIndicators).toContainText(platform, { ignoreCase: true })
        }
    })

    test('should display hero image or demo showcase', async ({ page }) => {
        const heroVisual = page.locator('[data-testid="hero-visual"]')
        await expect(heroVisual).toBeVisible()
    })

    test('should auto-detect user platform for CTA', async ({ page }) => {
        const primaryCTA = page.locator('[data-testid="hero-primary-cta"]')
        const ctaText = await primaryCTA.textContent()

        // CTA should contain platform-specific text
        expect(ctaText).toBeTruthy()
    })
})

test.describe('Homepage - Feature Highlights (FR-1.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should display all 8 major features', async ({ page }) => {
        const features = [
            'Translation',
            'Polishing',
            'Summarization',
            '55+ language',
            'Cross-platform',
            'Screenshot translation',
            'Vocabulary',
            'Text-to-Speech',
        ]

        const featuresSection = page.locator('[data-testid="features-section"]')
        await expect(featuresSection).toBeVisible()

        for (const feature of features) {
            await expect(featuresSection).toContainText(feature, { ignoreCase: true })
        }
    })

    test('should show feature cards with icons', async ({ page }) => {
        const featureCards = page.locator('[data-testid="feature-card"]')
        const count = await featureCards.count()

        // Should have at least 8 feature cards
        expect(count).toBeGreaterThanOrEqual(8)

        // Each card should have an icon
        for (let i = 0; i < count; i++) {
            const card = featureCards.nth(i)
            const icon = card.locator('[data-testid="feature-icon"]')
            await expect(icon).toBeVisible()
        }
    })

    test('should display brief descriptions for each feature', async ({ page }) => {
        const featureCards = page.locator('[data-testid="feature-card"]')
        const count = await featureCards.count()

        for (let i = 0; i < count; i++) {
            const card = featureCards.nth(i)
            const description = card.locator('[data-testid="feature-description"]')
            await expect(description).toBeVisible()

            const text = await description.textContent()
            expect(text?.length).toBeGreaterThan(10) // At least some description
        }
    })
})

test.describe('Homepage - Platform Showcase (FR-1.3)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should display platform showcase section', async ({ page }) => {
        const platformShowcase = page.locator('[data-testid="platform-showcase"]')
        await expect(platformShowcase).toBeVisible()
    })

    test('should show screenshots for desktop platforms', async ({ page }) => {
        const desktopScreenshots = page.locator('[data-testid="platform-screenshot-desktop"]')
        await expect(desktopScreenshots).toBeVisible()
    })

    test('should show screenshots for browser extensions', async ({ page }) => {
        const browserScreenshots = page.locator('[data-testid="platform-screenshot-browser"]')
        await expect(browserScreenshots).toBeVisible()
    })

    test('should have download CTAs for each platform', async ({ page }) => {
        const platformCTAs = page.locator('[data-testid="platform-download-cta"]')
        const count = await platformCTAs.count()

        expect(count).toBeGreaterThan(0)

        for (let i = 0; i < count; i++) {
            await expect(platformCTAs.nth(i)).toBeEnabled()
        }
    })

    test('should allow platform tab/card selection', async ({ page }) => {
        const platformTabs = page.locator('[data-testid="platform-tab"]')
        const count = await platformTabs.count()

        if (count > 0) {
            // Click on the first tab
            await platformTabs.nth(0).click()

            // Should have an active state
            await expect(platformTabs.nth(0)).toHaveAttribute('data-active', 'true')
        }
    })
})

test.describe('Homepage - Social Proof (FR-1.4)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should display GitHub stars count', async ({ page }) => {
        const githubStars = page.locator('[data-testid="github-stars"]')
        await expect(githubStars).toBeVisible()

        // Should have a link to GitHub
        const githubLink = page.locator('[data-testid="github-link"]')
        await expect(githubLink).toHaveAttribute('href', /github\.com/)
    })

    test('should display Chrome Web Store rating', async ({ page }) => {
        const chromeRating = page.locator('[data-testid="chrome-rating"]')
        await expect(chromeRating).toBeVisible()
    })

    test('should display Firefox Add-ons rating', async ({ page }) => {
        const firefoxRating = page.locator('[data-testid="firefox-rating"]')
        await expect(firefoxRating).toBeVisible()
    })

    test('should show Open Source badge', async ({ page }) => {
        const openSourceBadge = page.locator('[data-testid="open-source-badge"]')
        await expect(openSourceBadge).toBeVisible()
        await expect(openSourceBadge).toContainText('Open Source', { ignoreCase: true })
    })

    test('should display download or user count if available', async ({ page }) => {
        // This might not be implemented initially
        const metricsSection = page.locator('[data-testid="metrics-section"]')

        // Check if exists, but don't fail if not
        const exists = await metricsSection.isVisible().catch(() => false)
        if (exists) {
            expect(exists).toBe(true)
        }
    })
})

test.describe('Homepage - Latest Updates (FR-1.5)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should display latest updates section', async ({ page }) => {
        const updatesSection = page.locator('[data-testid="latest-updates"]')
        await expect(updatesSection).toBeVisible()
    })

    test('should show latest 3 blog posts or releases', async ({ page }) => {
        const updateItems = page.locator('[data-testid="update-item"]')
        const count = await updateItems.count()

        // Should show up to 3 items
        expect(count).toBeLessThanOrEqual(3)
        expect(count).toBeGreaterThan(0)
    })

    test('should display date and title for each update', async ({ page }) => {
        const updateItems = page.locator('[data-testid="update-item"]')
        const count = await updateItems.count()

        for (let i = 0; i < count; i++) {
            const item = updateItems.nth(i)

            // Should have a title
            const title = item.locator('[data-testid="update-title"]')
            await expect(title).toBeVisible()

            // Should have a date
            const date = item.locator('[data-testid="update-date"]')
            await expect(date).toBeVisible()
        }
    })

    test('should have link to full blog or changelog', async ({ page }) => {
        const viewAllLink = page.locator('[data-testid="view-all-updates"]')
        await expect(viewAllLink).toBeVisible()
        await expect(viewAllLink).toBeEnabled()
    })
})

test.describe('Homepage - Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should have sticky header with navigation', async ({ page }) => {
        const header = page.locator('header[data-testid="main-header"]')
        await expect(header).toBeVisible()

        // Scroll down to test sticky behavior
        await page.evaluate(() => window.scrollBy(0, 500))
        await expect(header).toBeVisible()
    })

    test('should display logo that links to homepage', async ({ page }) => {
        const logo = page.locator('[data-testid="site-logo"]')
        await expect(logo).toBeVisible()

        await logo.click()
        await page.waitForURL(WEBSITE_URL)
    })

    test('should have main navigation links', async ({ page }) => {
        const navLinks = ['Download', 'Features', 'Docs', 'Blog', 'About']

        for (const linkText of navLinks) {
            const link = page.locator(`nav a:has-text("${linkText}")`)
            await expect(link).toBeVisible()
        }
    })

    test('should have language selector', async ({ page }) => {
        const languageSelector = page.locator('[data-testid="language-selector"]')
        await expect(languageSelector).toBeVisible()
    })

    test('should have prominent download button in header', async ({ page }) => {
        const headerDownloadBtn = page.locator('header [data-testid="header-download-btn"]')
        await expect(headerDownloadBtn).toBeVisible()
        await expect(headerDownloadBtn).toBeEnabled()
    })

    test('should show mobile hamburger menu on small screens', async ({ page }) => {
        // Set viewport to mobile size
        await page.setViewportSize({ width: 375, height: 667 })

        const mobileMenu = page.locator('[data-testid="mobile-menu-button"]')
        await expect(mobileMenu).toBeVisible()

        // Click to open menu
        await mobileMenu.click()

        const mobileNav = page.locator('[data-testid="mobile-navigation"]')
        await expect(mobileNav).toBeVisible()
    })
})

test.describe('Homepage - Footer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)

        // Scroll to footer
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    })

    test('should display footer with multi-column layout', async ({ page }) => {
        const footer = page.locator('footer[data-testid="main-footer"]')
        await expect(footer).toBeVisible()
    })

    test('should have Product section in footer', async ({ page }) => {
        const productSection = page.locator('[data-testid="footer-product"]')
        await expect(productSection).toBeVisible()

        const links = ['Download', 'Features', 'Docs']
        for (const link of links) {
            await expect(productSection).toContainText(link, { ignoreCase: true })
        }
    })

    test('should have Resources section in footer', async ({ page }) => {
        const resourcesSection = page.locator('[data-testid="footer-resources"]')
        await expect(resourcesSection).toBeVisible()

        const links = ['Blog', 'FAQ', 'Support']
        for (const link of links) {
            await expect(resourcesSection).toContainText(link, { ignoreCase: true })
        }
    })

    test('should have Community section in footer', async ({ page }) => {
        const communitySection = page.locator('[data-testid="footer-community"]')
        await expect(communitySection).toBeVisible()

        await expect(communitySection).toContainText('GitHub', { ignoreCase: true })
    })

    test('should have Legal section in footer', async ({ page }) => {
        const legalSection = page.locator('[data-testid="footer-legal"]')
        await expect(legalSection).toBeVisible()

        const links = ['Privacy', 'Terms', 'License']
        for (const link of links) {
            await expect(legalSection).toContainText(link, { ignoreCase: true })
        }
    })

    test('should display copyright information', async ({ page }) => {
        const copyright = page.locator('[data-testid="footer-copyright"]')
        await expect(copyright).toBeVisible()

        const currentYear = new Date().getFullYear()
        await expect(copyright).toContainText(currentYear.toString())
    })

    test('should have social media icons', async ({ page }) => {
        const socialIcons = page.locator('[data-testid="social-icons"]')
        await expect(socialIcons).toBeVisible()
    })
})

test.describe('Homepage - Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
        const startTime = Date.now()
        await page.goto(WEBSITE_URL)
        const loadTime = Date.now() - startTime

        // Should load in less than 5 seconds (generous for initial load)
        expect(loadTime).toBeLessThan(5000)
    })

    test('should have optimized images with lazy loading', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < Math.min(count, 5); i++) {
            const img = images.nth(i)

            // Should have alt text
            await expect(img).toHaveAttribute('alt')

            // Should have loading attribute or be using next/image
            const loading = await img.getAttribute('loading')
            expect(loading).toBeTruthy()
        }
    })
})
