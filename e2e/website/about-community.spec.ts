/**
 * @file About and Community Pages E2E Test Scenarios
 * @description Test scenarios for about, community, and support pages
 * Status: TDD RED PHASE - Tests will fail until implementation is complete
 */

import { test, expect } from '@playwright/test'

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000'
const ABOUT_URL = `${WEBSITE_URL}/about`
const COMMUNITY_URL = `${WEBSITE_URL}/community`

test.describe('About Page - Project Information (FR-5.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(ABOUT_URL)
    })

    test('should display about page', async ({ page }) => {
        const aboutPage = page.locator('[data-testid="about-page"]')
        await expect(aboutPage).toBeVisible()
    })

    test('should have page heading', async ({ page }) => {
        const heading = page.locator('h1')
        await expect(heading).toBeVisible()
        await expect(heading).toContainText('About', { ignoreCase: true })
    })

    test('should display project history and evolution', async ({ page }) => {
        const historySection = page.locator('[data-testid="project-history"]')
        await expect(historySection).toBeVisible()

        const text = await historySection.textContent()
        expect(text?.length).toBeGreaterThan(100)
    })

    test('should explain evolution from browser extension to multi-platform', async ({ page }) => {
        const evolutionSection = page.locator('[data-testid="project-history"], [data-testid="project-evolution"]')
        const text = await evolutionSection.textContent()

        expect(text?.toLowerCase()).toMatch(/browser extension|desktop|multi-platform/)
    })

    test('should display mission and vision statement', async ({ page }) => {
        const missionSection = page.locator('[data-testid="mission-vision"]')
        await expect(missionSection).toBeVisible()

        const text = await missionSection.textContent()
        expect(text).toMatch(/mission|vision|goal/i)
    })

    test('should explain rebranding from OpenAI Translator to nextai Translator', async ({ page }) => {
        const rebrandSection = page.locator('[data-testid="rebrand-explanation"]')
        await expect(rebrandSection).toBeVisible()

        const text = await rebrandSection.textContent()
        expect(text).toContain('OpenAI')
        expect(text).toContain('nextai')
        expect(text?.toLowerCase()).toMatch(/trademark|rebrand|rename/)
    })

    test('should mention trademark ownership warning', async ({ page }) => {
        const rebrandSection = page.locator('[data-testid="rebrand-explanation"]')
        const text = await rebrandSection.textContent()

        expect(text?.toLowerCase()).toMatch(/trademark/)
    })

    test('should display team information', async ({ page }) => {
        const teamSection = page.locator('[data-testid="team-section"]')

        // Team section might be optional
        const exists = await teamSection.isVisible().catch(() => false)
        if (exists) {
            const teamMembers = page.locator('[data-testid="team-member"]')
            const count = await teamMembers.count()
            expect(count).toBeGreaterThan(0)
        }
    })

    test('should have technology stack overview', async ({ page }) => {
        const techStackSection = page.locator('[data-testid="tech-stack"]')
        await expect(techStackSection).toBeVisible()

        const text = await techStackSection.textContent()
        expect(text?.toLowerCase()).toMatch(/react|typescript|rust|tauri/)
    })

    test('should display tech stack badges or icons', async ({ page }) => {
        const techStackSection = page.locator('[data-testid="tech-stack"]')
        const badges = techStackSection.locator('[data-testid="tech-badge"], img, svg')
        const count = await badges.count()

        expect(count).toBeGreaterThan(0)
    })
})

