import { useEffect, useRef, useState } from 'react'
import { Button } from 'baseui-sd/button'
import { FormControl } from 'baseui-sd/form-control'
import { Input } from 'baseui-sd/input'
import { useTranslation } from 'react-i18next'
import { settingKeys } from '../settings-schema'
import { getBrowser, isTauri } from '../utils'
import { actionService } from '../services/action'
import { getActionSettings } from '../webdav-action-settings'
import {
    ConflictPreference,
    SettingsSnapshot,
    SyncError,
    WebDAVConnection,
    synchronizeSettings,
    webdavURL,
} from '../webdav-sync'

const localKey = 'nextai-translator.webdav'
const emptyConnection: WebDAVConnection = { url: '', username: '', password: '', passphrase: '' }

interface SavedConnection {
    url: string
    username: string
    baseline: SettingsSnapshot
}

function getSavedConnection(): SavedConnection | undefined {
    try {
        const value = localStorage.getItem(localKey)
        if (!value) {
            return undefined
        }
        const saved = JSON.parse(value)
        return typeof saved?.url === 'string' && typeof saved.username === 'string' ? saved : undefined
    } catch {
        return undefined
    }
}

interface Props {
    disabled: boolean
    applySettings: (settings: SettingsSnapshot) => Promise<void>
}

export function WebDAVSettings({ disabled, applySettings }: Props) {
    const { t } = useTranslation()
    const [connection, setConnection] = useState<WebDAVConnection>(() => {
        const state = getSavedConnection()
        return state ? { ...emptyConnection, url: state.url, username: state.username } : emptyConnection
    })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<SyncError | 'synced'>()
    const [permissions, setPermissions] = useState<typeof import('webextension-polyfill')['permissions']>()
    const running = useRef(false)
    const desktop = isTauri()

    useEffect(() => {
        if (!desktop) {
            // Resolve the module before the click so the permission prompt can use the browser's user gesture.
            import('webextension-polyfill').then(({ default: browser }) => setPermissions(() => browser.permissions))
        }
    }, [desktop])

    const sync = async (preference?: ConflictPreference) => {
        if (running.current) {
            return
        }
        running.current = true
        setLoading(true)
        setMessage(undefined)
        try {
            const url = webdavURL(connection.url)
            const origins = [`${url.protocol}//${url.hostname}/*`]
            if (!desktop && !(await permissions?.request({ origins }).catch(() => false))) {
                throw new SyncError('permission')
            }
            const browser = await getBrowser()
            const saved = getSavedConnection()
            const tauriHTTP = desktop ? await import('@tauri-apps/plugin-http') : undefined
            const tauriStorage = desktop ? await import('../polyfills/tauri') : undefined
            const baseline = await synchronizeSettings({
                connection,
                baseline: saved?.url === url.href ? saved.baseline : undefined,
                preference,
                fetch: tauriHTTP
                    ? (address, options) => tauriHTTP.fetch(address, { ...options, maxRedirections: 0 })
                    : (address, options) => window.fetch(address, options),
                readLocal: async () => {
                    tauriStorage?.invalidateTauriSettingsCache()
                    const { defaultTranslateMode, ...settings } = await browser.storage.sync.get(settingKeys)
                    return {
                        ...settings,
                        actionSettings: getActionSettings(await actionService.list(), defaultTranslateMode),
                    }
                },
                writeLocal: applySettings,
            })
            localStorage.setItem(localKey, JSON.stringify({ url: url.href, username: connection.username, baseline }))
            setMessage('synced')
        } catch (error) {
            setMessage(error instanceof SyncError ? error : new SyncError('storage'))
        } finally {
            running.current = false
            setLoading(false)
        }
    }

    const edit = (field: keyof WebDAVConnection, value: string) => {
        setMessage(undefined)
        setConnection((previous) => ({ ...previous, [field]: value }))
    }

    const messages: Record<string, string> = {
        'url': t('Enter the full HTTPS URL of the WebDAV settings file.'),
        'credentials': t('Enter an encryption passphrase and valid WebDAV credentials.'),
        'permission': t('Allow access to this WebDAV host to sync settings.'),
        'conflict': t(
            'Some settings changed on both devices. Choose which values to keep for the conflicting settings.'
        ),
        'etag': t('This WebDAV server must return a strong ETag to update an existing settings file.'),
        'file': t('Unable to read the settings file. Verify the encryption passphrase and file format.'),
        'http': t('WebDAV returned HTTP {{status}}.', {
            status: message instanceof SyncError ? message.status : undefined,
        }),
        'network': t('Unable to reach the WebDAV file. Check the URL and connection.'),
        'timeout': t('The WebDAV request timed out.'),
        'remote-changed': t('The WebDAV file changed during sync. Sync again to load the latest version.'),
        'local-changed': t('Local settings changed during sync. Sync again to include the latest changes.'),
        'size': t('The WebDAV settings file exceeds the size limit.'),
        'storage': t('Unable to save synced settings on this device.'),
    }
    const conflict = message instanceof SyncError && message.code === 'conflict'
    return (
        <section aria-label={t('WebDAV Sync')}>
            <FormControl label={t('WebDAV file URL')}>
                <Input
                    id='webdav-url'
                    type='url'
                    value={connection.url}
                    placeholder='https://dav.example.com/nextai-settings.json'
                    onChange={(event) => edit('url', event.currentTarget.value)}
                    disabled={loading}
                />
            </FormControl>
            <FormControl label={t('Username')}>
                <Input
                    id='webdav-username'
                    value={connection.username}
                    onChange={(event) => edit('username', event.currentTarget.value)}
                    disabled={loading}
                />
            </FormControl>
            <FormControl label={t('Password')}>
                <Input
                    id='webdav-password'
                    type='password'
                    value={connection.password}
                    onChange={(event) => edit('password', event.currentTarget.value)}
                    disabled={loading}
                />
            </FormControl>
            <FormControl
                label={t('Encryption passphrase')}
                caption={t('Use the same passphrase on each device. It protects settings including API keys.')}
            >
                <Input
                    id='webdav-passphrase'
                    type='password'
                    value={connection.passphrase}
                    onChange={(event) => edit('passphrase', event.currentTarget.value)}
                    disabled={loading}
                />
            </FormControl>
            <Button
                type='button'
                size='compact'
                isLoading={loading}
                disabled={disabled || (!desktop && !permissions)}
                onClick={() => void sync()}
            >
                {t('Sync now')}
            </Button>
            {disabled && <p>{t('Save your settings before syncing.')}</p>}
            <p role='status'>{message === 'synced' ? t('Settings synced.') : message && messages[message.code]}</p>
            {conflict && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Button type='button' size='compact' disabled={disabled} onClick={() => void sync('local')}>
                        {t('Keep local changes')}
                    </Button>
                    <Button type='button' size='compact' disabled={disabled} onClick={() => void sync('remote')}>
                        {t('Keep WebDAV changes')}
                    </Button>
                </div>
            )}
        </section>
    )
}
