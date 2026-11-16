import { getOptionsPageUrl, getPopupPageUrl } from './common'
import { expect, test } from './fixtures'

const endpoint = 'https://mcp.parallel.ai/mcp'
const phrase = 'HTTP conditional requests'
const privateText = 'Private text in the translator'
const sourceTitle = 'RFC 9110: HTTP Semantics'
const sourceUrl = 'https://www.rfc-editor.org/rfc/rfc9110.html#name-conditional-requests'
const excerpt = 'Conditional requests allow a client to place preconditions on the action indicated by a request.'

test('looks up only the public phrase explicitly submitted from the popup', async ({ page, extensionId }) => {
    const requestMethods: string[] = []
    const searchBodies: unknown[] = []
    await page.route(endpoint, async (route) => {
        const request = route.request()
        const headers = {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': 'content-type, mcp-protocol-version, mcp-session-id',
            'access-control-allow-methods': 'POST, DELETE, OPTIONS',
        }
        if (request.method() !== 'POST') {
            await route.fulfill({ status: 204, headers })
            return
        }

        const body = request.postDataJSON()
        requestMethods.push(body.method)
        if (body.method === 'notifications/initialized') {
            await route.fulfill({ status: 202, headers })
            return
        }

        const searchResult = {
            results: [{ title: sourceTitle, url: sourceUrl, excerpts: [excerpt] }],
        }
        if (body.method === 'tools/call') searchBodies.push(body.params)
        const result =
            body.method === 'initialize'
                ? {
                      protocolVersion: body.params.protocolVersion,
                      capabilities: { tools: {} },
                      serverInfo: { name: 'Parallel', version: '1.0.0' },
                  }
                : {
                      content: [{ type: 'text', text: JSON.stringify(searchResult) }],
                      structuredContent: searchResult,
                  }
        await route.fulfill({
            headers,
            json: { jsonrpc: '2.0', id: body.id, result },
        })
    })

    await page.goto(getPopupPageUrl(extensionId))
    await page.evaluate(
        () =>
            new Promise<void>((resolve) =>
                chrome.storage.sync.set({ apiKeys: 'test-key', autoTranslate: false, i18n: 'en' }, resolve)
            )
    )
    await page.reload()

    const openLookup = page.getByRole('button', { name: 'Look up public phrase', exact: true })
    const editor = page.getByTestId('popup-container').locator('textarea')
    await expect(editor).toBeVisible()
    await expect(openLookup).toHaveCount(0)
    expect(requestMethods).toEqual([])

    await page.goto(getOptionsPageUrl(extensionId))
    const toggle = page.getByRole('checkbox', { name: 'Public phrase lookup', exact: true })
    await expect(toggle).not.toBeChecked()
    await toggle.locator('..').click()
    await expect(toggle).toBeChecked()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect
        .poll(() => page.evaluate(() => chrome.storage.sync.get('enablePublicPhraseLookup')))
        .toEqual({
            enablePublicPhraseLookup: true,
        })
    await page.goto(getPopupPageUrl(extensionId))

    await editor.fill(privateText)
    await openLookup.click()
    const dialog = page.getByRole('dialog')
    const input = dialog.getByLabel('Public phrase', { exact: true })
    const search = dialog.getByRole('button', { name: 'Search with Parallel', exact: true })
    await expect(input).toHaveValue('')
    await expect(search).toBeDisabled()
    await input.fill('依赖注入')
    await expect(search).toBeEnabled()
    await input.fill(phrase)
    await expect(search).toBeEnabled()
    expect(requestMethods).toEqual([])
    await search.click()

    await expect(dialog.getByRole('link', { name: sourceTitle })).toHaveAttribute('href', sourceUrl)
    await expect(dialog.getByText(excerpt, { exact: true })).toBeVisible()
    expect(searchBodies).toEqual([
        {
            name: 'web_search',
            arguments: {
                objective:
                    'Find short passages from official documentation or specifications that explain the technical phrase.',
                search_queries: [phrase],
            },
        },
    ])

    if (process.env.PUBLIC_PHRASE_LOOKUP_SCREENSHOT) {
        await dialog.screenshot({ path: process.env.PUBLIC_PHRASE_LOOKUP_SCREENSHOT })
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await openLookup.click()
    await expect(input).toHaveValue('')
    await expect(dialog.getByText(excerpt, { exact: true })).toHaveCount(0)
    expect(searchBodies).toHaveLength(1)
})

test('saves the lookup preference without requiring a translation provider key', async ({ page, extensionId }) => {
    await page.goto(getOptionsPageUrl(extensionId))
    const toggle = page.getByRole('checkbox', { name: 'Public phrase lookup', exact: true })
    const save = page.getByRole('button', { name: 'Save', exact: true })
    const readSettings = () => page.evaluate(() => chrome.storage.sync.get(['apiKeys', 'enablePublicPhraseLookup']))

    await expect(toggle).not.toBeChecked()
    expect(await readSettings()).toEqual({})
    await toggle.locator('..').click()
    await expect(toggle).toBeChecked()
    expect(await readSettings()).toEqual({})
    await save.click()

    await expect(page.getByText('API Key is required', { exact: true })).toBeVisible()
    await expect.poll(readSettings).toEqual({ enablePublicPhraseLookup: true })

    await page.goto(getPopupPageUrl(extensionId))
    await page.getByRole('button', { name: 'Go back', exact: true }).click()
    await page.getByRole('button', { name: 'Look up public phrase', exact: true }).click()
    await expect(page.getByRole('dialog').getByLabel('Public phrase', { exact: true })).toHaveValue('')

    await page.goto(getOptionsPageUrl(extensionId))
    await expect(toggle).toBeChecked()
    await toggle.locator('..').click()
    await save.click()
    await expect.poll(readSettings).toEqual({ enablePublicPhraseLookup: false })

    await page.goto(getPopupPageUrl(extensionId))
    await page.getByRole('button', { name: 'Go back', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Look up public phrase', exact: true })).toHaveCount(0)
})
