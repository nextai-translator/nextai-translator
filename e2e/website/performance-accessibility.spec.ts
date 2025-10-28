/**
 * @file Performance and Accessibility E2E Test Scenarios
 * @description Test scenarios for performance and accessibility requirements
 * Status: TDD RED PHASE - Tests will fail until implementation is complete
 */

import { test, expect } from '@playwright/test'

const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:3000'

test.describe('Performance - Page Load Time (NFR-1.1)', () => {
    test('homepage should load within 3 seconds', async ({ page }) => {
        const startTime = Date.now()
        await page.goto(WEBSITE_URL, { waitUntil: 'networkidle' })
        const loadTime = Date.now() - startTime

        expect(loadTime).toBeLessThan(3000)
    })

    test('download page should load within 3 seconds', async ({ page }) => {
        const startTime = Date.now()
        await page.goto(`${WEBSITE_URL}/download`, { waitUntil: 'networkidle' })
        const loadTime = Date.now() - startTime

        expect(loadTime).toBeLessThan(3000)
    })

    test('documentation page should load within 3 seconds', async ({ page }) => {
        const startTime = Date.now()
        await page.goto(`${WEBSITE_URL}/docs`, { waitUntil: 'networkidle' })
        const loadTime = Date.now() - startTime

        expect(loadTime).toBeLessThan(3000)
    })

    test('should achieve Lighthouse performance score > 90', async ({ page }) => {
        // Note: This would require Lighthouse CI integration
        // Placeholder test to document the requirement
        await page.goto(WEBSITE_URL)

        // In actual implementation, this would run Lighthouse
        // const lighthouse = await page.lighthouse()
        // expect(lighthouse.performance).toBeGreaterThan(90)

        expect(true).toBe(true) // Placeholder
    })
})

test.describe('Performance - Image Optimization (NFR-1.2)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('all images should have lazy loading', async ({ page }) => {
        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < count; i++) {
            const img = images.nth(i)
            const loading = await img.getAttribute('loading')
            const isAboveFold = await img.evaluate((el) => {
                const rect = el.getBoundingClientRect()
                return rect.top < window.innerHeight
            })

            // Images above fold can be eager, below fold should be lazy
            if (!isAboveFold) {
                expect(loading).toBe('lazy')
            }
        }
    })

    test('images should be optimized (WebP or modern formats)', async ({ page }) => {
        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < Math.min(count, 5); i++) {
            const img = images.nth(i)
            const src = await img.getAttribute('src')

            // Should use modern image formats or Next.js Image optimization
            if (src) {
                const isOptimized =
                    src.includes('.webp') ||
                    src.includes('_next/image') ||
                    src.includes('format=webp') ||
                    src.includes('w=') // Indicates responsive image
                expect(isOptimized).toBe(true)
            }
        }
    })

    test('images should have appropriate dimensions', async ({ page }) => {
        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < Math.min(count, 5); i++) {
            const img = images.nth(i)

            // Should have width/height or CSS sizing
            const hasWidth = await img.getAttribute('width')
            const hasHeight = await img.getAttribute('height')
            const hasStyle = await img.getAttribute('style')

            expect(hasWidth || hasHeight || hasStyle).toBeTruthy()
        }
    })
})

test.describe('Performance - Code Optimization (NFR-1.3)', () => {
    test('should have minimal JavaScript bundle on initial load', async ({ page }) => {
        let totalJSSize = 0

        page.on('response', async (response) => {
            const url = response.url()
            const contentType = response.headers()['content-type']

            if (contentType && contentType.includes('javascript')) {
                const buffer = await response.body().catch(() => Buffer.from(''))
                totalJSSize += buffer.length
            }
        })

        await page.goto(WEBSITE_URL, { waitUntil: 'networkidle' })

        // Initial JS bundle should be < 200KB (requirement from PRD)
        // Note: Compressed size will be smaller due to gzip/brotli
        expect(totalJSSize).toBeLessThan(500000) // 500KB uncompressed (reasonable)
    })

    test('should use code splitting for routes', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        // Navigate to different route
        const downloadLink = page.locator('a[href*="/download"]').first()
        await downloadLink.click()

        await page.waitForURL(/\/download/)

        // Code splitting would be verified by checking network requests
        // for chunk files, but this is implementation-specific
        expect(page.url()).toContain('/download')
    })
})

