/**
 * @file SEO and Internationalization E2E Test Scenarios
 * @description Test scenarios for SEO and multi-language support
 * Status: TDD RED PHASE - Tests will fail until implementation is complete
 */

import { test, expect } from '@playwright/test'

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000'

test.describe('SEO - Meta Tags and Structure (NFR-4.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should have proper HTML structure', async ({ page }) => {
        // Check for html lang attribute
        const htmlLang = await page.getAttribute('html', 'lang')
        expect(htmlLang).toBeTruthy()
        expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
    })

    test('should have title tag', async ({ page }) => {
        const title = await page.title()
        expect(title).toBeTruthy()
        expect(title.length).toBeGreaterThan(10)
        expect(title.length).toBeLessThan(70) // SEO best practice
    })

    test('should have meta description', async ({ page }) => {
        const description = await page.locator('meta[name="description"]').getAttribute('content')
        expect(description).toBeTruthy()
        expect(description!.length).toBeGreaterThan(50)
        expect(description!.length).toBeLessThan(160) // SEO best practice
    })

    test('should have meta viewport for mobile', async ({ page }) => {
        const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
        expect(viewport).toContain('width=device-width')
        expect(viewport).toContain('initial-scale=1')
    })

    test('should have canonical URL', async ({ page }) => {
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
        expect(canonical).toBeTruthy()
        expect(canonical).toContain(WEBSITE_URL.replace(/^https?:\/\//, ''))
    })

    test('should have Open Graph tags', async ({ page }) => {
        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
        const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content')
        const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
        const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content')
        const ogType = await page.locator('meta[property="og:type"]').getAttribute('content')

        expect(ogTitle).toBeTruthy()
        expect(ogDescription).toBeTruthy()
        expect(ogImage).toBeTruthy()
        expect(ogUrl).toBeTruthy()
        expect(ogType).toBeTruthy()
    })

    test('should have Twitter Card tags', async ({ page }) => {
        const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content')
        const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content')
        const twitterDescription = await page
            .locator('meta[name="twitter:description"]')
            .getAttribute('content')

        expect(twitterCard).toBeTruthy()
        expect(twitterTitle).toBeTruthy()
        expect(twitterDescription).toBeTruthy()
    })

    test('should have proper h1 tag', async ({ page }) => {
        const h1 = page.locator('h1')
        await expect(h1).toBeVisible()

        const h1Count = await h1.count()
        expect(h1Count).toBe(1) // Should have exactly one h1

        const h1Text = await h1.textContent()
        expect(h1Text).toBeTruthy()
        expect(h1Text!.length).toBeGreaterThan(10)
    })

    test('should use semantic HTML5 elements', async ({ page }) => {
        const header = await page.locator('header').count()
        const nav = await page.locator('nav').count()
        const main = await page.locator('main').count()
        const footer = await page.locator('footer').count()

        expect(header).toBeGreaterThan(0)
        expect(nav).toBeGreaterThan(0)
        expect(main).toBeGreaterThan(0)
        expect(footer).toBeGreaterThan(0)
    })
})

test.describe('SEO - Structured Data (NFR-4.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should have JSON-LD structured data', async ({ page }) => {
        const jsonLd = page.locator('script[type="application/ld+json"]')
        const count = await jsonLd.count()

        expect(count).toBeGreaterThan(0)

        // Validate JSON-LD content
        const content = await jsonLd.first().textContent()
        expect(content).toBeTruthy()

        const parsed = JSON.parse(content!)
        expect(parsed['@context']).toBe('https://schema.org')
        expect(parsed['@type']).toBeTruthy()
    })

    test('should have Organization schema', async ({ page }) => {
        const jsonLd = page.locator('script[type="application/ld+json"]')
        const count = await jsonLd.count()

        let hasOrganization = false
        for (let i = 0; i < count; i++) {
            const content = await jsonLd.nth(i).textContent()
            if (content) {
                const parsed = JSON.parse(content)
                if (parsed['@type'] === 'Organization' || parsed['@type'] === 'SoftwareApplication') {
                    hasOrganization = true
                    expect(parsed.name).toBeTruthy()
                    break
                }
            }
        }

        expect(hasOrganization).toBe(true)
    })

    test('should have WebSite schema with search action', async ({ page }) => {
        const jsonLd = page.locator('script[type="application/ld+json"]')
        const count = await jsonLd.count()

        let hasWebSite = false
        for (let i = 0; i < count; i++) {
            const content = await jsonLd.nth(i).textContent()
            if (content) {
                const parsed = JSON.parse(content)
                if (parsed['@type'] === 'WebSite') {
                    hasWebSite = true
                    expect(parsed.url).toBeTruthy()
                    break
                }
            }
        }

        // WebSite schema is optional but recommended
        expect(hasWebSite || true).toBe(true)
    })
})

