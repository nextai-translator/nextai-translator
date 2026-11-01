import { expect, test } from './fixtures'
import { getOptionsPageUrl } from './common'

// Regression: switching to Gemini mounted its APIModelSelector inside a
// display:none block, where baseui cached a 0px listbox width forever - the
// dropdown opened (aria-expanded=true) but rendered zero-width, so clicking
// looked dead. Needs a real key: GEMINI_API_KEY=... pnpm test:e2e
const geminiKey = process.env.GEMINI_API_KEY

test.skip(!geminiKey, 'requires GEMINI_API_KEY env var')

test('gemini model combobox opens at anchor width after provider switch', async ({ page, extensionId }) => {
    await page.goto(getOptionsPageUrl(extensionId))
    await page.evaluate(() => new Promise<void>((resolve) => chrome.storage.sync.set({}, () => resolve())))
    await page.reload()
    await expect(page.getByTestId('settings-container')).toBeVisible()

    // i18n is the first visible select; the provider selector follows it.
    await page.locator('[data-baseweb="select"]:visible').nth(1).click()
    await page.locator('[role="option"]', { hasText: 'Gemini' }).first().click()

    const keyInput = page.locator('input[type="password"]:visible').first()
    await keyInput.fill(geminiKey!)

    const modelInput = page.locator('div[role="combobox"] input:visible')
    await expect(modelInput).toHaveValue('gemini-2.5-flash', { timeout: 15000 })

    await modelInput.click()
    const listbox = page.locator('[role="listbox"]:visible')
    await expect(listbox).toBeVisible({ timeout: 5000 })
    const width = await listbox.evaluate((el) => el.getBoundingClientRect().width)
    expect(width).toBeGreaterThan(0)
    // the full list is ~45 models after filtering to generateContent-capable ones
    expect(await page.locator('[role="option"]:visible').count()).toBeGreaterThan(30)
})