test.describe('About Page - Open Source Information (FR-5.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(ABOUT_URL)
    })

    test('should display open source section', async ({ page }) => {
        const openSourceSection = page.locator('[data-testid="open-source-section"]')
        await expect(openSourceSection).toBeVisible()
    })

    test('should show license information (AGPL-3.0)', async ({ page }) => {
        const licenseInfo = page.locator('[data-testid="license-info"]')
        await expect(licenseInfo).toBeVisible()

        const text = await licenseInfo.textContent()
        expect(text).toContain('AGPL-3.0')
    })

    test('should link to GitHub repository', async ({ page }) => {
        const githubLink = page.locator('[data-testid="github-repo-link"]')
        await expect(githubLink).toBeVisible()

        const href = await githubLink.getAttribute('href')
        expect(href).toContain('github.com')
        expect(href).toMatch(/openai-translator|nextai-translator/)
    })

    test('should display contribution guidelines summary', async ({ page }) => {
        const contributionSection = page.locator('[data-testid="contribution-guidelines"]')
        await expect(contributionSection).toBeVisible()

        const text = await contributionSection.textContent()
        expect(text?.toLowerCase()).toMatch(/contribute|contribution|pull request/)
    })

    test('should link to AGENTS.md', async ({ page }) => {
        const agentsLink = page.locator('a[href*="AGENTS.md"]')
        await expect(agentsLink).toBeVisible()

        const href = await agentsLink.getAttribute('href')
        expect(href).toContain('AGENTS')
    })

    test('should mention code of conduct', async ({ page }) => {
        const codeOfConduct = page.locator('[data-testid="code-of-conduct"]')

        // Code of conduct might be optional
        const exists = await codeOfConduct.isVisible().catch(() => false)
        if (exists) {
            const text = await codeOfConduct.textContent()
            expect(text?.toLowerCase()).toMatch(/code of conduct|community guidelines/)
        }
    })

    test('should have "How to Contribute" section', async ({ page }) => {
        const howToContribute = page.locator('[data-testid="how-to-contribute"]')
        await expect(howToContribute).toBeVisible()

        // Should have steps or guidelines
        const steps = page.locator('[data-testid="contribution-step"]')
        const count = await steps.count()
        expect(count).toBeGreaterThan(0)
    })
})

test.describe('Community Page - Support Resources (FR-7.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(COMMUNITY_URL)
    })

    test('should display community page', async ({ page }) => {
        const communityPage = page.locator('[data-testid="community-page"]')
        await expect(communityPage).toBeVisible()
    })

    test('should have page heading', async ({ page }) => {
        const heading = page.locator('h1')
        await expect(heading).toBeVisible()
        await expect(heading).toContainText('Community', { ignoreCase: true })
    })

    test('should link to GitHub Issues for bug reports', async ({ page }) => {
        const issuesLink = page.locator('[data-testid="github-issues-link"]')
        await expect(issuesLink).toBeVisible()

        const href = await issuesLink.getAttribute('href')
        expect(href).toContain('github.com')
        expect(href).toContain('issues')
    })

    test('should link to GitHub Discussions', async ({ page }) => {
        const discussionsLink = page.locator('[data-testid="github-discussions-link"]')

        // Discussions might be optional
        const exists = await discussionsLink.isVisible().catch(() => false)
        if (exists) {
            const href = await discussionsLink.getAttribute('href')
            expect(href).toContain('github.com')
            expect(href).toContain('discussions')
        }
    })

    test('should link to documentation', async ({ page }) => {
        const docsLink = page.locator('[data-testid="docs-link"]')
        await expect(docsLink).toBeVisible()

        const href = await docsLink.getAttribute('href')
        expect(href).toMatch(/\/docs/)
    })

    test('should link to FAQ', async ({ page }) => {
        const faqLink = page.locator('[data-testid="faq-link"]')
        await expect(faqLink).toBeVisible()

        const href = await faqLink.getAttribute('href')
        expect(href).toMatch(/\/faq|\/docs\/faq/)
    })

    test('should have contact information or form', async ({ page }) => {
        const contactSection = page.locator('[data-testid="contact-section"]')

        // Contact might be optional
        const exists = await contactSection.isVisible().catch(() => false)
        if (exists) {
            // Should have email or contact form
            const email = page.locator('[data-testid="contact-email"], a[href^="mailto:"]')
            const form = page.locator('[data-testid="contact-form"]')

            const hasEmail = await email.isVisible().catch(() => false)
            const hasForm = await form.isVisible().catch(() => false)

            expect(hasEmail || hasForm).toBe(true)
        }
    })

    test('should display support channels', async ({ page }) => {
        const supportChannels = page.locator('[data-testid="support-channel"]')
        const count = await supportChannels.count()

        expect(count).toBeGreaterThan(0)
    })
})

