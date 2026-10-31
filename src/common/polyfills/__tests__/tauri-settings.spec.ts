import { beforeEach, describe, expect, it, vi } from 'vitest'

const getConfigContent = vi.fn<[], Promise<string>>()
const writeTextFile = vi.fn()
const rename = vi.fn()

vi.mock('@/tauri/bindings', () => ({
    commands: {
        getConfigContent: () => getConfigContent(),
    },
    events: {
        configUpdatedEvent: {
            listen: () => Promise.resolve(() => undefined),
        },
    },
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
    BaseDirectory: { AppConfig: 'AppConfig' },
    writeTextFile: (...args: unknown[]) => writeTextFile(...args),
    rename: (...args: unknown[]) => rename(...args),
}))

vi.mock('@tauri-apps/plugin-http', () => ({
    fetch: vi.fn(),
}))

const { invalidateTauriSettingsCache, tauriBrowser } = await import('../tauri')

describe('desktop settings cache', () => {
    beforeEach(() => {
        invalidateTauriSettingsCache()
        getConfigContent.mockReset()
        writeTextFile.mockReset().mockResolvedValue(undefined)
        rename.mockReset().mockResolvedValue(undefined)
    })

    it('reads the config file once for many getSettings calls', async () => {
        getConfigContent.mockResolvedValue(JSON.stringify({ apiKeys: 'k', provider: 'OpenAI' }))

        const first = await tauriBrowser.storage.sync.get(['apiKeys', 'provider'])
        const second = await tauriBrowser.storage.sync.get(['apiKeys', 'provider'])

        expect(getConfigContent).toHaveBeenCalledTimes(1)
        expect(first).toEqual({ apiKeys: 'k', provider: 'OpenAI' })
        expect(second).toEqual(first)
        // Separate objects, like the storage API it emulates: callers write
        // defaults onto what they get back.
        expect(second).not.toBe(first)
    })

    it('returns defaults when config.json is not parsable', async () => {
        getConfigContent.mockResolvedValue('not json')
        const result = await tauriBrowser.storage.sync.get(['apiKeys'])
        expect(result).toEqual({ apiKeys: undefined })
    })

    it('re-reads after an explicit invalidation (config-updated-event)', async () => {
        getConfigContent.mockResolvedValue(JSON.stringify({ apiKeys: 'old' }))
        expect(await tauriBrowser.storage.sync.get(['apiKeys'])).toEqual({ apiKeys: 'old' })

        getConfigContent.mockResolvedValue(JSON.stringify({ apiKeys: 'new' }))
        invalidateTauriSettingsCache()

        expect(await tauriBrowser.storage.sync.get(['apiKeys'])).toEqual({ apiKeys: 'new' })
        expect(getConfigContent).toHaveBeenCalledTimes(2)
    })

    it('serves the just-written values without another file read', async () => {
        getConfigContent.mockResolvedValue(JSON.stringify({ apiKeys: 'old', i18n: 'en' }))

        await tauriBrowser.storage.sync.set({ apiKeys: 'written' })

        expect(writeTextFile).toHaveBeenCalledTimes(1)
        expect(JSON.parse(writeTextFile.mock.calls[0][1] as string)).toEqual({
            apiKeys: 'written',
            i18n: 'en',
        })
        expect(getConfigContent).toHaveBeenCalledTimes(1)
        expect(await tauriBrowser.storage.sync.get(['apiKeys'])).toEqual({ apiKeys: 'written' })
        expect(getConfigContent).toHaveBeenCalledTimes(1)
    })
})
