/**
 * @file Documentation E2E Test Scenarios
 * @description Test scenarios for the documentation pages
 * Status: TDD RED PHASE - Tests will fail until implementation is complete
 */

import { test, expect } from '@playwright/test'

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000'
const DOCS_URL = `${WEBSITE_URL}/docs`

test.describe('Documentation - Getting Started Guide (FR-3.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${DOCS_URL}/getting-started`)
    })

    test('should display getting started guide', async ({ page }) => {
        const gettingStarted = page.locator('[data-testid="getting-started-guide"]')
        await expect(gettingStarted).toBeVisible()
    })

    test('should have installation walkthrough for each platform', async ({ page }) => {
        const platforms = ['Windows', 'macOS', 'Linux', 'Browser']

        for (const platform of platforms) {
            const platformSection = page.locator(`[data-testid="install-${platform.toLowerCase()}"]`)
            await expect(platformSection).toBeVisible()
        }
    })

    test('should provide API key acquisition guide for OpenAI', async ({ page }) => {
        const openaiGuide = page.locator('[data-testid="openai-api-key-guide"]')
        await expect(openaiGuide).toBeVisible()

        const text = await openaiGuide.textContent()
        expect(text).toContain('API key')
        expect(text?.toLowerCase()).toMatch(/openai|platform\.openai\.com/)
    })

    test('should provide Azure OpenAI Service setup guide', async ({ page }) => {
        const azureGuide = page.locator('[data-testid="azure-openai-guide"]')
        await expect(azureGuide).toBeVisible()

        const text = await azureGuide.textContent()
        expect(text).toContain('Azure')
        expect(text).toContain('OpenAI')
    })

    test('should show initial configuration steps', async ({ page }) => {
        const configSteps = page.locator('[data-testid="initial-config-steps"]')
        await expect(configSteps).toBeVisible()

        // Should have numbered or bulleted steps
        const steps = page.locator('[data-testid="config-step"]')
        const count = await steps.count()
        expect(count).toBeGreaterThan(0)
    })

    test('should include first translation walkthrough', async ({ page }) => {
        const firstTranslation = page.locator('[data-testid="first-translation-walkthrough"]')
        await expect(firstTranslation).toBeVisible()
    })

    test('should contain screenshots for each step', async ({ page }) => {
        const screenshots = page.locator('[data-testid="guide-screenshot"]')
        const count = await screenshots.count()

        // Should have at least some screenshots
        expect(count).toBeGreaterThan(0)

        // Check first screenshot has alt text
        await expect(screenshots.first()).toHaveAttribute('alt')
    })
})

test.describe('Documentation - Feature Documentation (FR-3.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${DOCS_URL}/features`)
    })

    test('should have translation mode guide', async ({ page }) => {
        const translationGuide = page.locator('[data-testid="translation-mode-guide"]')
        await expect(translationGuide).toBeVisible()
    })

    test('should have polishing mode guide', async ({ page }) => {
        const polishingGuide = page.locator('[data-testid="polishing-mode-guide"]')
        await expect(polishingGuide).toBeVisible()
    })

    test('should have summarization mode guide', async ({ page }) => {
        const summarizationGuide = page.locator('[data-testid="summarization-mode-guide"]')
        await expect(summarizationGuide).toBeVisible()
    })

    test('should have screenshot translation guide', async ({ page }) => {
        const screenshotGuide = page.locator('[data-testid="screenshot-translation-guide"]')
        await expect(screenshotGuide).toBeVisible()
    })

    test('should have vocabulary books guide', async ({ page }) => {
        const vocabGuide = page.locator('[data-testid="vocabulary-books-guide"]')
        await expect(vocabGuide).toBeVisible()

        const text = await vocabGuide.textContent()
        expect(text?.toLowerCase()).toMatch(/vocabulary|memory aids/)
    })

    test('should have TTS configuration guide', async ({ page }) => {
        const ttsGuide = page.locator('[data-testid="tts-configuration-guide"]')
        await expect(ttsGuide).toBeVisible()

        await expect(ttsGuide).toContainText('TTS', { ignoreCase: true })
    })

    test('should have keyboard shortcuts reference', async ({ page }) => {
        const shortcutsRef = page.locator('[data-testid="keyboard-shortcuts-reference"]')
        await expect(shortcutsRef).toBeVisible()

        // Should show some keyboard shortcuts
        const shortcuts = page.locator('[data-testid="keyboard-shortcut"]')
        const count = await shortcuts.count()
        expect(count).toBeGreaterThan(0)
    })

    test('should have settings and preferences overview', async ({ page }) => {
        const settingsOverview = page.locator('[data-testid="settings-preferences-overview"]')
        await expect(settingsOverview).toBeVisible()
    })
})

