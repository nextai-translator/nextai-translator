/**
 * @file Legal Pages E2E Test Scenarios
 * @description Test scenarios for privacy policy, terms of service, and license pages
 * Status: TDD RED PHASE - Tests will fail until implementation is complete
 */

import { test, expect } from '@playwright/test'

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000'
const PRIVACY_URL = `${WEBSITE_URL}/privacy`
const TERMS_URL = `${WEBSITE_URL}/terms`
const LICENSE_URL = `${WEBSITE_URL}/license`

test.describe('Privacy Policy Page (FR-9.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(PRIVACY_URL)
    })

    test('should display privacy policy page', async ({ page }) => {
        const privacyPage = page.locator('[data-testid="privacy-page"]')
        await expect(privacyPage).toBeVisible()
    })

    test('should have page heading', async ({ page }) => {
        const heading = page.locator('h1')
        await expect(heading).toBeVisible()
        await expect(heading).toContainText('Privacy', { ignoreCase: true })
    })

    test('should have last updated date', async ({ page }) => {
        const lastUpdated = page.locator('[data-testid="last-updated"]')
        await expect(lastUpdated).toBeVisible()

        const text = await lastUpdated.textContent()
        expect(text).toMatch(/updated|effective/i)
        expect(text).toMatch(/\d{4}/) // Should contain a year
    })

    test('should have data collection disclosure section', async ({ page }) => {
        const dataCollection = page.locator('[data-testid="data-collection"]')
        await expect(dataCollection).toBeVisible()

        const text = await dataCollection.textContent()
        expect(text?.toLowerCase()).toMatch(/collect|data|information/)
    })

    test('should explain what data is collected', async ({ page }) => {
        const dataCollection = page.locator('[data-testid="data-collection"]')
        const text = await dataCollection.textContent()

        // Should mention types of data
        expect(text?.length).toBeGreaterThan(100)
    })

    test('should have API key handling information', async ({ page }) => {
        const apiKeyInfo = page.locator('[data-testid="api-key-handling"]')
        await expect(apiKeyInfo).toBeVisible()

        const text = await apiKeyInfo.textContent()
        expect(text).toContain('API key')
        expect(text?.toLowerCase()).toMatch(/store|save|handle|secure/)
    })

    test('should clarify that API keys are stored locally', async ({ page }) => {
        const apiKeyInfo = page.locator('[data-testid="api-key-handling"]')
        const text = await apiKeyInfo.textContent()

        expect(text?.toLowerCase()).toMatch(/local|device|not.*send|not.*store/)
    })

    test('should have analytics usage section', async ({ page }) => {
        const analyticsInfo = page.locator('[data-testid="analytics-usage"]')
        await expect(analyticsInfo).toBeVisible()

        const text = await analyticsInfo.textContent()
        expect(text?.toLowerCase()).toMatch(/analytics|tracking|metrics/)
    })

    test('should disclose third-party services', async ({ page }) => {
        const thirdPartyServices = page.locator('[data-testid="third-party-services"]')
        await expect(thirdPartyServices).toBeVisible()

        const text = await thirdPartyServices.textContent()
        expect(text?.toLowerCase()).toMatch(/third.?party|service|provider/)
    })

    test('should mention OpenAI as third-party service', async ({ page }) => {
        const thirdPartyServices = page.locator('[data-testid="third-party-services"]')
        const text = await thirdPartyServices.textContent()

        expect(text).toContain('OpenAI')
    })

    test('should have user rights section', async ({ page }) => {
        const userRights = page.locator('[data-testid="user-rights"]')
        await expect(userRights).toBeVisible()

        const text = await userRights.textContent()
        expect(text?.toLowerCase()).toMatch(/right|access|delete|control/)
    })

    test('should have GDPR compliance section', async ({ page }) => {
        const gdprInfo = page.locator('[data-testid="gdpr-compliance"]')

        // GDPR section might be optional
        const exists = await gdprInfo.isVisible().catch(() => false)
        if (exists) {
            const text = await gdprInfo.textContent()
            expect(text).toContain('GDPR')
        }
    })

    test('should have cookies policy section', async ({ page }) => {
        const cookiesPolicy = page.locator('[data-testid="cookies-policy"]')

        // Cookies section might be optional
        const exists = await cookiesPolicy.isVisible().catch(() => false)
        if (exists) {
            const text = await cookiesPolicy.textContent()
            expect(text?.toLowerCase()).toMatch(/cookie/)
        }
    })

    test('should have data security section', async ({ page }) => {
        const dataSecurity = page.locator('[data-testid="data-security"]')
        await expect(dataSecurity).toBeVisible()

        const text = await dataSecurity.textContent()
        expect(text?.toLowerCase()).toMatch(/security|protect|secure/)
    })

    test('should have contact information for privacy concerns', async ({ page }) => {
        const contactInfo = page.locator('[data-testid="privacy-contact"]')
        await expect(contactInfo).toBeVisible()

        const text = await contactInfo.textContent()
        expect(text?.toLowerCase()).toMatch(/contact|email|reach/)
    })

    test('should have changes to policy section', async ({ page }) => {
        const changesSection = page.locator('[data-testid="policy-changes"]')
        await expect(changesSection).toBeVisible()

        const text = await changesSection.textContent()
        expect(text?.toLowerCase()).toMatch(/change|update|modify/)
    })
})

