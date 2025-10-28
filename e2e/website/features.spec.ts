/**
 * @file Features Page E2E Test Scenarios
 * @description Test scenarios for the detailed features page
 * Status: TDD RED PHASE - Tests will fail until implementation is complete
 */

import { test, expect } from '@playwright/test'

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000'
const FEATURES_URL = `${WEBSITE_URL}/features`

test.describe('Features Page - Detailed Feature Showcase (FR-4.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FEATURES_URL)
    })

    test('should display features page', async ({ page }) => {
        const featuresPage = page.locator('[data-testid="features-page"]')
        await expect(featuresPage).toBeVisible()
    })

    test('should have hero section explaining features', async ({ page }) => {
        const hero = page.locator('[data-testid="features-hero"]')
        await expect(hero).toBeVisible()

        const heading = hero.locator('h1')
        await expect(heading).toBeVisible()
    })

    test('should have dedicated section for Translation mode', async ({ page }) => {
        const translationSection = page.locator('[data-testid="feature-translation"]')
        await expect(translationSection).toBeVisible()

        // Should have heading
        const heading = translationSection.locator('h2, h3')
        await expect(heading).toBeVisible()
        await expect(heading).toContainText('Translation', { ignoreCase: true })

        // Should have description
        const description = translationSection.locator('[data-testid="feature-description"]')
        await expect(description).toBeVisible()
    })

    test('should have dedicated section for Polishing mode', async ({ page }) => {
        const polishingSection = page.locator('[data-testid="feature-polishing"]')
        await expect(polishingSection).toBeVisible()

        await expect(polishingSection).toContainText('Polish', { ignoreCase: true })
    })

    test('should have dedicated section for Summarization mode', async ({ page }) => {
        const summarizationSection = page.locator('[data-testid="feature-summarization"]')
        await expect(summarizationSection).toBeVisible()

        await expect(summarizationSection).toContainText('Summar', { ignoreCase: true })
    })

    test('should have section for Screenshot Translation', async ({ page }) => {
        const screenshotSection = page.locator('[data-testid="feature-screenshot-translation"]')
        await expect(screenshotSection).toBeVisible()

        await expect(screenshotSection).toContainText('Screenshot', { ignoreCase: true })
    })

    test('should have section for Vocabulary Books', async ({ page }) => {
        const vocabSection = page.locator('[data-testid="feature-vocabulary-books"]')
        await expect(vocabSection).toBeVisible()

        const text = await vocabSection.textContent()
        expect(text?.toLowerCase()).toMatch(/vocabulary|memory aids/)
    })

    test('should have section for Text-to-Speech (TTS)', async ({ page }) => {
        const ttsSection = page.locator('[data-testid="feature-tts"]')
        await expect(ttsSection).toBeVisible()

        await expect(ttsSection).toContainText('TTS', { ignoreCase: true })
    })

    test('should have section for Cross-platform Support', async ({ page }) => {
        const crossPlatformSection = page.locator('[data-testid="feature-cross-platform"]')
        await expect(crossPlatformSection).toBeVisible()

        const text = await crossPlatformSection.textContent()
        expect(text?.toLowerCase()).toMatch(/cross-platform|multi-platform|windows|macos|linux/)
    })

    test('should have section for Streaming Mode', async ({ page }) => {
        const streamingSection = page.locator('[data-testid="feature-streaming"]')
        await expect(streamingSection).toBeVisible()

        await expect(streamingSection).toContainText('Streaming', { ignoreCase: true })
    })

    test('should display screenshots or GIFs for each feature', async ({ page }) => {
        const featureSections = page.locator('[data-testid^="feature-"]')
        const count = await featureSections.count()

        expect(count).toBeGreaterThan(5)

        // Check if at least some sections have images
        const images = page.locator('[data-testid^="feature-"] img, [data-testid^="feature-"] video')
        const imageCount = await images.count()
        expect(imageCount).toBeGreaterThan(0)
    })

    test('should show use cases for each feature', async ({ page }) => {
        const useCases = page.locator('[data-testid="feature-use-case"]')
        const count = await useCases.count()

        expect(count).toBeGreaterThan(0)

        // First use case should be visible
        await expect(useCases.first()).toBeVisible()
    })

    test('should provide technical specifications for features', async ({ page }) => {
        const techSpecs = page.locator('[data-testid="technical-specs"]')

        // Tech specs might be optional
        const exists = await techSpecs.isVisible().catch(() => false)
        if (exists) {
            const text = await techSpecs.textContent()
            expect(text).toBeTruthy()
        }
    })

    test('should have comparison table with competitors', async ({ page }) => {
        const comparisonTable = page.locator('[data-testid="comparison-table"]')

        // Comparison table is optional
        const exists = await comparisonTable.isVisible().catch(() => false)
        if (exists) {
            // Should have headers
            const headers = comparisonTable.locator('th, [role="columnheader"]')
            const headerCount = await headers.count()
            expect(headerCount).toBeGreaterThan(1)
        }
    })
})