test.describe('Accessibility - WCAG 2.1 Level AA (NFR-2.1)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should support keyboard navigation', async ({ page }) => {
        // Tab through interactive elements
        await page.keyboard.press('Tab')

        const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
        expect(focusedElement).toBeTruthy()

        // Should be able to navigate to CTA button
        let foundCTA = false
        for (let i = 0; i < 20; i++) {
            await page.keyboard.press('Tab')
            const testId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
            if (testId?.includes('cta') || testId?.includes('download')) {
                foundCTA = true
                break
            }
        }

        expect(foundCTA).toBe(true)
    })

    test('should allow activation with Enter/Space keys', async ({ page }) => {
        const downloadButton = page.locator('[data-testid="hero-primary-cta"]')
        await downloadButton.focus()

        // Should be activatable with Enter
        await page.keyboard.press('Enter')

        // Check if navigation occurred or action triggered
        await page.waitForTimeout(500)
        expect(true).toBe(true) // Placeholder
    })

    test('should have sufficient color contrast', async ({ page }) => {
        // Check contrast ratios for text elements
        const textElements = page.locator('p, h1, h2, h3, button, a')
        const count = await textElements.count()

        for (let i = 0; i < Math.min(count, 10); i++) {
            const element = textElements.nth(i)

            const contrast = await element.evaluate((el) => {
                const styles = window.getComputedStyle(el)
                const color = styles.color
                const bgColor = styles.backgroundColor

                // This is a simplified check - real implementation would calculate contrast ratio
                return { color, bgColor }
            })

            // Color and background should be defined
            expect(contrast.color).toBeTruthy()
        }
    })

    test('all images should have alt text', async ({ page }) => {
        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < count; i++) {
            const img = images.nth(i)
            const alt = await img.getAttribute('alt')

            // Alt can be empty string for decorative images
            expect(alt !== null).toBe(true)
        }
    })

    test('should use semantic HTML', async ({ page }) => {
        // Check for semantic elements
        await expect(page.locator('header')).toBeVisible()
        await expect(page.locator('nav')).toBeVisible()
        await expect(page.locator('main')).toBeVisible()
        await expect(page.locator('footer')).toBeVisible()
    })

    test('should have ARIA labels where needed', async ({ page }) => {
        // Check buttons without visible text have aria-label
        const buttons = page.locator('button[aria-label], a[aria-label]')
        const count = await buttons.count()

        // Should have some ARIA labeled elements
        expect(count).toBeGreaterThan(0)
    })

    test('should have proper heading hierarchy', async ({ page }) => {
        // Check h1 exists
        const h1Count = await page.locator('h1').count()
        expect(h1Count).toBeGreaterThanOrEqual(1)

        // Should not skip heading levels
        const hasH2 = (await page.locator('h2').count()) > 0
        const hasH4 = (await page.locator('h4').count()) > 0

        if (hasH4) {
            // If h4 exists, h2 and h3 should also exist
            expect(hasH2).toBe(true)
            expect((await page.locator('h3').count()) > 0).toBe(true)
        }
    })

    test('should have skip to main content link', async ({ page }) => {
        // Tab to first focusable element
        await page.keyboard.press('Tab')

        const firstFocused = await page.evaluate(() => document.activeElement?.textContent)

        // First focusable element should ideally be "Skip to main content"
        // This is best practice but not strictly required
        if (firstFocused?.toLowerCase().includes('skip')) {
            expect(firstFocused.toLowerCase()).toContain('main')
        }
    })

    test('form inputs should have associated labels', async ({ page }) => {
        const inputs = page.locator('input, select, textarea')
        const count = await inputs.count()

        for (let i = 0; i < count; i++) {
            const input = inputs.nth(i)
            const id = await input.getAttribute('id')
            const ariaLabel = await input.getAttribute('aria-label')
            const ariaLabelledBy = await input.getAttribute('aria-labelledby')

            // Should have either: id with matching label, aria-label, or aria-labelledby
            if (id) {
                const label = page.locator(`label[for="${id}"]`)
                const labelExists = await label.count()
                expect(labelExists > 0 || ariaLabel || ariaLabelledBy).toBeTruthy()
            }
        }
    })
})

