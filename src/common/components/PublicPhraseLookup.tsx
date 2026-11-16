import { FormEvent, useEffect, useRef, useState } from 'react'
import { Button } from 'baseui-sd/button'
import { Input } from 'baseui-sd/input'
import { Modal, ModalBody, ModalHeader } from 'baseui-sd/modal'
import { RxMagnifyingGlass } from 'react-icons/rx'
import { useTranslation } from 'react-i18next'
import { isPublicPhrase, lookupPublicPhrase, PUBLIC_PHRASE_MAX_LENGTH } from '../services/publicPhraseLookup'
import { Tooltip } from './Tooltip'

const SEARCH_TIMEOUT_MS = 12_000
const PRIVACY_URL = 'https://parallel.ai/privacy-policy'

export function PublicPhraseLookupButton() {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const label = t('Look up public phrase')

    return (
        <>
            <Tooltip content={label} placement='bottom'>
                <Button type='button' size='mini' kind='tertiary' aria-label={label} onClick={() => setIsOpen(true)}>
                    <RxMagnifyingGlass size={15} />
                </Button>
            </Tooltip>
            {isOpen && <PublicPhraseLookupDialog onClose={() => setIsOpen(false)} />}
        </>
    )
}

function PublicPhraseLookupDialog({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation()
    const [phrase, setPhrase] = useState('')
    const [loading, setLoading] = useState(false)
    const [failed, setFailed] = useState(false)
    const [sources, setSources] = useState<Awaited<ReturnType<typeof lookupPublicPhrase>>>()
    const active = useRef<AbortController>()

    useEffect(
        () => () => {
            active.current?.abort()
            active.current = undefined
        },
        []
    )

    async function search(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        event.stopPropagation()
        if (active.current || !isPublicPhrase(phrase)) return

        const controller = new AbortController()
        active.current = controller
        const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)
        setLoading(true)
        setFailed(false)
        setSources(undefined)
        try {
            const result = await lookupPublicPhrase(phrase, controller.signal)
            if (active.current === controller) setSources(result)
        } catch {
            if (active.current === controller) setFailed(true)
        } finally {
            clearTimeout(timer)
            if (active.current === controller) {
                active.current = undefined
                setLoading(false)
            }
        }
    }

    return (
        <Modal
            isOpen
            onClose={onClose}
            size='auto'
            autoFocus
            closeable
            overrides={{
                Dialog: {
                    style: {
                        width: 'min(540px, calc(100vw - 32px))',
                        maxHeight: 'calc(100vh - 32px)',
                        overflowY: 'auto',
                    },
                },
            }}
        >
            <ModalHeader>{t('Look up public phrase')}</ModalHeader>
            <ModalBody>
                <p>{t('Only enter public terms. Search sends this phrase to Parallel.')}</p>
                <p>
                    <a href={PRIVACY_URL} target='_blank' rel='noreferrer'>
                        {t('Parallel privacy policy')}
                    </a>
                </p>
                <form onSubmit={search}>
                    <Input
                        aria-label={t('Public phrase')}
                        value={phrase}
                        maxLength={PUBLIC_PHRASE_MAX_LENGTH}
                        autoComplete='off'
                        disabled={loading}
                        onChange={(event) => {
                            setPhrase(event.currentTarget.value)
                            setSources(undefined)
                            setFailed(false)
                        }}
                    />
                    <div style={{ marginTop: 12 }}>
                        <Button type='submit' size='compact' disabled={loading || !isPublicPhrase(phrase)}>
                            {t('Search with Parallel')}
                        </Button>
                    </div>
                </form>
                {loading && <p role='status'>{t('Looking up sources…')}</p>}
                {failed && <p role='alert'>{t('Could not look up sources. Try again.')}</p>}
                {sources?.length === 0 && <p role='status'>{t('No sources found')}</p>}
                {!!sources?.length && (
                    <ul style={{ paddingInlineStart: 20 }}>
                        {sources.map(({ url, title, excerpt }) => (
                            <li key={url}>
                                <a href={url} target='_blank' rel='noreferrer'>
                                    {title}
                                </a>
                                <p>{excerpt}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </ModalBody>
        </Modal>
    )
}
