import { isEqual } from 'underscore'
import { isRecord, isSettingValue, settingKeys } from './settings-schema'
import { defaultActionSettings, isActionSettings } from './webdav-action-settings'

export interface WebDAVConnection {
    url: string
    username: string
    password: string
    passphrase: string
}

export type SettingsSnapshot = Record<string, unknown>
export type ConflictPreference = 'local' | 'remote'

interface SyncOptions {
    connection: WebDAVConnection
    fetch: (url: string, init: RequestInit) => Promise<Response>
    readLocal: () => Promise<SettingsSnapshot>
    writeLocal: (settings: SettingsSnapshot) => Promise<void>
    baseline?: SettingsSnapshot
    preference?: ConflictPreference
}

export class SyncError extends Error {
    constructor(
        readonly code: string,
        readonly status?: number
    ) {
        super(code)
    }
}

const FILE_VERSION = 1
const MAX_FILE_BYTES = 512 * 1024
const REQUEST_TIMEOUT_MS = 15000
const globalSettingKeys = settingKeys.filter((key) => key !== 'defaultTranslateMode')
const snapshotKeys = [...globalSettingKeys, 'actionSettings']
function snapshotValue(settings: SettingsSnapshot | undefined, key: string): unknown {
    return settings?.[key] ?? (key === 'actionSettings' ? defaultActionSettings : null)
}

export function webdavURL(input: string): URL {
    let url: URL
    try {
        url = new URL(input.trim())
    } catch {
        throw new SyncError('url')
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (
        (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname.endsWith('/')
    ) {
        throw new SyncError('url')
    }
    return url
}

function base64(bytes: Uint8Array): string {
    return btoa(Array.from(bytes, (value) => String.fromCharCode(value)).join(''))
}

function fromBase64(value: string): Uint8Array {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
    const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
        'deriveKey',
    ])
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 },
        secret,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )
}

export async function encryptSettings(settings: SettingsSnapshot, passphrase: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKey(passphrase, salt)
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(JSON.stringify(settings))
    )
    return JSON.stringify({
        version: FILE_VERSION,
        salt: base64(salt),
        iv: base64(iv),
        data: base64(new Uint8Array(ciphertext)),
    })
}

async function decryptSettings(body: string, passphrase: string): Promise<SettingsSnapshot> {
    try {
        const file: unknown = JSON.parse(body)
        if (
            !isRecord(file) ||
            file.version !== FILE_VERSION ||
            typeof file.salt !== 'string' ||
            typeof file.iv !== 'string' ||
            typeof file.data !== 'string'
        ) {
            throw new Error()
        }
        const salt = fromBase64(file.salt)
        const iv = fromBase64(file.iv)
        if (salt.length !== 16 || iv.length !== 12) {
            throw new Error()
        }
        const key = await deriveKey(passphrase, salt)
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(file.data))
        const settings: unknown = JSON.parse(new TextDecoder().decode(plaintext))
        if (
            !isRecord(settings) ||
            !globalSettingKeys.every(
                (key) => !Object.prototype.hasOwnProperty.call(settings, key) || isSettingValue(key, settings[key])
            ) ||
            (Object.prototype.hasOwnProperty.call(settings, 'actionSettings') &&
                !isActionSettings(settings.actionSettings))
        ) {
            throw new Error()
        }
        return settings
    } catch {
        throw new SyncError('file')
    }
}

async function readFile(response: Response): Promise<string> {
    const reader = response.body?.getReader()
    if (!reader) {
        throw new SyncError('file')
    }
    const decoder = new TextDecoder()
    let size = 0
    let body = ''
    try {
        for (;;) {
            const { done, value } = await reader.read()
            if (done) {
                return body + decoder.decode()
            }
            size += value.byteLength
            if (size > MAX_FILE_BYTES) {
                throw new SyncError('size')
            }
            body += decoder.decode(value, { stream: true })
        }
    } finally {
        await reader.cancel().catch(() => undefined)
        reader.releaseLock()
    }
}