test.describe('Community Page - Community Links (FR-7.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(COMMUNITY_URL)
    })

    test('should display community links section', async ({ page }) => {
        const linksSection = page.locator('[data-testid="community-links"]')
        await expect(linksSection).toBeVisible()
    })

    test('should link to GitHub repository', async ({ page }) => {
        const githubLink = page.locator('[data-testid="github-link"]')
        await expect(githubLink).toBeVisible()

        const href = await githubLink.getAttribute('href')
        expect(href).toContain('github.com')
    })

    test('should display social media links', async ({ page }) => {
        const socialLinks = page.locator('[data-testid="social-link"]')

        // Social links might be optional
        const count = await socialLinks.count()
        if (count > 0) {
            expect(count).toBeGreaterThan(0)
        }
    })

    test('should have community guidelines', async ({ page }) => {
        const guidelinesSection = page.locator('[data-testid="community-guidelines"]')
        await expect(guidelinesSection).toBeVisible()

        const text = await guidelinesSection.textContent()
        expect(text?.length).toBeGreaterThan(50)
    })

    test('should explain ways to contribute', async ({ page }) => {
        const waysToContribute = page.locator('[data-testid="ways-to-contribute"]')
        await expect(waysToContribute).toBeVisible()

        // Should have multiple contribution options
        const options = page.locator('[data-testid="contribution-option"]')
        const count = await options.count()
        expect(count).toBeGreaterThan(0)
    })

    test('should mention code contributions', async ({ page }) => {
        const waysToContribute = page.locator('[data-testid="ways-to-contribute"]')
        const text = await waysToContribute.textContent()

        expect(text?.toLowerCase()).toMatch(/code|pull request|development/)
    })

    test('should mention documentation contributions', async ({ page }) => {
        const waysToContribute = page.locator('[data-testid="ways-to-contribute"]')
        const text = await waysToContribute.textContent()

        expect(text?.toLowerCase()).toMatch(/documentation|docs|writing/)
    })

    test('should mention translation contributions', async ({ page }) => {
        const waysToContribute = page.locator('[data-testid="ways-to-contribute"]')
        const text = await waysToContribute.textContent()

        expect(text?.toLowerCase()).toMatch(/translation|localization|i18n/)
    })

    test('should mention bug reporting', async ({ page }) => {
        const waysToContribute = page.locator('[data-testid="ways-to-contribute"]')
        const text = await waysToContribute.textContent()

        expect(text?.toLowerCase()).toMatch(/bug|issue|report/)
    })

    test('should showcase Star History', async ({ page }) => {
        const starHistory = page.locator('[data-testid="star-history"]')

        // Star history might be optional
        const exists = await starHistory.isVisible().catch(() => false)
        if (exists) {
            // Should have star history image or chart
            const image = starHistory.locator('img')
            await expect(image).toBeVisible()
        }
    })
})

test.describe('Community Page - Contributors Section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(COMMUNITY_URL)
    })

    test('should have contributors section', async ({ page }) => {
        const contributorsSection = page.locator('[data-testid="contributors-section"]')

        // Contributors section might be optional
        const exists = await contributorsSection.isVisible().catch(() => false)
        if (exists) {
            await expect(contributorsSection).toBeVisible()
        }
    })

    test('should display contributor avatars or list', async ({ page }) => {
        const contributors = page.locator('[data-testid="contributor"]')

        // Contributors might be optional
        const count = await contributors.count()
        if (count > 0) {
            expect(count).toBeGreaterThan(0)

            // Should have avatar images
            const avatar = contributors.first().locator('img')
            await expect(avatar).toBeVisible()
        }
    })

    test('should link to GitHub contributors page', async ({ page }) => {
        const contributorsLink = page.locator('[data-testid="all-contributors-link"]')

        // Link might be optional
        const exists = await contributorsLink.isVisible().catch(() => false)
        if (exists) {
            const href = await contributorsLink.getAttribute('href')
            expect(href).toContain('github.com')
            expect(href).toMatch(/contributors|graphs/)
        }
    })
})

