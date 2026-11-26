import { webcrypto } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { defaultActionSettings } from './webdav-action-settings'
import { encryptSettings, SettingsSnapshot, synchronizeSettings, webdavURL } from './webdav-sync'

beforeAll(() => {
    vi.stubGlobal('crypto', webcrypto)
})

const connection = {
    url: 'https://dav.example.com/config.json',
    username: 'alice',
    password: 'dav-password',
    passphrase: 'sync passphrase',
}

function createServer() {
    let body: string | undefined
    let revision = 0
    let sendETag = true
    let rejectPut = false
    const fetch = vi.fn(async (_url: string, options: RequestInit) => {
        const headers = new Headers(options.headers)
        if (options.method !== 'PUT') {
            return body
                ? new Response(body, { headers: sendETag ? { ETag: `"${revision}"` } : {} })
                : new Response(null, { status: 404 })
        }
        const validCondition = body ? headers.get('If-Match') === `"${revision}"` : headers.get('If-None-Match') === '*'
        if (!validCondition || rejectPut) {
            return new Response(null, { status: 412 })
        }
        body = options.body as string
        revision++
        return new Response(null, { status: 204 })
    })
    return {
        fetch,
        get body() {
            return body
        },
        replace: async (settings: SettingsSnapshot, passphrase = connection.passphrase) => {
            body = await encryptSettings(settings, passphrase)
            revision++
        },
        omitETag: () => {
            sendETag = false
        },
        rejectWrites: () => {
            rejectPut = true
        },
    }
}

function device(server: ReturnType<typeof createServer>, initial: SettingsSnapshot = {}) {
    const local = { ...initial }
    let baseline: SettingsSnapshot | undefined
    const writeLocal = vi.fn(async (settings: SettingsSnapshot) => {
        Object.assign(local, settings)
    })
    return {
        local,
        writeLocal,
        sync: async (options: Partial<Parameters<typeof synchronizeSettings>[0]> = {}) => {
            baseline = await synchronizeSettings({
                connection,
                fetch: server.fetch,
                readLocal: async () => ({ ...local }),
                writeLocal,
                baseline,
                ...options,
            })
            return baseline
        },
    }
}

describe('WebDAV settings sync', () => {
    it('encrypts the complete snapshot and restores false, zero, empty and nested values on another device', async () => {
        const server = createServer()
        const settings = {
            apiKeys: 'test-api-key-汉字',
            automaticCheckForUpdates: false,
            uiFontSize: 0,
            geminiAPIURL: '',
            proxy: { enabled: true, protocol: 'HTTP', port: '8000', basicAuth: { username: 'u', password: 'p' } },
            tts: { provider: 'WebSpeech', voices: [{ lang: 'en', voice: 'test' }] },
            actionSettings: {
                actions: [
                    ...defaultActionSettings.actions,
                    { syncId: 'custom:device:1', name: 'Custom', provider: 'OpenAI', apiModel: 'model' },
                ],
                defaultAction: 'custom:device:1',
            },
        }
        await device(server, settings).sync()
        expect(server.body).not.toMatch(/test-api-key|dav-password|sync passphrase|apiKeys|actionSettings/)
        expect(server.fetch.mock.calls[0][1].headers).toEqual({ Authorization: 'Basic YWxpY2U6ZGF2LXBhc3N3b3Jk' })
        const second = device(server)
        await second.sync()
        expect(second.local).toEqual(settings)
        expect(server.fetch.mock.calls.filter(([, request]) => request.method === 'PUT')).toHaveLength(1)
    })

    it('merges edits to different keys and propagates a cleared value', async () => {
        const server = createServer()
        const first = device(server, { fontSize: 15, apiKeys: 'test-key' })
        const second = device(server)
        await first.sync()
        await second.sync()
        delete first.local.apiKeys
        second.local.fontSize = 18
        await first.sync()
        await second.sync()
        expect(second.local).toEqual({ fontSize: 18, apiKeys: null })
        await first.sync()
        expect(first.local).toEqual({ fontSize: 18 })
    })

    it('requires an explicit choice for overlapping edits and preserves unrelated changes', async () => {
        const server = createServer()
        const first = device(server, { fontSize: 15 })
        const second = device(server)
        await first.sync()
        await second.sync()
        first.local.fontSize = 16
        second.local.fontSize = 18
        second.local.alwaysShowIcons = false
        await first.sync()
        const savedFile = server.body
        await expect(second.sync()).rejects.toMatchObject({ code: 'conflict' })
        expect(server.body).toBe(savedFile)
        expect(second.local.fontSize).toBe(18)
        await second.sync({ preference: 'remote' })
        expect(second.local).toEqual({ fontSize: 16, alwaysShowIcons: false })
        await first.sync()
        expect(first.local.alwaysShowIcons).toBe(false)
    })

    it('preserves unfamiliar settings from a newer client', async () => {
        const server = createServer()
        await server.replace({ futureField: { keep: true } })
        const first = device(server, { fontSize: 18 })
        const snapshot = await first.sync()
        expect(snapshot.futureField).toEqual({ keep: true })
        expect(first.local).toEqual({ fontSize: 18 })
    })

    it('does not write locally or remotely for an incorrect passphrase or invalid settings', async () => {
        const server = createServer()
        const first = device(server, { fontSize: 15 })
        await server.replace({ fontSize: 18 }, 'another passphrase')
        await expect(first.sync()).rejects.toMatchObject({ code: 'file' })
        await server.replace({ proxy: { port: 80 } })
        await expect(first.sync()).rejects.toMatchObject({ code: 'file' })
        await server.replace({ actionSettings: { actions: [], defaultAction: null } })
        await expect(first.sync()).rejects.toMatchObject({ code: 'file' })
        expect(first.writeLocal).not.toHaveBeenCalled()
        expect(server.fetch.mock.calls.every(([, options]) => !options.method)).toBe(true)
    })

    it('requires a strong ETag for updates and rejects a concurrent remote write', async () => {
        const server = createServer()
        const first = device(server, { fontSize: 15 })
        await first.sync()
        first.local.fontSize = 18
        server.omitETag()
        await expect(first.sync()).rejects.toMatchObject({ code: 'etag' })
        const nextServer = createServer()
        await nextServer.replace({ autoTranslate: false })
        const second = device(nextServer, { fontSize: 15 })
        nextServer.rejectWrites()
        await expect(second.sync()).rejects.toMatchObject({ code: 'remote-changed' })
        expect(second.writeLocal).not.toHaveBeenCalled()
    })

    it('rejects a local edit during sync before applying the remote settings', async () => {
        const server = createServer()
        await server.replace({ fontSize: 18 })
        const first = device(server)
        const readLocal = vi.fn().mockResolvedValueOnce({}).mockResolvedValue({ fontSize: 21 })
        await expect(first.sync({ readLocal })).rejects.toMatchObject({ code: 'local-changed' })
        expect(first.writeLocal).not.toHaveBeenCalled()
    })

    it('requires HTTPS except on the local machine and rejects credentials embedded in URLs', () => {
        expect(webdavURL('http://127.0.0.1:8080/local.json').port).toBe('8080')
        for (const url of [
            'http://dav.example.com/file.json',
            'https://user:pass@dav.example.com/file.json',
            'https://dav.example.com/',
        ]) {
            expect(() => webdavURL(url)).toThrow('url')
        }
    })
})
