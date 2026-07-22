import { useCallback, useEffect, useRef, useState } from 'react'
import { LangCode } from '../lang'
import { defaultTTSProvider, doSpeak } from '../tts'
import { TTSProvider } from '../tts/types'
import SpeakerMotion from './SpeakerMotion'
import { RxSpeakerLoud } from 'react-icons/rx'
import { IconBaseProps } from 'react-icons'
import { SpinnerIcon } from './SpinnerIcon'

interface ISpeakerIconProps extends IconBaseProps {
    divRef?: React.Ref<HTMLDivElement>
    provider?: TTSProvider
    lang: LangCode
    voice?: string
    rate?: number
    volume?: number
    text?: string
    onWordBoundary?: (wordIndex: number) => void
    onPlaybackEnd?: () => void
}

export function SpeakerIcon({
    divRef,
    provider = defaultTTSProvider,
    text,
    lang,
    voice,
    rate,
    volume,
    onWordBoundary,
    onPlaybackEnd,
    ...iconProps
}: ISpeakerIconProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const stopRef = useRef<() => void>()
    const iconSize = iconProps.size ?? '1em'

    useEffect(() => {
        return () => {
            stopRef.current?.()
        }
    }, [])

    const handleSpeak = useCallback(() => {
        if (!text) {
            return
        }
        console.debug('provider', provider, 'lang', lang, 'voice', voice)
        setIsLoading(true)
        setIsSpeaking(true)
        const controller = new AbortController()
        const { signal } = controller
        stopRef.current = () => {
            controller.abort()
            setIsSpeaking(false)
            setIsLoading(false)
            onPlaybackEnd?.()
        }
        doSpeak({
            provider,
            lang,
            text,
            voice,
            volume: volume,
            rate: rate,
            onFinish: () => {
                setIsSpeaking(false)
                onPlaybackEnd?.()
            },
            onStartSpeaking: () => {
                setIsLoading(false)
            },
            signal,
            onWordBoundary,
        }).catch((e) => {
            console.error('TTS error:', e)
            setIsLoading(false)
            setIsSpeaking(false)
            onPlaybackEnd?.()
        })
    }, [lang, onPlaybackEnd, onWordBoundary, provider, rate, text, voice, volume])

    return (
        <div
            ref={divRef}
            style={{
                alignItems: 'center',
                display: 'inline-flex',
                flexShrink: 0,
                height: iconSize,
                justifyContent: 'center',
                lineHeight: 0,
                width: iconSize,
            }}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (isSpeaking || isLoading) {
                    stopRef.current?.()
                    return
                }
                handleSpeak()
            }}
        >
            {isLoading && (
                <SpinnerIcon
                    {...iconProps}
                    size='80%'
                    style={{
                        ...iconProps.style,
                        display: 'block',
                    }}
                />
            )}
            {!isLoading &&
                (isSpeaking ? (
                    <SpeakerMotion
                        style={{
                            display: 'block',
                        }}
                        {...iconProps}
                    />
                ) : (
                    <RxSpeakerLoud
                        style={{
                            display: 'block',
                        }}
                        {...iconProps}
                    />
                ))}
        </div>
    )
}