test.describe('Community Page - Stats and Metrics', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(COMMUNITY_URL)
    })

    test('should display GitHub stars count', async ({ page }) => {
        const starsCount = page.locator('[data-testid="github-stars-count"]')
        await expect(starsCount).toBeVisible()

        const count = await starsCount.textContent()
        expect(count).toBeTruthy()
    })

    test('should display number of forks', async ({ page }) => {
        const forksCount = page.locator('[data-testid="github-forks-count"]')

        // Forks count might be optional
        const exists = await forksCount.isVisible().catch(() => false)
        if (exists) {
            const count = await forksCount.textContent()
            expect(count).toBeTruthy()
        }
    })

    test('should display number of contributors', async ({ page }) => {
        const contributorsCount = page.locator('[data-testid="contributors-count"]')

        // Contributors count might be optional
        const exists = await contributorsCount.isVisible().catch(() => false)
        if (exists) {
            const count = await contributorsCount.textContent()
            expect(count).toBeTruthy()
        }
    })

    test('should display download or install count', async ({ page }) => {
        const downloadCount = page.locator('[data-testid="download-count"]')

        // Download count might be optional
        const exists = await downloadCount.isVisible().catch(() => false)
        if (exists) {
            const count = await downloadCount.textContent()
            expect(count).toBeTruthy()
        }
    })
})

test.describe('Community Page - Getting Help', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(COMMUNITY_URL)
    })

    test('should have "Getting Help" section', async ({ page }) => {
        const gettingHelpSection = page.locator('[data-testid="getting-help-section"]')
        await expect(gettingHelpSection).toBeVisible()
    })

    test('should provide steps for getting help', async ({ page }) => {
        const helpSteps = page.locator('[data-testid="help-step"]')
        const count = await helpSteps.count()

        expect(count).toBeGreaterThan(0)
    })

    test('should link to troubleshooting docs', async ({ page }) => {
        const troubleshootingLink = page.locator('a[href*="troubleshooting"]')
        await expect(troubleshootingLink).toBeVisible()
    })

    test('should explain how to report bugs', async ({ page }) => {
        const bugReportingInfo = page.locator('[data-testid="bug-reporting-info"]')
        await expect(bugReportingInfo).toBeVisible()

        const text = await bugReportingInfo.textContent()
        expect(text?.toLowerCase()).toMatch(/bug|issue|report/)
    })

    test('should explain how to request features', async ({ page }) => {
        const featureRequestInfo = page.locator('[data-testid="feature-request-info"]')
        await expect(featureRequestInfo).toBeVisible()

        const text = await featureRequestInfo.textContent()
        expect(text?.toLowerCase()).toMatch(/feature|request|enhancement/)
    })
})

test.describe('About and Community - Content Quality', () => {
    test('about page should have proper heading hierarchy', async ({ page }) => {
        await page.goto(ABOUT_URL)

        const h1 = page.locator('h1')
        const h1Count = await h1.count()
        expect(h1Count).toBe(1)

        const h2 = page.locator('h2')
        const h2Count = await h2.count()
        expect(h2Count).toBeGreaterThan(0)
    })

    test('community page should have proper heading hierarchy', async ({ page }) => {
        await page.goto(COMMUNITY_URL)

        const h1 = page.locator('h1')
        const h1Count = await h1.count()
        expect(h1Count).toBe(1)

        const h2 = page.locator('h2')
        const h2Count = await h2.count()
        expect(h2Count).toBeGreaterThan(0)
    })

    test('about page should have images with alt text', async ({ page }) => {
        await page.goto(ABOUT_URL)

        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < Math.min(count, 5); i++) {
            const img = images.nth(i)
            await expect(img).toHaveAttribute('alt')
        }
    })

    test('community page should have images with alt text', async ({ page }) => {
        await page.goto(COMMUNITY_URL)

        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < Math.min(count, 5); i++) {
            const img = images.nth(i)
            await expect(img).toHaveAttribute('alt')
        }
    })
})

test.describe('About and Community - Responsive Design', () => {
    test('about page should display correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(ABOUT_URL)

        const aboutPage = page.locator('[data-testid="about-page"]')
        await expect(aboutPage).toBeVisible()
    })

    test('community page should display correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(COMMUNITY_URL)

        const communityPage = page.locator('[data-testid="community-page"]')
        await expect(communityPage).toBeVisible()
    })

    test('about page should display correctly on tablet', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 })
        await page.goto(ABOUT_URL)

        const aboutPage = page.locator('[data-testid="about-page"]')
        await expect(aboutPage).toBeVisible()
    })

    test('community page should display correctly on tablet', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 })
        await page.goto(COMMUNITY_URL)

        const communityPage = page.locator('[data-testid="community-page"]')
        await expect(communityPage).toBeVisible()
    })
})