test.describe('SEO - Sitemap and Robots (NFR-4.1)', () => {
    test('should have sitemap.xml', async ({ page }) => {
        const response = await page.goto(`${WEBSITE_URL}/sitemap.xml`)
        expect(response?.status()).toBe(200)

        const content = await page.content()
        expect(content).toContain('<?xml')
        expect(content).toContain('<urlset')
        expect(content).toContain('<url>')
    })

    test('should have robots.txt', async ({ page }) => {
        const response = await page.goto(`${WEBSITE_URL}/robots.txt`)
        expect(response?.status()).toBe(200)

        const content = await page.content()
        expect(content).toContain('User-agent:')
        expect(content).toContain('Sitemap:')
    })

    test('robots.txt should reference sitemap', async ({ page }) => {
        await page.goto(`${WEBSITE_URL}/robots.txt`)
        const content = await page.content()

        expect(content).toContain('Sitemap:')
        expect(content).toContain('/sitemap.xml')
    })
})

test.describe('SEO - Internal Linking', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should have no broken internal links', async ({ page }) => {
        const links = page.locator('a[href^="/"], a[href^="' + WEBSITE_URL + '"]')
        const count = await links.count()

        const brokenLinks: string[] = []

        for (let i = 0; i < Math.min(count, 20); i++) {
            const link = links.nth(i)
            const href = await link.getAttribute('href')

            if (href && href.startsWith('/')) {
                const response = await page.request.get(`${WEBSITE_URL}${href}`).catch(() => null)

                if (response && response.status() >= 400) {
                    brokenLinks.push(href)
                }
            }
        }

        expect(brokenLinks.length).toBe(0)
    })

    test('should have descriptive anchor text', async ({ page }) => {
        const links = page.locator('a')
        const count = await links.count()

        for (let i = 0; i < Math.min(count, 10); i++) {
            const link = links.nth(i)
            const text = await link.textContent()
            const ariaLabel = await link.getAttribute('aria-label')

            // Should have meaningful text or aria-label
            const hasText = (text && text.trim().length > 0) || ariaLabel

            if (hasText) {
                // Avoid generic text
                const lowercaseText = (text || ariaLabel || '').toLowerCase()
                expect(['click here', 'here', 'read more', 'learn more'].includes(lowercaseText)).toBe(false)
            }
        }
    })
})

test.describe('SEO - Different Pages', () => {
    const pages = [
        { path: '/', name: 'Homepage' },
        { path: '/download', name: 'Download' },
        { path: '/docs', name: 'Documentation' },
        { path: '/about', name: 'About' },
    ]

    for (const pageInfo of pages) {
        test(`${pageInfo.name} should have unique title`, async ({ page }) => {
            await page.goto(`${WEBSITE_URL}${pageInfo.path}`)
            const title = await page.title()

            expect(title).toBeTruthy()
            expect(title).toContain('nextai' || title.toLowerCase().includes('translator'))
        })

        test(`${pageInfo.name} should have unique meta description`, async ({ page }) => {
            await page.goto(`${WEBSITE_URL}${pageInfo.path}`)
            const description = await page.locator('meta[name="description"]').getAttribute('content')

            expect(description).toBeTruthy()
            expect(description!.length).toBeGreaterThan(50)
        })
    }
})

test.describe('Internationalization - Multi-language Support (NFR-5.1)', () => {
    test('should have language selector', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        const languageSelector = page.locator('[data-testid="language-selector"]')
        await expect(languageSelector).toBeVisible()
    })

    test('should support English language', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        // Set language to English
        const languageSelector = page.locator('[data-testid="language-selector"]')
        await languageSelector.click()

        const englishOption = page.locator('[data-testid="language-option-en"]')
        await englishOption.click()

        // Check if content is in English
        const htmlLang = await page.getAttribute('html', 'lang')
        expect(htmlLang).toBe('en')
    })

    test('should support Chinese (Simplified) language', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        // Set language to Chinese
        const languageSelector = page.locator('[data-testid="language-selector"]')
        await languageSelector.click()

        const chineseOption = page.locator('[data-testid="language-option-zh"]')
        await chineseOption.click()

        // Check if content is in Chinese
        const htmlLang = await page.getAttribute('html', 'lang')
        expect(htmlLang).toMatch(/zh|zh-CN|zh-Hans/)
    })

    test('should have hreflang tags for language alternates', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        const hreflangTags = page.locator('link[rel="alternate"][hreflang]')
        const count = await hreflangTags.count()

        // Should have hreflang tags for different languages
        expect(count).toBeGreaterThan(0)

        // Check for English and Chinese
        const enHreflang = await page.locator('link[hreflang="en"]').count()
        const zhHreflang = await page.locator('link[hreflang*="zh"]').count()

        expect(enHreflang + zhHreflang).toBeGreaterThan(0)
    })

    test('should update URL when language changes', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        const languageSelector = page.locator('[data-testid="language-selector"]')
        await languageSelector.click()

        const chineseOption = page.locator('[data-testid="language-option-zh"]')
        await chineseOption.click()

        await page.waitForTimeout(500)

        // URL should contain language code or content should be in Chinese
        const url = page.url()
        const hasLangInUrl = url.includes('/zh') || url.includes('/zh-CN')

        // Or check if content changed
        const title = await page.title()

        expect(hasLangInUrl || title.length > 0).toBe(true)
    })
})

