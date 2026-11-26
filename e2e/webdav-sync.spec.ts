import { webcrypto } from 'node:crypto'
import { defaultActionSettings } from '../src/common/webdav-action-settings'
import { encryptSettings } from '../src/common/webdav-sync'
import { expect, test } from './fixtures'
import { getOptionsPageUrl } from './common'

test('uploads and restores WebDAV settings from the extension options', async ({ page, extensionId }) => {
    // This origin already has a host permission in the production manifest.
    const url = 'https://api.openai.com/nextai-webdav-test.json'
    const passphrase = 'browser test passphrase'
    let uploaded: string | undefined
    let remote: string | undefined
    let revision = 0
    await page.route(url, async (route) => {
        if (route.request().method() === 'GET') {
            await route.fulfill(
                remote ? { status: 200, body: remote, headers: { ETag: `"${revision}"` } } : { status: 404 }
            )
            return
        }
        expect(route.request().method()).toBe('PUT')
        if (remote) {
            expect(route.request().headers()['if-match']).toBe(`"${revision}"`)
        } else {
            expect(route.request().headers()['if-none-match']).toBe('*')
        }
        uploaded = route.request().postData() ?? undefined
        remote = uploaded
        revision++
        await route.fulfill({ status: 201 })
    })
    await page.goto(getOptionsPageUrl(extensionId))
    await page.getByRole('tab', { name: 'WebDAV Sync' }).click()
    await page.locator('#webdav-url').fill(url)
    await page.locator('#webdav-passphrase').fill(passphrase)
    await page.getByRole('button', { name: 'Sync now' }).click()
    await expect(page.getByRole('status')).toHaveText('Settings synced.')
    expect(JSON.parse(uploaded!)).toMatchObject({
        version: 1,
        salt: expect.any(String),
        iv: expect.any(String),
        data: expect.any(String),
    })
    // Node 18 does not expose Web Crypto globally by default.
    if (!globalThis.crypto) {
        Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
    }
    remote = await encryptSettings(
        {
            autoTranslate: false,
            fontSize: 23,
            actionSettings: {
                actions: [...defaultActionSettings.actions, { syncId: 'custom:test:1', name: 'Synced action' }],
                defaultAction: 'custom:test:1',
            },
        },
        passphrase
    )
    revision++

    await page.getByRole('button', { name: 'Sync now' }).click()
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    new Promise<Record<string, unknown>>((resolve) => {
                        chrome.storage.sync.get(['autoTranslate', 'fontSize', 'defaultTranslateMode'], resolve)
                    })
            )
        )
        .toEqual({ autoTranslate: false, fontSize: 23, defaultTranslateMode: expect.stringMatching(/^\d+$/) })
    await expect(page.getByRole('status')).toHaveText('Settings synced.')
})
