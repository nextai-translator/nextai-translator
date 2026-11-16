import { createParser } from 'eventsource-parser'
import { version } from '../../../package.json'

export const PUBLIC_PHRASE_MAX_LENGTH = 100

const ENDPOINT = 'https://mcp.parallel.ai/mcp'
const PROTOCOL_VERSION = '2025-03-26'
const CLEANUP_TIMEOUT_MS = 1500
const SSE_MAX_BYTES = 256 * 1024
const TERM = /^@?[\p{L}\p{N}][\p{L}\p{N}\p{M}._+#-]*(?:(?:\/|::)[\p{L}\p{N}][\p{L}\p{N}\p{M}._+#-]*)*$/u
const HOST_WITH_PATH = /[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+\//u

type WordSegmenter = new (
    locales?: string | string[],
    options?: { granularity: 'word' }
) => { segment: (text: string) => Iterable<{ isWordLike?: boolean }> }

const Segmenter = (Intl as unknown as { Segmenter?: WordSegmenter }).Segmenter
const wordSegmenter = Segmenter && new Segmenter(undefined, { granularity: 'word' })

interface PublicPhraseSource {
    url: string
    title: string
    excerpt: string
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : undefined
}

export function isPublicPhrase(phrase: string): boolean {
    const text = phrase.trim()
    const terms = text.split(/\p{Zs}+/u)
    if (
        text.length > PUBLIC_PHRASE_MAX_LENGTH ||
        /[\r\n\u2028\u2029]/u.test(phrase) ||
        !/\p{L}/u.test(text) ||
        terms.some((term) => !TERM.test(term) || HOST_WITH_PATH.test(term))
    ) {
        return false
    }
    if (terms.length > 1) {
        return true
    }
    // These scripts can form phrases without separating words with spaces.
    if (!wordSegmenter || !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(text)) {
        return false
    }
    const words = wordSegmenter.segment(text)
    return Array.from(words).filter(({ isWordLike }) => isWordLike).length > 1
}

function readSources(value: unknown): PublicPhraseSource[] {
    const result = asRecord(value)
    if (!result || result.isError) {
        throw new Error('Public phrase search failed')
    }
    let results = asRecord(result.structuredContent)?.results
    if (!Array.isArray(results) && Array.isArray(result.content)) {
        const text = result.content.map(asRecord).find((item) => item?.type === 'text' && typeof item.text === 'string')
            ?.text
        results = typeof text === 'string' ? asRecord(JSON.parse(text))?.results : undefined
    }
    if (!Array.isArray(results)) {
        throw new Error('Invalid public phrase search response')
    }
    const sources: PublicPhraseSource[] = []
    const seen = new Set<string>()
    for (const item of results) {
        const source = asRecord(item)
        if (typeof source?.url !== 'string' || !/^https:\/\//i.test(source.url) || !Array.isArray(source.excerpts)) {
            continue
        }
        const excerpt = source.excerpts.find((entry) => typeof entry === 'string' && entry.trim())?.trim()
        if (!excerpt) {
            continue
        }
        let url: URL
        try {
            url = new URL(source.url)
        } catch {
            continue
        }
        if (url.protocol !== 'https:' || url.username || url.password || seen.has(url.href)) {
            continue
        }
        const title = typeof source.title === 'string' ? source.title.trim() : ''
        sources.push({
            url: url.href,
            title: title.slice(0, 180) || url.hostname,
            excerpt: excerpt.length > 450 ? excerpt.slice(0, 449).trimEnd() + '…' : excerpt,
        })
        seen.add(url.href)
        if (sources.length === 3) {
            break
        }
    }
    return sources
}

async function readSseResponse(response: Response, id: number): Promise<unknown> {
    const reader = response.body?.getReader()
    if (!reader) {
        throw new Error('Missing public phrase search response')
    }
    const decoder = new TextDecoder()
    let message: Record<string, unknown> | undefined
    const parser = createParser((event) => {
        if (event.type === 'event' && !message) {
            const candidate = asRecord(JSON.parse(event.data))
            if (candidate?.id === id) {
                message = candidate
            }
        }
    })
    let bytes = 0
    try {
        while (!message) {
            const { value, done } = await reader.read()
            if (done) {
                break
            }
            bytes += value.byteLength
            if (bytes > SSE_MAX_BYTES) {
                throw new Error('Public phrase search response was too large')
            }
            parser.feed(decoder.decode(value, { stream: true }))
        }
        return message
    } finally {
        void reader.cancel().catch(() => undefined)
        reader.releaseLock()
    }
}

async function readResult(response: Response, id: number): Promise<unknown> {
    const type = response.headers.get('content-type')?.split(';')[0].toLowerCase()
    if (type !== 'application/json' && type !== 'text/event-stream') {
        void response.body?.cancel().catch(() => undefined)
        throw new Error('Unexpected public phrase search response type')
    }
    const message = asRecord(type === 'application/json' ? await response.json() : await readSseResponse(response, id))
    if (message?.jsonrpc !== '2.0' || message.id !== id || 'error' in message || !('result' in message)) {
        throw new Error('Invalid public phrase search response')
    }
    return message.result
}

export async function lookupPublicPhrase(
    phrase: string,
    signal: AbortSignal,
    fetcher: typeof fetch = fetch
): Promise<PublicPhraseSource[]> {
    if (!isPublicPhrase(phrase)) {
        throw new Error('A short public phrase is required')
    }
    const text = phrase.trim()
    const headers: Record<string, string> = { Accept: 'application/json, text/event-stream' }

    async function request(method: 'POST' | 'DELETE', requestSignal: AbortSignal, body?: object) {
        if (requestSignal.aborted) {
            throw new DOMException('Aborted', 'AbortError')
        }
        const response = await fetcher(ENDPOINT, {
            method,
            headers: body ? { ...headers, 'Content-Type': 'application/json' } : { ...headers },
            body: body ? JSON.stringify({ jsonrpc: '2.0', ...body }) : undefined,
            signal: requestSignal,
            credentials: 'omit',
            redirect: 'error',
            referrerPolicy: 'no-referrer',
        })
        if (!response.ok || response.redirected) {
            void response.body?.cancel().catch(() => undefined)
            throw new Error('Public phrase lookup request failed')
        }
        return response
    }

    async function closeSession() {
        const cleanup = new AbortController()
        const timer = setTimeout(() => cleanup.abort(), CLEANUP_TIMEOUT_MS)
        try {
            const response = await request('DELETE', cleanup.signal)
            await response.body?.cancel()
        } catch {
            // A server can decline DELETE. Cleanup must not affect the search result.
        } finally {
            clearTimeout(timer)
        }
    }

    try {
        const initialized = await request('POST', signal, {
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: PROTOCOL_VERSION,
                capabilities: {},
                clientInfo: { name: 'NextAI Translator', version },
            },
        })
        const session = initialized.headers.get('mcp-session-id')
        if (session && /^[!-~]+$/.test(session)) {
            headers['Mcp-Session-Id'] = session
        }
        const result = asRecord(await readResult(initialized, 1))
        if (result?.protocolVersion !== PROTOCOL_VERSION) {
            throw new Error('Unsupported public phrase search protocol')
        }
        headers['MCP-Protocol-Version'] = PROTOCOL_VERSION
        const notification = await request('POST', signal, { method: 'notifications/initialized' })
        void notification.body?.cancel().catch(() => undefined)
        const response = await request('POST', signal, {
            id: 2,
            method: 'tools/call',
            params: {
                name: 'web_search',
                arguments: {
                    objective:
                        'Find short passages from official documentation or specifications that explain the technical phrase.',
                    // eslint-disable-next-line camelcase
                    search_queries: [text],
                },
            },
        })
        return readSources(await readResult(response, 2))
    } finally {
        if (headers['Mcp-Session-Id']) {
            void closeSession()
        }
    }
}