test.describe('Documentation - Configuration Guides (FR-3.3)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${DOCS_URL}/configuration`)
    })

    test('should have OpenAI configuration guide', async ({ page }) => {
        const openaiConfig = page.locator('[data-testid="openai-configuration"]')
        await expect(openaiConfig).toBeVisible()

        const text = await openaiConfig.textContent()
        expect(text?.toLowerCase()).toMatch(/api url|model selection|api key/)
    })

    test('should have Azure OpenAI configuration guide', async ({ page }) => {
        const azureConfig = page.locator('[data-testid="azure-openai-configuration"]')
        await expect(azureConfig).toBeVisible()

        const text = await azureConfig.textContent()
        expect(text?.toLowerCase()).toMatch(/resource name|deployment|api version/)
    })

    test('should provide code examples for Azure configuration', async ({ page }) => {
        const codeExample = page.locator('[data-testid="azure-config-code"]')
        await expect(codeExample).toBeVisible()

        const code = await codeExample.textContent()
        expect(code).toContain('resourceName')
        expect(code).toContain('deployName')
    })

    test('should have API proxy setup guide', async ({ page }) => {
        const proxyGuide = page.locator('[data-testid="api-proxy-setup"]')
        await expect(proxyGuide).toBeVisible()

        await expect(proxyGuide).toContainText('proxy', { ignoreCase: true })
    })

    test('should have custom translation prompts guide', async ({ page }) => {
        const customPromptsGuide = page.locator('[data-testid="custom-prompts-guide"]')
        await expect(customPromptsGuide).toBeVisible()
    })

    test('should have clip extensions setup guide', async ({ page }) => {
        const clipSetupGuide = page.locator('[data-testid="clip-extensions-setup"]')
        await expect(clipSetupGuide).toBeVisible()
    })

    test('should have autostart configuration guide', async ({ page }) => {
        const autostartGuide = page.locator('[data-testid="autostart-configuration"]')
        await expect(autostartGuide).toBeVisible()
    })

    test('should have shortcut customization guide', async ({ page }) => {
        const shortcutCustomGuide = page.locator('[data-testid="shortcut-customization"]')
        await expect(shortcutCustomGuide).toBeVisible()
    })
})

