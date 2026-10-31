/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { writeTextFile, rename, BaseDirectory } from '@tauri-apps/plugin-fs'
import { Proxy, ProxyConfig, fetch } from '@tauri-apps/plugin-http'
import * as utils from '../utils'
import { IBrowser, ISettings } from '../types'
import { commands, events } from '@/tauri/bindings'

// Reading the config on every `getSettings()` call used to mean one IPC round
// trip plus a config.json read per call, and a single translation performs
// ~10 of them (API URL, path, model, key, headers, ...) before the request is
// even dispatched. The parsed config is cached here instead, and invalidated
// whenever anything can have changed it: a write from this window, or the
// `config-updated-event` broadcast by the settings window.
let cachedConfig: Record<string, any> | null = null

export function invalidateTauriSettingsCache(): void {
    cachedConfig = null
}

async function getSettings(): Promise<Record<string, any>> {
    if (!cachedConfig) {
        const content = await commands.getConfigContent()
        try {
            cachedConfig = JSON.parse(content)
        } catch (e) {
            // A config written by a newer/older version must not take settings
            // reads down with it: fall back to the defaults of each field.
            console.error('Failed to parse config.json', e)
            cachedConfig = {}
        }
    }
    return cachedConfig as Record<string, any>
}

// Another window (the settings window) can rewrite config.json, so the cache
// has to follow its broadcast. Guarded because this module is also reachable
// from browser/test builds, where the Tauri event API does not exist.
const isTauriRuntime = typeof window !== 'undefined' && (window as any)['__TAURI__'] !== undefined
if (isTauriRuntime) {
    try {
        events.configUpdatedEvent
            .listen(() => {
                invalidateTauriSettingsCache()
            })
            .catch((e) => {
                console.debug('config update listener unavailable', e)
            })
    } catch (e) {
        console.debug('config update listener unavailable', e)
    }
}

class BrowserStorageSync {
    async get(keys: string[]): Promise<Record<string, any>> {
        const settings = await getSettings()
        // A fresh object per call, like the storage API it emulates: callers do
        // assign defaults onto what they get back.
        return keys.reduce((acc, key) => {
            return {
                ...acc,
                [key]: settings[key],
            }
        }, {})
    }

    async set(items: Record<string, any>): Promise<void> {
        const newItems = Object.entries(items).reduce((acc, [key, value]) => {
            if (value === undefined) {
                return acc
            }
            return { ...acc, [key]: value }
        }, {})
        const settings = await getSettings()
        const newSettings = { ...settings, ...newItems }
        // Write-then-rename so config.json is replaced atomically: overwriting
        // it in place leaves a truncated, unparsable file if the app dies
        // mid-write, and since the file survives uninstall/reinstall that used
        // to brick the app at every subsequent launch.
        await writeTextFile('config.json.tmp', JSON.stringify(newSettings), {
            baseDir: BaseDirectory.AppConfig,
        })
        await rename('config.json.tmp', 'config.json', {
            oldPathBaseDir: BaseDirectory.AppConfig,
            newPathBaseDir: BaseDirectory.AppConfig,
        })
        cachedConfig = newSettings
    }
}

class BrowserStorage {
    sync: BrowserStorageSync

    constructor() {
        this.sync = new BrowserStorageSync()
    }
}

class BrowserRuntimeOnMessage {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    addListener(_callback: (message: any, sender: any, sendResponse: any) => void): void {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    removeListener(_callback: (message: any, sender: any, sendResponse: any) => void): void {}
}

class BrowserRuntime {
    onMessage: BrowserRuntimeOnMessage

    constructor() {
        this.onMessage = new BrowserRuntimeOnMessage()
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sendMessage(_message: any): void {}

    getURL(path: string): string {
        return path
    }
}

class BrowserI18n {
    detectLanguage(_text: string): Promise<{ languages: { language: string; percentage: number }[] }> {
        return new Promise((resolve) => {
            resolve({
                languages: [],
            })
        })
    }
}

class Browser implements IBrowser {
    storage: BrowserStorage
    runtime: BrowserRuntime
    i18n: BrowserI18n

    constructor() {
        this.storage = new BrowserStorage()
        this.runtime = new BrowserRuntime()
        this.i18n = new BrowserI18n()
    }
}

export const tauriBrowser = new Browser()

export const getFetchProxy = (proxy?: ISettings['proxy'], ignoreEnabled?: boolean): Proxy | undefined => {
    const proxyConfig = getFetchProxyConfig(proxy, ignoreEnabled)
    if (!proxyConfig) {
        return undefined
    }
    return {
        all: proxyConfig,
        http: proxyConfig,
        https: proxyConfig,
    }
}

export const getFetchProxyConfig = (proxy?: ISettings['proxy'], ignoreEnabled?: boolean): ProxyConfig | undefined => {
    if (!proxy) {
        return undefined
    }
    if (!ignoreEnabled && !proxy.enabled) {
        return undefined
    }
    if (!proxy.protocol || !proxy.server || !proxy.port) {
        return undefined
    }
    const proxyURL = `${proxy.protocol?.toLowerCase()}://${proxy.server}:${proxy.port}`
    const proxyConfig: ProxyConfig = {
        url: proxyURL,
        noProxy: proxy.noProxy,
    }
    if (proxy.basicAuth?.username) {
        proxyConfig.basicAuth = {
            username: proxy.basicAuth?.username || '',
            password: proxy.basicAuth?.password || '',
        }
    }
    return proxyConfig
}

export const tauriFetch = async (input: RequestInfo, init?: RequestInit) => {
    const settings = await utils.getSettings()
    const fetchProxy = getFetchProxy(settings.proxy, false)
    const proxyInit = {
        ...init,
        proxy: fetchProxy,
    }
    return await fetch(input, proxyInit)
}