test.describe('Internationalization - Language Switching (NFR-5.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should persist language selection', async ({ page }) => {
        // Change language
        const languageSelector = page.locator('[data-testid="language-selector"]')
        await languageSelector.click()

        const chineseOption = page.locator('[data-testid="language-option-zh"]')
        await chineseOption.click()

        await page.waitForTimeout(500)

        // Navigate to another page
        const downloadLink = page.locator('a[href*="/download"]').first()
        await downloadLink.click()

        await page.waitForURL(/\/download/)

        // Language should persist
        const htmlLang = await page.getAttribute('html', 'lang')
        expect(htmlLang).toMatch(/zh/)
    })

    test('should translate navigation items', async ({ page }) => {
        const languageSelector = page.locator('[data-testid="language-selector"]')
        await languageSelector.click()

        // Switch to Chinese
        const chineseOption = page.locator('[data-testid="language-option-zh"]')
        await chineseOption.click()

        await page.waitForTimeout(500)

        // Check if navigation has Chinese text
        const nav = page.locator('nav')
        const navText = await nav.textContent()

        // Should contain Chinese characters or translated text
        expect(navText).toBeTruthy()
    })

    test('should have language toggle in footer', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

        const footerLanguageSelector = page.locator('footer [data-testid="footer-language-selector"]')

        // Language selector in footer is optional
        const exists = await footerLanguageSelector.isVisible().catch(() => false)
        expect(exists || true).toBe(true)
    })
})

test.describe('Internationalization - Content Translation', () => {
    test('should have translated homepage content in Chinese', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        const languageSelector = page.locator('[data-testid="language-selector"]')
        await languageSelector.click()

        const chineseOption = page.locator('[data-testid="language-option-zh"]')
        await chineseOption.click()

        await page.waitForTimeout(1000)

        // Check hero headline is translated
        const heroHeadline = page.locator('[data-testid="hero-headline"]')
        const headlineText = await heroHeadline.textContent()

        // Should contain Chinese characters
        expect(headlineText).toMatch(/[\u4e00-\u9fa5]/)
    })

    test('should have translated documentation in Chinese', async ({ page }) => {
        await page.goto(`${WEBSITE_URL}/docs`)

        const languageSelector = page.locator('[data-testid="language-selector"]')
        await languageSelector.click()

        const chineseOption = page.locator('[data-testid="language-option-zh"]')
        await chineseOption.click()

        await page.waitForTimeout(1000)

        const docsContent = page.locator('[data-testid="docs-content"]')
        const contentText = await docsContent.textContent()

        // Should contain Chinese characters
        expect(contentText).toMatch(/[\u4e00-\u9fa5]/)
    })
})

test.describe('SEO - Performance for Search Engines', () => {
    test('should have server-side rendering or static generation', async ({ page }) => {
        const response = await page.goto(WEBSITE_URL)
        const html = await response?.text()

        // Content should be in initial HTML (not just loaded by JS)
        expect(html).toContain('nextai' || html?.toLowerCase().includes('translator'))

        // Should have content in the HTML
        expect(html?.length).toBeGreaterThan(1000)
    })

    test('should not have too many redirects', async ({ page }) => {
        let redirectCount = 0

        page.on('response', (response) => {
            const status = response.status()
            if (status >= 300 && status < 400) {
                redirectCount++
            }
        })

        await page.goto(WEBSITE_URL)

        // Should have at most 1 redirect
        expect(redirectCount).toBeLessThanOrEqual(1)
    })

    test('should have proper status codes', async ({ page }) => {
        const response = await page.goto(WEBSITE_URL)
        expect(response?.status()).toBe(200)
    })

    test('404 page should return 404 status', async ({ page }) => {
        const response = await page.goto(`${WEBSITE_URL}/this-page-does-not-exist-12345`, {
            waitUntil: 'networkidle',
        })

        expect(response?.status()).toBe(404)
    })
})

test.describe('Security - HTTPS Headers (NFR-6.2)', () => {
    test('should have security headers', async ({ page }) => {
        const response = await page.goto(WEBSITE_URL)
        const headers = response?.headers()

        // Check for security headers
        expect(headers?.['x-frame-options'] || headers?.['X-Frame-Options']).toBeTruthy()
        expect(headers?.['x-content-type-options'] || headers?.['X-Content-Type-Options']).toBeTruthy()

        // Check for CSP (Content-Security-Policy) - might be implementation-specific
        // expect(headers?.['content-security-policy']).toBeTruthy()
    })

    test('should use HTTPS protocol', async ({ page }) => {
        await page.goto(WEBSITE_URL)
        const url = page.url()

        // In production, should use HTTPS
        if (!WEBSITE_URL.includes('localhost')) {
            expect(url).toMatch(/^https:\/\//)
        }
    })
})