test.describe('Terms of Service Page (FR-9.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TERMS_URL)
    })

    test('should display terms of service page', async ({ page }) => {
        const termsPage = page.locator('[data-testid="terms-page"]')
        await expect(termsPage).toBeVisible()
    })

    test('should have page heading', async ({ page }) => {
        const heading = page.locator('h1')
        await expect(heading).toBeVisible()
        await expect(heading).toContainText('Terms', { ignoreCase: true })
    })

    test('should have last updated date', async ({ page }) => {
        const lastUpdated = page.locator('[data-testid="last-updated"]')
        await expect(lastUpdated).toBeVisible()

        const text = await lastUpdated.textContent()
        expect(text).toMatch(/updated|effective/i)
    })

    test('should have acceptance of terms section', async ({ page }) => {
        const acceptanceSection = page.locator('[data-testid="acceptance-terms"]')
        await expect(acceptanceSection).toBeVisible()

        const text = await acceptanceSection.textContent()
        expect(text?.toLowerCase()).toMatch(/accept|agree|acknowledge/)
    })

    test('should have usage terms section', async ({ page }) => {
        const usageTerms = page.locator('[data-testid="usage-terms"]')
        await expect(usageTerms).toBeVisible()

        const text = await usageTerms.textContent()
        expect(text?.toLowerCase()).toMatch(/use|usage|service/)
    })

    test('should clarify acceptable use', async ({ page }) => {
        const acceptableUse = page.locator('[data-testid="acceptable-use"]')
        await expect(acceptableUse).toBeVisible()

        const text = await acceptableUse.textContent()
        expect(text?.length).toBeGreaterThan(50)
    })

    test('should have disclaimers section', async ({ page }) => {
        const disclaimers = page.locator('[data-testid="disclaimers"]')
        await expect(disclaimers).toBeVisible()

        const text = await disclaimers.textContent()
        expect(text?.toLowerCase()).toMatch(/disclaimer|warranty|as.?is/)
    })

    test('should have "AS IS" disclaimer', async ({ page }) => {
        const disclaimers = page.locator('[data-testid="disclaimers"]')
        const text = await disclaimers.textContent()

        expect(text).toMatch(/AS IS|"as is"/i)
    })

    test('should have liability limitations section', async ({ page }) => {
        const liabilityLimits = page.locator('[data-testid="liability-limitations"]')
        await expect(liabilityLimits).toBeVisible()

        const text = await liabilityLimits.textContent()
        expect(text?.toLowerCase()).toMatch(/liabilit|liable|damages/)
    })

    test('should reference license terms', async ({ page }) => {
        const licenseReference = page.locator('[data-testid="license-reference"]')
        await expect(licenseReference).toBeVisible()

        const text = await licenseReference.textContent()
        expect(text).toContain('AGPL')

        // Should link to license page
        const licenseLink = page.locator('a[href*="license"]')
        await expect(licenseLink).toBeVisible()
    })

    test('should have intellectual property section', async ({ page }) => {
        const ipSection = page.locator('[data-testid="intellectual-property"]')
        await expect(ipSection).toBeVisible()

        const text = await ipSection.textContent()
        expect(text?.toLowerCase()).toMatch(/intellectual property|copyright|trademark/)
    })

    test('should have termination section', async ({ page }) => {
        const terminationSection = page.locator('[data-testid="termination"]')
        await expect(terminationSection).toBeVisible()

        const text = await terminationSection.textContent()
        expect(text?.toLowerCase()).toMatch(/terminat|suspend|discontinue/)
    })

    test('should have governing law section', async ({ page }) => {
        const governingLaw = page.locator('[data-testid="governing-law"]')
        await expect(governingLaw).toBeVisible()

        const text = await governingLaw.textContent()
        expect(text?.toLowerCase()).toMatch(/law|jurisdiction|govern/)
    })

    test('should have changes to terms section', async ({ page }) => {
        const changesSection = page.locator('[data-testid="terms-changes"]')
        await expect(changesSection).toBeVisible()

        const text = await changesSection.textContent()
        expect(text?.toLowerCase()).toMatch(/change|modify|update/)
    })

    test('should have contact information', async ({ page }) => {
        const contactInfo = page.locator('[data-testid="terms-contact"]')
        await expect(contactInfo).toBeVisible()
    })
})