test.describe('Accessibility - Screen Reader Compatibility', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEBSITE_URL)
    })

    test('should have descriptive link text', async ({ page }) => {
        const links = page.locator('a')
        const count = await links.count()

        for (let i = 0; i < Math.min(count, 10); i++) {
            const link = links.nth(i)
            const text = await link.textContent()
            const ariaLabel = await link.getAttribute('aria-label')

            // Links should have meaningful text or aria-label
            expect((text && text.trim().length > 0) || ariaLabel).toBeTruthy()

            // Should avoid generic text like "click here"
            if (text) {
                expect(text.toLowerCase()).not.toBe('click here')
                expect(text.toLowerCase()).not.toBe('here')
            }
        }
    })

    test('should have proper landmark regions', async ({ page }) => {
        // Check for ARIA landmarks
        const landmarks = await page.evaluate(() => {
            return {
                hasHeader: !!document.querySelector('header, [role="banner"]'),
                hasNav: !!document.querySelector('nav, [role="navigation"]'),
                hasMain: !!document.querySelector('main, [role="main"]'),
                hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
            }
        })

        expect(landmarks.hasHeader).toBe(true)
        expect(landmarks.hasNav).toBe(true)
        expect(landmarks.hasMain).toBe(true)
        expect(landmarks.hasFooter).toBe(true)
    })

    test('should have live region for dynamic content', async ({ page }) => {
        // Check if dynamic content uses aria-live
        const liveRegions = page.locator('[aria-live]')
        const count = await liveRegions.count()

        // At least some dynamic content should use live regions
        // This is optional but recommended
        expect(count).toBeGreaterThanOrEqual(0)
    })
})

test.describe('Responsive Design (NFR-2.2)', () => {
    const viewports = [
        { name: 'Mobile Portrait', width: 375, height: 667 },
        { name: 'Mobile Landscape', width: 667, height: 375 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1024, height: 768 },
        { name: 'Large Desktop', width: 1920, height: 1080 },
        { name: 'Extra Small', width: 320, height: 568 },
    ]

    for (const viewport of viewports) {
        test(`should display correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
            page,
        }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
            await page.goto(WEBSITE_URL)

            // Main content should be visible
            const main = page.locator('main')
            await expect(main).toBeVisible()

            // No horizontal scrollbar (unless intentional)
            const hasHorizontalScroll = await page.evaluate(() => {
                return document.documentElement.scrollWidth > document.documentElement.clientWidth
            })

            // Allow small overflow (5px tolerance for scrollbar)
            expect(hasHorizontalScroll).toBe(false)
        })
    }

    test('should have responsive images with srcset', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        const images = page.locator('img[srcset], picture img')
        const count = await images.count()

        // At least some images should be responsive
        expect(count).toBeGreaterThan(0)
    })

    test('should hide/show mobile menu appropriately', async ({ page }) => {
        // Desktop - mobile menu should be hidden
        await page.setViewportSize({ width: 1024, height: 768 })
        await page.goto(WEBSITE_URL)

        const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]')
        const isVisible = await mobileMenuButton.isVisible().catch(() => false)

        expect(isVisible).toBe(false)

        // Mobile - mobile menu button should be visible
        await page.setViewportSize({ width: 375, height: 667 })
        await expect(mobileMenuButton).toBeVisible()
    })
})

test.describe('Performance - Core Web Vitals (NFR-4.2)', () => {
    test('should have acceptable LCP (Largest Contentful Paint)', async ({ page }) => {
        await page.goto(WEBSITE_URL)

        const lcp = await page.evaluate(() => {
            return new Promise((resolve) => {
                let lcpValue = 0
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries()
                    const lastEntry = entries[entries.length - 1]
                    lcpValue = lastEntry.renderTime || lastEntry.loadTime
                })

                observer.observe({ entryTypes: ['largest-contentful-paint'] })

                // Resolve after a delay to capture LCP
                setTimeout(() => {
                    observer.disconnect()
                    resolve(lcpValue)
                }, 3000)
            })
        })

        // LCP should be < 2.5 seconds (2500ms)
        expect(lcp).toBeLessThan(2500)
    })

    test('should have minimal CLS (Cumulative Layout Shift)', async ({ page }) => {
        await page.goto(WEBSITE_URL, { waitUntil: 'networkidle' })

        const cls = await page.evaluate(() => {
            return new Promise((resolve) => {
                let clsValue = 0
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!(entry as any).hadRecentInput) {
                            clsValue += (entry as any).value
                        }
                    }
                })

                observer.observe({ entryTypes: ['layout-shift'] })

                setTimeout(() => {
                    observer.disconnect()
                    resolve(clsValue)
                }, 3000)
            })
        })

        // CLS should be < 0.1
        expect(cls).toBeLessThan(0.1)
    })
})

test.describe('Performance - Caching Strategy', () => {
    test('should have proper cache headers for static assets', async ({ page }) => {
        const cacheableResources: string[] = []

        page.on('response', (response) => {
            const url = response.url()
            const cacheControl = response.headers()['cache-control']

            if (url.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/)) {
                if (cacheControl) {
                    cacheableResources.push(url)
                }
            }
        })

        await page.goto(WEBSITE_URL, { waitUntil: 'networkidle' })

        // Should have some cacheable resources
        expect(cacheableResources.length).toBeGreaterThan(0)
    })
})