test.describe('Features Page - Language Support (FR-4.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FEATURES_URL)
    })

    test('should have language support section', async ({ page }) => {
        const languageSection = page.locator('[data-testid="language-support-section"]')
        await expect(languageSection).toBeVisible()
    })

    test('should display complete list of 55+ supported languages', async ({ page }) => {
        const languageList = page.locator('[data-testid="language-list"]')
        await expect(languageList).toBeVisible()

        // Should mention 55+ languages
        const text = await languageList.textContent()
        expect(text).toMatch(/55|language/i)

        // Should show individual language items
        const languageItems = page.locator('[data-testid="language-item"]')
        const count = await languageItems.count()
        expect(count).toBeGreaterThan(50) // At least 50 languages listed
    })

    test('should show language codes reference', async ({ page }) => {
        const languageCodes = page.locator('[data-testid="language-codes"]')

        // Language codes might be in a tooltip or expandable section
        const exists = await languageCodes.isVisible().catch(() => false)
        if (exists) {
            await expect(languageCodes).toBeVisible()
        }
    })

    test('should have flags or visual indicators for languages', async ({ page }) => {
        const languageItems = page.locator('[data-testid="language-item"]')
        const firstItem = languageItems.first()

        // Should have a flag emoji, icon, or image
        const hasFlag = await firstItem
            .locator('img, svg, [data-testid="language-flag"]')
            .isVisible()
            .catch(() => false)

        // Check if has emoji flag in text
        const text = await firstItem.textContent()
        const hasEmojiFlag = text && /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(text)

        expect(hasFlag || hasEmojiFlag).toBe(true)
    })

    test('should provide information about language detection', async ({ page }) => {
        const detectionInfo = page.locator('[data-testid="language-detection-info"]')
        await expect(detectionInfo).toBeVisible()

        const text = await detectionInfo.textContent()
        expect(text?.toLowerCase()).toMatch(/detect|automatic|auto/)
    })

    test('should have search/filter functionality for languages', async ({ page }) => {
        const searchInput = page.locator('[data-testid="language-search"]')

        // Search might be optional
        const exists = await searchInput.isVisible().catch(() => false)
        if (exists) {
            await searchInput.fill('English')
            await page.waitForTimeout(500)

            // Results should be filtered
            const languageItems = page.locator('[data-testid="language-item"]')
            const count = await languageItems.count()
            expect(count).toBeLessThan(55) // Should be filtered
        }
    })

    test('should group languages by category or region', async ({ page }) => {
        const languageGroups = page.locator('[data-testid="language-group"]')

        // Grouping is optional
        const groupCount = await languageGroups.count().catch(() => 0)
        if (groupCount > 0) {
            expect(groupCount).toBeGreaterThan(1)

            // Each group should have a heading
            const firstGroup = languageGroups.first()
            const heading = firstGroup.locator('h3, h4, [data-testid="group-heading"]')
            await expect(heading).toBeVisible()
        }
    })
})

test.describe('Features Page - AI Provider Support', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FEATURES_URL)
    })

    test('should have section about OpenAI support', async ({ page }) => {
        const openaiSection = page.locator('[data-testid="provider-openai"]')
        await expect(openaiSection).toBeVisible()

        await expect(openaiSection).toContainText('OpenAI', { ignoreCase: true })
    })

    test('should have section about Azure OpenAI support', async ({ page }) => {
        const azureSection = page.locator('[data-testid="provider-azure-openai"]')
        await expect(azureSection).toBeVisible()

        const text = await azureSection.textContent()
        expect(text).toContain('Azure')
        expect(text).toContain('OpenAI')
    })

    test('should explain model selection options', async ({ page }) => {
        const modelInfo = page.locator('[data-testid="model-selection-info"]')
        await expect(modelInfo).toBeVisible()

        const text = await modelInfo.textContent()
        expect(text?.toLowerCase()).toMatch(/model|gpt/)
    })
})