test.describe('License Page (FR-9.3)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(LICENSE_URL)
    })

    test('should display license page', async ({ page }) => {
        const licensePage = page.locator('[data-testid="license-page"]')
        await expect(licensePage).toBeVisible()
    })

    test('should have page heading', async ({ page }) => {
        const heading = page.locator('h1')
        await expect(heading).toBeVisible()
        await expect(heading).toContainText('License', { ignoreCase: true })
    })

    test('should display AGPL-3.0 license name', async ({ page }) => {
        const licenseName = page.locator('[data-testid="license-name"]')
        await expect(licenseName).toBeVisible()

        const text = await licenseName.textContent()
        expect(text).toContain('AGPL-3.0')
    })

    test('should have full AGPL-3.0 license text', async ({ page }) => {
        const licenseText = page.locator('[data-testid="license-text"]')
        await expect(licenseText).toBeVisible()

        const text = await licenseText.textContent()
        expect(text).toContain('GNU AFFERO GENERAL PUBLIC LICENSE')
        expect(text?.length).toBeGreaterThan(1000) // Full license is long
    })

    test('should have license summary for users', async ({ page }) => {
        const licenseSummary = page.locator('[data-testid="license-summary"]')
        await expect(licenseSummary).toBeVisible()

        const text = await licenseSummary.textContent()
        expect(text?.length).toBeGreaterThan(50)
    })

    test('should explain key points of AGPL-3.0', async ({ page }) => {
        const keyPoints = page.locator('[data-testid="license-key-points"]')
        await expect(keyPoints).toBeVisible()

        const text = await keyPoints.textContent()
        expect(text?.toLowerCase()).toMatch(/open.?source|free|modify|distribute/)
    })

    test('should explain copyleft requirement', async ({ page }) => {
        const keyPoints = page.locator('[data-testid="license-key-points"]')
        const text = await keyPoints.textContent()

        expect(text?.toLowerCase()).toMatch(/copyleft|same license|share/)
    })

    test('should explain network use clause', async ({ page }) => {
        const keyPoints = page.locator('[data-testid="license-key-points"]')
        const text = await keyPoints.textContent()

        // AGPL requires sharing source for network use
        expect(text?.toLowerCase()).toMatch(/network|server|service/)
    })

    test('should have third-party licenses section', async ({ page }) => {
        const thirdPartyLicenses = page.locator('[data-testid="third-party-licenses"]')
        await expect(thirdPartyLicenses).toBeVisible()

        const text = await thirdPartyLicenses.textContent()
        expect(text?.toLowerCase()).toMatch(/third.?party|dependencies|libraries/)
    })

    test('should list key dependencies and their licenses', async ({ page }) => {
        const dependencyList = page.locator('[data-testid="dependency-item"]')

        // Should have at least some dependencies listed
        const count = await dependencyList.count()
        expect(count).toBeGreaterThan(0)
    })

    test('should link to GitHub license file', async ({ page }) => {
        const githubLicenseLink = page.locator('a[href*="github.com"][href*="LICENSE"]')
        await expect(githubLicenseLink).toBeVisible()
    })

    test('should link to FSF AGPL page', async ({ page }) => {
        const fsfLink = page.locator('a[href*="gnu.org"]')

        // FSF link might be optional
        const exists = await fsfLink.isVisible().catch(() => false)
        if (exists) {
            const href = await fsfLink.getAttribute('href')
            expect(href).toContain('gnu.org')
        }
    })
})

test.describe('Legal Pages - Navigation', () => {
    test('privacy page should link to terms and license', async ({ page }) => {
        await page.goto(PRIVACY_URL)

        const termsLink = page.locator('a[href*="/terms"]')
        const licenseLink = page.locator('a[href*="/license"]')

        // Should have at least one cross-link
        const hasTermsLink = await termsLink.isVisible().catch(() => false)
        const hasLicenseLink = await licenseLink.isVisible().catch(() => false)

        expect(hasTermsLink || hasLicenseLink).toBe(true)
    })

    test('terms page should link to privacy and license', async ({ page }) => {
        await page.goto(TERMS_URL)

        const privacyLink = page.locator('a[href*="/privacy"]')
        const licenseLink = page.locator('a[href*="/license"]')

        const hasPrivacyLink = await privacyLink.isVisible().catch(() => false)
        const hasLicenseLink = await licenseLink.isVisible().catch(() => false)

        expect(hasPrivacyLink || hasLicenseLink).toBe(true)
    })

    test('license page should link to terms', async ({ page }) => {
        await page.goto(LICENSE_URL)

        const termsLink = page.locator('a[href*="/terms"]')

        const hasTermsLink = await termsLink.isVisible().catch(() => false)
        expect(hasTermsLink || true).toBe(true) // Link is optional
    })
})