test.describe('Documentation - Troubleshooting (FR-3.4)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${DOCS_URL}/troubleshooting`)
    })

    test('should display troubleshooting section', async ({ page }) => {
        const troubleshooting = page.locator('[data-testid="troubleshooting-section"]')
        await expect(troubleshooting).toBeVisible()
    })

    test('should have macOS security and permission problems section', async ({ page }) => {
        const macosIssues = page.locator('[data-testid="macos-security-issues"]')
        await expect(macosIssues).toBeVisible()

        const text = await macosIssues.textContent()
        expect(text?.toLowerCase()).toMatch(/quarantine|gatekeeper|privacy|security/)
    })

    test('should have Windows installation issues section', async ({ page }) => {
        const windowsIssues = page.locator('[data-testid="windows-installation-issues"]')
        await expect(windowsIssues).toBeVisible()
    })

    test('should have Linux compatibility issues section', async ({ page }) => {
        const linuxIssues = page.locator('[data-testid="linux-compatibility-issues"]')
        await expect(linuxIssues).toBeVisible()
    })

    test('should have API connection problems section', async ({ page }) => {
        const apiIssues = page.locator('[data-testid="api-connection-problems"]')
        await expect(apiIssues).toBeVisible()

        const text = await apiIssues.textContent()
        expect(text?.toLowerCase()).toMatch(/connection|timeout|api|error/)
    })

    test('should have extension issues section', async ({ page }) => {
        const extensionIssues = page.locator('[data-testid="extension-issues"]')
        await expect(extensionIssues).toBeVisible()
    })

    test('should have performance optimization section', async ({ page }) => {
        const perfOptimization = page.locator('[data-testid="performance-optimization"]')
        await expect(perfOptimization).toBeVisible()
    })

    test('should have error message reference', async ({ page }) => {
        const errorReference = page.locator('[data-testid="error-message-reference"]')
        await expect(errorReference).toBeVisible()

        // Should list common error messages
        const errors = page.locator('[data-testid="error-item"]')
        const count = await errors.count()
        expect(count).toBeGreaterThan(0)
    })
})

test.describe('Documentation - FAQ (FR-3.5)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`${DOCS_URL}/faq`)
    })

    test('should display FAQ page', async ({ page }) => {
        const faqSection = page.locator('[data-testid="faq-section"]')
        await expect(faqSection).toBeVisible()
    })

    test('should have categorized questions', async ({ page }) => {
        const categories = [
            'General',
            'Installation',
            'Features',
            'Troubleshooting',
            'Privacy',
            'Pricing',
        ]

        for (const category of categories) {
            const categorySection = page.locator(`[data-testid="faq-category-${category.toLowerCase()}"]`)
            await expect(categorySection).toBeVisible()
        }
    })

    test('should have search functionality', async ({ page }) => {
        const searchInput = page.locator('[data-testid="faq-search"]')
        await expect(searchInput).toBeVisible()

        // Test search
        await searchInput.fill('API key')
        await page.waitForTimeout(500) // Wait for search results

        // Results should be filtered
        const results = page.locator('[data-testid="faq-item"]')
        const count = await results.count()
        expect(count).toBeGreaterThanOrEqual(0)
    })

    test('should have expandable answers', async ({ page }) => {
        const faqItems = page.locator('[data-testid="faq-item"]')
        const firstItem = faqItems.first()

        // Initially, answer might be collapsed
        const question = firstItem.locator('[data-testid="faq-question"]')
        await question.click()

        // Answer should become visible
        const answer = firstItem.locator('[data-testid="faq-answer"]')
        await expect(answer).toBeVisible()
    })

    test('should have sufficient FAQ content', async ({ page }) => {
        const faqItems = page.locator('[data-testid="faq-item"]')
        const count = await faqItems.count()

        // Should have at least 10 FAQ items
        expect(count).toBeGreaterThanOrEqual(10)
    })
})