async function withResponse<T>(
    request: SyncOptions['fetch'],
    url: string,
    init: RequestInit,
    handle: (response: Response) => Promise<T>
): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
        const response = await request(url, {
            ...init,
            signal: controller.signal,
            redirect: 'error',
            credentials: 'omit',
            cache: 'no-store',
        })
        try {
            return await handle(response)
        } finally {
            if (!response.bodyUsed) {
                await response.body?.cancel().catch(() => undefined)
            }
        }
    } catch (error) {
        if (error instanceof SyncError) {
            throw error
        }
        throw new SyncError(controller.signal.aborted ? 'timeout' : 'network')
    } finally {
        clearTimeout(timer)
    }
}

function mergeSettings(
    local: SettingsSnapshot,
    remote: SettingsSnapshot,
    baseline?: SettingsSnapshot,
    preference?: ConflictPreference
): SettingsSnapshot {
    const merged = { ...remote }
    for (const key of snapshotKeys) {
        const localValue = snapshotValue(local, key)
        // A missing key can come from an older version of the app.
        if (!Object.prototype.hasOwnProperty.call(remote, key)) {
            merged[key] = localValue
            continue
        }
        const remoteValue = remote[key]
        const baseValue = snapshotValue(baseline, key)
        if (isEqual(localValue, remoteValue) || isEqual(localValue, baseValue)) {
            continue
        }
        if (isEqual(remoteValue, baseValue) || preference === 'local') {
            merged[key] = localValue
        } else if (!preference) {
            throw new SyncError('conflict')
        }
    }
    return merged
}

export async function synchronizeSettings({
    connection,
    fetch,
    readLocal,
    writeLocal,
    baseline,
    preference,
}: SyncOptions): Promise<SettingsSnapshot> {
    const url = webdavURL(connection.url).href
    if (!connection.passphrase || connection.username.includes(':') || (!connection.username && connection.password)) {
        throw new SyncError('credentials')
    }
    const headers: Record<string, string> = {}
    if (connection.username) {
        headers.Authorization =
            'Basic ' + base64(new TextEncoder().encode(connection.username + ':' + connection.password))
    }
    const local = await readLocal()
    const { remote, etag } = await withResponse(fetch, url, { headers }, async (response) => {
        if (response.status === 404) {
            return { remote: undefined, etag: null }
        }
        if (response.status !== 200) {
            throw new SyncError('http', response.status)
        }
        return {
            remote: await decryptSettings(await readFile(response), connection.passphrase),
            etag: response.headers.get('ETag'),
        }
    })
    const merged = mergeSettings(local, remote ?? {}, baseline, preference)
    const localChanges = Object.fromEntries(
        snapshotKeys.filter((key) => !isEqual(snapshotValue(local, key), merged[key])).map((key) => [key, merged[key]])
    )

    if (!isEqual(local, await readLocal())) {
        throw new SyncError('local-changed')
    }
    if (!isEqual(remote, merged)) {
        // Updating an existing file without a strong ETag could overwrite another device's changes.
        if (remote && !etag?.match(/^"[^"]*"$/)) {
            throw new SyncError('etag')
        }
        const body = await encryptSettings(merged, connection.passphrase)
        if (body.length > MAX_FILE_BYTES) {
            throw new SyncError('size')
        }
        await withResponse(
            fetch,
            url,
            {
                method: 'PUT',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                    ...(etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }),
                },
                body,
            },
            async (response) => {
                if (response.status === 409 || response.status === 412) {
                    throw new SyncError('remote-changed')
                }
                if (![200, 201, 204].includes(response.status)) {
                    throw new SyncError('http', response.status)
                }
            }
        )
    }
    if (Object.keys(localChanges).length) {
        if (!isEqual(local, await readLocal())) {
            throw new SyncError('local-changed')
        }
        await writeLocal(localChanges)
    }
    return merged
}