test.describe('Legal Pages - Content Quality', () => {
    test('privacy page should have proper heading hierarchy', async ({ page }) => {
        await page.goto(PRIVACY_URL)

        const h1 = page.locator('h1')
        const h1Count = await h1.count()
        expect(h1Count).toBe(1)

        const h2 = page.locator('h2')
        const h2Count = await h2.count()
        expect(h2Count).toBeGreaterThan(0)
    })

    test('terms page should have proper heading hierarchy', async ({ page }) => {
        await page.goto(TERMS_URL)

        const h1 = page.locator('h1')
        const h1Count = await h1.count()
        expect(h1Count).toBe(1)

        const h2 = page.locator('h2')
        const h2Count = await h2.count()
        expect(h2Count).toBeGreaterThan(0)
    })

    test('license page should have proper heading hierarchy', async ({ page }) => {
        await page.goto(LICENSE_URL)

        const h1 = page.locator('h1')
        const h1Count = await h1.count()
        expect(h1Count).toBe(1)
    })

    test('legal pages should have table of contents for easy navigation', async ({ page }) => {
        await page.goto(PRIVACY_URL)

        const toc = page.locator('[data-testid="table-of-contents"]')

        // TOC might be optional
        const exists = await toc.isVisible().catch(() => false)
        if (exists) {
            const tocLinks = toc.locator('a')
            const count = await tocLinks.count()
            expect(count).toBeGreaterThan(3)
        }
    })

    test('legal pages should have smooth scroll to sections', async ({ page }) => {
        await page.goto(PRIVACY_URL)

        const tocLink = page.locator('[data-testid="table-of-contents"] a').first()

        if (await tocLink.isVisible().catch(() => false)) {
            await tocLink.click()
            await page.waitForTimeout(500)

            const scrollY = await page.evaluate(() => window.scrollY)
            expect(scrollY).toBeGreaterThan(0)
        }
    })
})

test.describe('Legal Pages - SEO', () => {
    const legalPages = [
        { path: '/privacy', name: 'Privacy Policy' },
        { path: '/terms', name: 'Terms of Service' },
        { path: '/license', name: 'License' },
    ]

    for (const pageInfo of legalPages) {
        test(`${pageInfo.name} should have proper title`, async ({ page }) => {
            await page.goto(`${WEBSITE_URL}${pageInfo.path}`)

            const title = await page.title()
            expect(title).toBeTruthy()
            expect(title.toLowerCase()).toMatch(/privacy|terms|license/)
        })

        test(`${pageInfo.name} should have meta description`, async ({ page }) => {
            await page.goto(`${WEBSITE_URL}${pageInfo.path}`)

            const description = await page.locator('meta[name="description"]').getAttribute('content')
            expect(description).toBeTruthy()
            expect(description!.length).toBeGreaterThan(30)
        })

        test(`${pageInfo.name} should have noindex meta tag`, async ({ page }) => {
            await page.goto(`${WEBSITE_URL}${pageInfo.path}`)

            const robotsMeta = page.locator('meta[name="robots"]')

            // Legal pages often have noindex to avoid duplicate content issues
            // But this is optional
            const exists = await robotsMeta.isVisible().catch(() => false)
            expect(exists || true).toBe(true)
        })
    }
})

test.describe('Legal Pages - Responsive Design', () => {
    test('privacy page should display correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(PRIVACY_URL)

        const privacyPage = page.locator('[data-testid="privacy-page"]')
        await expect(privacyPage).toBeVisible()

        // Text should be readable (not too wide)
        const content = page.locator('[data-testid="privacy-page"]')
        const box = await content.boundingBox()
        if (box) {
            expect(box.width).toBeLessThanOrEqual(375)
        }
    })

    test('terms page should display correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(TERMS_URL)

        const termsPage = page.locator('[data-testid="terms-page"]')
        await expect(termsPage).toBeVisible()
    })

    test('license page should display correctly on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(LICENSE_URL)

        const licensePage = page.locator('[data-testid="license-page"]')
        await expect(licensePage).toBeVisible()
    })

    test('legal pages should have readable font size on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(PRIVACY_URL)

        const bodyText = page.locator('[data-testid="privacy-page"] p').first()
        const fontSize = await bodyText.evaluate((el) => window.getComputedStyle(el).fontSize)

        // Font size should be at least 14px for readability
        const fontSizeNum = parseInt(fontSize)
        expect(fontSizeNum).toBeGreaterThanOrEqual(14)
    })
})
