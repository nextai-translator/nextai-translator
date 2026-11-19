import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from './fixtures'
import { getOptionsPageUrl, getPopupPageUrl } from './common'

const apiURL = process.env.RAPID_MLX_API_URL
const model = 'mlx-community/Qwen3.5-4B-MLX-4bit'

test.skip(!apiURL, 'requires a running Rapid-MLX server via RAPID_MLX_API_URL')

test('Rapid-MLX discovers models and streams a translation without an API key', async ({
    page,
    context,
    extensionId,
}) => {
    test.setTimeout(180000)
    const evidenceDir = path.resolve('evidence')
    await fs.mkdir(evidenceDir, { recursive: true })
    const network: string[] = []
    const consoleLines: string[] = []
    context.on('page', (openedPage) => {
        openedPage.on('console', (msg) => consoleLines.push(`${msg.type()}: ${msg.text()}`))
        openedPage.on('pageerror', (error) => consoleLines.push(`pageerror: ${error.message}`))
    })
    page.on('console', (msg) => consoleLines.push(`${msg.type()}: ${msg.text()}`))
    const worker = context.serviceWorkers().find((item) => item.url().includes(extensionId))!
    // Observe the worker's real fetch calls; older Playwright versions do not
    // surface service worker traffic through BrowserContext request events.
    await worker.evaluate((urlPrefix) => {
        const entries: string[] = []
        ;(self as unknown as { rapidMLXEvidence: string[] }).rapidMLXEvidence = entries
        const originalFetch = self.fetch.bind(self)
        self.fetch = async (input, init) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
            if (!url.startsWith(urlPrefix)) return originalFetch(input, init)
            const headers = Object.fromEntries(new Headers(init?.headers).entries())
            entries.push(JSON.stringify({ method: init?.method || 'GET', url, headers, body: init?.body }))
            const response = await originalFetch(input, init)
            entries.push(`${response.status} ${url}`)
            void response
                .clone()
                .text()
                .then((body) => {
                    const excerpt = url.endsWith('/models')
                        ? JSON.stringify(JSON.parse(body).data.map((item: { id: string }) => item.id))
                        : body
                    entries.push(`Response ${url}: ${excerpt}`)
                })
            return response
        }
    }, apiURL!)

    try {
        await page.goto(getOptionsPageUrl(extensionId))
        await page.evaluate(
            (url) =>
                new Promise<void>((resolve) =>
                    chrome.storage.sync.set(
                        {
                            provider: 'RapidMLX',
                            rapidMLXAPIURL: url,
                            rapidMLXAPIKey: '',
                            rapidMLXAPIModel: '',
                            apiKeys: '',
                            i18n: 'en',
                            languageDetectionEngine: 'local',
                            defaultTranslateMode: 'translate',
                            defaultTargetLanguage: 'zh-Hans',
                        },
                        () => resolve()
                    )
                ),
            apiURL!
        )
        await page.reload()
        await expect(page.getByTestId('settings-container')).toBeVisible()
        await expect(page.locator('input[type="password"]:visible')).toHaveValue('')
        const modelInput = page.locator('div[role="combobox"] input:visible')
        await expect(modelInput).toHaveValue(model, { timeout: 20000 })
        await modelInput.click()
        const modelOption = page.locator('[role="option"]:visible').filter({ hasText: model }).first()
        await expect(modelOption).toBeVisible()
        await page.screenshot({ path: path.join(evidenceDir, 'rapid-mlx-models.png'), fullPage: true })
        await modelOption.click()
        await page.getByRole('button', { name: 'Save', exact: true }).click()
        await expect
            .poll(() =>
                page.evaluate(
                    () =>
                        new Promise<string>((resolve) =>
                            chrome.storage.sync.get('rapidMLXAPIModel', (data) => resolve(data.rapidMLXAPIModel))
                        )
                )
            )
            .toBe(model)

        await page.goto(getPopupPageUrl(extensionId))
        await expect(page.getByTestId('popup-container')).toBeVisible()
        await page.locator('textarea').first().fill('Hello, how are you?')
        await page.locator('textarea').first().press('Enter')
        await expect(page.locator('body')).toContainText(/你好|您好|你好吗|你怎么样/, { timeout: 120000 })
        await expect
            .poll(() =>
                worker.evaluate(() =>
                    (self as unknown as { rapidMLXEvidence: string[] }).rapidMLXEvidence.some((line) =>
                        line.includes('[DONE]')
                    )
                )
            )
            .toBe(true)
        const requests = await worker.evaluate(() =>
            (self as unknown as { rapidMLXEvidence: string[] }).rapidMLXEvidence
                .filter((line) => line.startsWith('{'))
                .map((line) => JSON.parse(line))
        )
        expect(requests.some((request) => request.method === 'GET' && request.url.endsWith('/v1/models'))).toBe(true)
        expect(
            requests.some((request) => request.method === 'POST' && request.url.endsWith('/v1/chat/completions'))
        ).toBe(true)
        for (const request of requests) expect(request.headers.authorization).toBeUndefined()
        await page.screenshot({ path: path.join(evidenceDir, 'rapid-mlx-translation.png'), fullPage: true })
        await fs.writeFile(path.join(evidenceDir, 'translation.txt'), await page.locator('body').innerText())
    } finally {
        network.push(
            ...(await worker.evaluate(() => (self as unknown as { rapidMLXEvidence: string[] }).rapidMLXEvidence))
        )
        await fs.writeFile(path.join(evidenceDir, 'extension-network.log'), network.join('\n') + '\n')
        await fs.writeFile(path.join(evidenceDir, 'extension-console.log'), consoleLines.join('\n') + '\n')
    }
})
