import { listen, type Event } from '@tauri-apps/api/event'
import toast from 'react-hot-toast/headless'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { isTauri } from '../utils'

export interface TTSDownloadProgressPayload {
    lang: 'zh' | 'en'
    downloaded: number
    total: number
    bytesPerSecond: number
    phase: 'downloading' | 'extracting' | 'ready' | 'error'
    message?: string
}

type TranslationFunction = ReturnType<typeof useTranslation>['t']

export function formatDownloadSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B'
    }
    const units = ['B', 'KB', 'MB', 'GB']
    const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = bytes / 1024 ** unit
    return `${value >= 100 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

function TTSDownloadCard({ payload }: { payload: TTSDownloadProgressPayload }) {
    const { t } = useTranslation()
    const progress = payload.total > 0 ? Math.min(1, payload.downloaded / payload.total) : 0
    const voice = t(payload.lang === 'zh' ? 'MeloTTS Chinese voice' : 'Kokoro English voice')
    const isExtracting = payload.phase === 'extracting'

    return (
        <div style={{ width: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: 600 }}>
                <span>{t(isExtracting ? 'Installing {{voice}}' : 'Downloading {{voice}}', { voice })}</span>
                <span>{payload.total > 0 ? `${Math.round(progress * 100)}%` : ''}</span>
            </div>
            <div
                role='progressbar'
                aria-label={t('Download progress for {{voice}}', { voice })}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                style={{
                    height: 6,
                    marginTop: 10,
                    overflow: 'hidden',
                    borderRadius: 999,
                    background: 'rgba(127, 127, 127, 0.2)',
                }}
            >
                <div
                    style={{
                        width: `${isExtracting ? 100 : progress * 100}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: '#34383d',
                        transition: 'width 180ms ease-out',
                    }}
                />
            </div>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginTop: 7,
                    fontSize: 11,
                    opacity: 0.72,
                }}
            >
                <span>
                    {formatDownloadSize(payload.downloaded)}
                    {payload.total > 0 ? ` / ${formatDownloadSize(payload.total)}` : ''}
                </span>
                <span>
                    {isExtracting ? t('Verifying and extracting…') : `${formatDownloadSize(payload.bytesPerSecond)}/s`}
                </span>
            </div>
        </div>
    )
}

function handleProgress({ payload }: Event<TTSDownloadProgressPayload>, t: TranslationFunction) {
    const id = `tts-model-download-${payload.lang}`
    const voice = t(payload.lang === 'zh' ? 'MeloTTS Chinese voice' : 'Kokoro English voice')
    if (payload.phase === 'ready') {
        toast.success(t('{{voice}} is ready', { voice }), {
            id,
            duration: 1800,
        })
        return
    }
    if (payload.phase === 'error') {
        console.error(payload.message ?? 'TTS model download failed')
        toast.error(t('Failed to download {{voice}}', { voice }), {
            id,
            duration: 5000,
        })
        return
    }
    toast.custom(<TTSDownloadCard payload={payload} />, {
        id,
        duration: Infinity,
    })
}

export function TTSDownloadNotifier() {
    const { t } = useTranslation()

    useEffect(() => {
        if (!isTauri()) {
            return
        }
        let disposed = false
        let unlisten: (() => void) | undefined
        listen<TTSDownloadProgressPayload>('tts-download-progress', (event) => handleProgress(event, t))
            .then((stopListening) => {
                if (disposed) {
                    stopListening()
                } else {
                    unlisten = stopListening
                }
            })
            .catch((error) => {
                console.error('Failed to listen for TTS download progress:', error)
            })
        return () => {
            disposed = true
            unlisten?.()
        }
    }, [t])

    return null
}