test.describe('Features Page - Integration Options', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FEATURES_URL)
    })

    test('should have section about browser extensions', async ({ page }) => {
        const browserExtSection = page.locator('[data-testid="integration-browser-extensions"]')
        await expect(browserExtSection).toBeVisible()

        await expect(browserExtSection).toContainText('Browser', { ignoreCase: true })
    })

    test('should have section about desktop applications', async ({ page }) => {
        const desktopSection = page.locator('[data-testid="integration-desktop"]')
        await expect(desktopSection).toBeVisible()

        const text = await desktopSection.textContent()
        expect(text?.toLowerCase()).toMatch(/desktop|windows|macos|linux/)
    })

    test('should have section about Clip extensions', async ({ page }) => {
        const clipSection = page.locator('[data-testid="integration-clip-extensions"]')
        await expect(clipSection).toBeVisible()

        await expect(clipSection).toContainText('Clip', { ignoreCase: true })
    })

    test('should provide links to installation guides', async ({ page }) => {
        const installLinks = page.locator('[data-testid="install-guide-link"]')
        const count = await installLinks.count()

        expect(count).toBeGreaterThan(0)

        // Links should navigate to docs or download pages
        const firstLink = installLinks.first()
        const href = await firstLink.getAttribute('href')
        expect(href).toMatch(/\/docs|\/download/)
    })
})

test.describe('Features Page - Navigation and UX', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FEATURES_URL)
    })

    test('should have table of contents for quick navigation', async ({ page }) => {
        const toc = page.locator('[data-testid="features-toc"]')

        // TOC might be optional
        const exists = await toc.isVisible().catch(() => false)
        if (exists) {
            const tocLinks = toc.locator('a')
            const count = await tocLinks.count()
            expect(count).toBeGreaterThan(5)
        }
    })

    test('should have smooth scroll to feature sections', async ({ page }) => {
        const tocLink = page.locator('[data-testid="features-toc"] a').first()

        if (await tocLink.isVisible().catch(() => false)) {
            await tocLink.click()
            await page.waitForTimeout(1000)

            // Should have scrolled down
            const scrollY = await page.evaluate(() => window.scrollY)
            expect(scrollY).toBeGreaterThan(0)
        }
    })

    test('should have CTA buttons to try features', async ({ page }) => {
        const ctaButtons = page.locator('[data-testid="feature-cta"]')
        const count = await ctaButtons.count()

        expect(count).toBeGreaterThan(0)

        // CTAs should link to download or getting started
        const firstCTA = ctaButtons.first()
        const href = await firstCTA.getAttribute('href')
        expect(href).toMatch(/\/download|\/docs\/getting-started/)
    })

    test('should have back to top button on long page', async ({ page }) => {
        // Scroll down
        await page.evaluate(() => window.scrollBy(0, 1000))
        await page.waitForTimeout(500)

        const backToTop = page.locator('[data-testid="back-to-top"]')

        // Back to top button might appear after scrolling
        const exists = await backToTop.isVisible().catch(() => false)
        if (exists) {
            await backToTop.click()
            await page.waitForTimeout(500)

            const scrollY = await page.evaluate(() => window.scrollY)
            expect(scrollY).toBeLessThan(100)
        }
    })
})

test.describe('Features Page - Content Quality', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
        await page.goto(FEATURES_URL)

        // Should have exactly one h1
        const h1 = page.locator('h1')
        const h1Count = await h1.count()
        expect(h1Count).toBe(1)

        // Should have multiple h2 or h3
        const h2 = page.locator('h2')
        const h2Count = await h2.count()
        expect(h2Count).toBeGreaterThan(2)
    })

    test('should have images with alt text', async ({ page }) => {
        await page.goto(FEATURES_URL)

        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < Math.min(count, 10); i++) {
            const img = images.nth(i)
            await expect(img).toHaveAttribute('alt')
        }
    })

    test('should have descriptive section content', async ({ page }) => {
        await page.goto(FEATURES_URL)

        const featureSections = page.locator('[data-testid^="feature-"]')
        const count = await featureSections.count()

        for (let i = 0; i < Math.min(count, 5); i++) {
            const section = featureSections.nth(i)
            const text = await section.textContent()

            // Each section should have substantial content
            expect(text?.length).toBeGreaterThan(50)
        }
    })
})

test.describe('Features Page - Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(FEATURES_URL)

        const featuresPage = page.locator('[data-testid="features-page"]')
        await expect(featuresPage).toBeVisible()
    })

    test('should display correctly on tablet', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 })
        await page.goto(FEATURES_URL)

        const featuresPage = page.locator('[data-testid="features-page"]')
        await expect(featuresPage).toBeVisible()
    })

    test('should display correctly on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 })
        await page.goto(FEATURES_URL)

        const featuresPage = page.locator('[data-testid="features-page"]')
        await expect(featuresPage).toBeVisible()
    })

    test('should stack feature sections vertically on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(FEATURES_URL)

        const featureSections = page.locator('[data-testid^="feature-"]')
        const firstSection = featureSections.first()
        const secondSection = featureSections.nth(1)

        if ((await featureSections.count()) >= 2) {
            const firstBox = await firstSection.boundingBox()
            const secondBox = await secondSection.boundingBox()

            // Sections should stack vertically (second is below first)
            if (firstBox && secondBox) {
                expect(secondBox.y).toBeGreaterThan(firstBox.y)
            }
        }
    })
})