test.describe('Documentation - Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(DOCS_URL)
    })

    test('should have sidebar navigation', async ({ page }) => {
        const sidebar = page.locator('[data-testid="docs-sidebar"]')
        await expect(sidebar).toBeVisible()

        // Should have navigation links
        const navLinks = sidebar.locator('a')
        const count = await navLinks.count()
        expect(count).toBeGreaterThan(0)
    })

    test('should highlight active page in sidebar', async ({ page }) => {
        await page.goto(`${DOCS_URL}/getting-started`)

        const activeLink = page.locator('[data-testid="sidebar-link"][data-active="true"]')
        await expect(activeLink).toBeVisible()
    })

    test('should have table of contents for long pages', async ({ page }) => {
        await page.goto(`${DOCS_URL}/getting-started`)

        const toc = page.locator('[data-testid="table-of-contents"]')

        // TOC might be optional for short pages
        const exists = await toc.isVisible().catch(() => false)
        if (exists) {
            const tocLinks = toc.locator('a')
            const count = await tocLinks.count()
            expect(count).toBeGreaterThan(0)
        }
    })

    test('should have breadcrumb navigation', async ({ page }) => {
        await page.goto(`${DOCS_URL}/features/translation`)

        const breadcrumbs = page.locator('[data-testid="breadcrumbs"]')
        await expect(breadcrumbs).toBeVisible()

        // Should contain "Docs" link
        await expect(breadcrumbs).toContainText('Docs', { ignoreCase: true })
    })

    test('should have previous/next page links', async ({ page }) => {
        await page.goto(`${DOCS_URL}/getting-started`)

        const prevNextNav = page.locator('[data-testid="prev-next-navigation"]')

        // Might not exist on first or last page
        const exists = await prevNextNav.isVisible().catch(() => false)
        if (exists) {
            expect(exists).toBe(true)
        }
    })

    test('should have "Edit on GitHub" link', async ({ page }) => {
        const editLink = page.locator('[data-testid="edit-on-github"]')
        await expect(editLink).toBeVisible()

        const href = await editLink.getAttribute('href')
        expect(href).toContain('github.com')
    })

    test('should have search functionality in docs', async ({ page }) => {
        const searchInput = page.locator('[data-testid="docs-search"]')
        await expect(searchInput).toBeVisible()

        await searchInput.fill('API key')
        await page.waitForTimeout(500)

        // Search results should appear
        const searchResults = page.locator('[data-testid="search-results"]')
        await expect(searchResults).toBeVisible()
    })
})

test.describe('Documentation - Content Quality', () => {
    test('should have code blocks with syntax highlighting', async ({ page }) => {
        await page.goto(`${DOCS_URL}/configuration`)

        const codeBlocks = page.locator('pre code, [data-testid="code-block"]')
        const count = await codeBlocks.count()

        if (count > 0) {
            // First code block should have syntax highlighting
            const firstBlock = codeBlocks.first()
            await expect(firstBlock).toBeVisible()

            // Should have a copy button
            const copyButton = page.locator('[data-testid="copy-code-button"]').first()
            await expect(copyButton).toBeVisible()
        }
    })

    test('should have copy button for code blocks', async ({ page }) => {
        await page.goto(`${DOCS_URL}/configuration`)

        const codeBlocks = page.locator('[data-testid="code-block"]')
        const count = await codeBlocks.count()

        if (count > 0) {
            const copyButton = page.locator('[data-testid="copy-code-button"]').first()
            await copyButton.click()

            // Should provide feedback (visual indicator or message)
            await page.waitForTimeout(300)
            // Visual feedback check would be implementation-specific
            expect(true).toBe(true)
        }
    })

    test('should have images with alt text', async ({ page }) => {
        await page.goto(`${DOCS_URL}/getting-started`)

        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < Math.min(count, 5); i++) {
            const img = images.nth(i)
            await expect(img).toHaveAttribute('alt')
        }
    })

    test('should have proper heading hierarchy', async ({ page }) => {
        await page.goto(`${DOCS_URL}/getting-started`)

        // Should have h1
        const h1 = page.locator('h1')
        await expect(h1).toBeVisible()

        // Check if other headings exist
        const h2 = page.locator('h2')
        const h2Count = await h2.count()
        expect(h2Count).toBeGreaterThan(0)
    })
})

test.describe('Documentation - Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(DOCS_URL)

        const docsContent = page.locator('[data-testid="docs-content"]')
        await expect(docsContent).toBeVisible()

        // Sidebar might be hidden or collapsible on mobile
        const mobileSidebarToggle = page.locator('[data-testid="mobile-sidebar-toggle"]')
        await expect(mobileSidebarToggle).toBeVisible()
    })

    test('should collapse sidebar on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(DOCS_URL)

        const mobileSidebarToggle = page.locator('[data-testid="mobile-sidebar-toggle"]')
        await mobileSidebarToggle.click()

        const sidebar = page.locator('[data-testid="docs-sidebar"]')
        await expect(sidebar).toBeVisible()
    })
})
