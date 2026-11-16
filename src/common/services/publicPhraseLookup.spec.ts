import { describe, expect, it, vi } from 'vitest'
import { isPublicPhrase, lookupPublicPhrase, PUBLIC_PHRASE_MAX_LENGTH } from './publicPhraseLookup'

const ENDPOINT = 'https://mcp.parallel.ai/mcp'
const PHRASE = 'CSS container queries'

const source = {
    url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@container',
    title: '@container CSS at-rule',
    excerpts: ['The @container CSS at-rule applies styles depending on a container.'],
}

function reply(id: number, result: unknown, headers?: HeadersInit) {
    const responseHeaders = new Headers(headers)
    responseHeaders.set('Content-Type', 'application/json')
    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), { headers: responseHeaders })
}

function initialized(sessionId?: string) {
    return reply(1, { protocolVersion: '2025-03-26' }, sessionId ? { 'Mcp-Session-Id': sessionId } : undefined)
}

describe('public phrase lookup', () => {
    it('accepts short multiword technical phrases', () => {
        expect(isPublicPhrase(PHRASE)).toBe(true)
        expect(isPublicPhrase('  C++ smart pointers  ')).toBe(true)
        expect(isPublicPhrase('gestion mémoire')).toBe(true)
        expect(isPublicPhrase('CSS コンテナ クエリ')).toBe(true)
        expect(isPublicPhrase('container')).toBe(false)
        expect(isPublicPhrase('https://example.com/ context')).toBe(false)
        expect(isPublicPhrase('first line\nsecond line')).toBe(false)
        expect(isPublicPhrase(`CSS ${'a'.repeat(PUBLIC_PHRASE_MAX_LENGTH)}`)).toBe(false)
    })

    it('sends only the phrase to the fixed endpoint and returns up to three safe source excerpts', async () => {
        const fetcher = vi
            .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
            .mockResolvedValueOnce(initialized('test-session'))
            .mockResolvedValueOnce(new Response(null, { status: 202 }))
            .mockResolvedValueOnce(
                reply(2, {
                    structuredContent: {
                        results: [
                            { ...source, url: 'javascript:alert(1)' },
                            { ...source, url: 'http://example.com/unencrypted' },
                            { ...source, url: 'https:example.com/ambiguous' },
                            { ...source, url: 'https://name:secret@example.com/' },
                            { ...source, excerpts: ['  '] },
                            source,
                            source,
                            { ...source, url: 'https://web.dev/learn/css/container-queries' },
                            { ...source, url: 'https://developer.chrome.com/docs/devtools/css/container-queries' },
                            { ...source, url: 'https://www.w3.org/TR/css-contain-3/' },
                        ],
                    },
                })
            )
            .mockResolvedValueOnce(new Response(null, { status: 200 }))

        const signal = new AbortController().signal
        const results = await lookupPublicPhrase(' ' + PHRASE + ' ', signal, fetcher)
        expect(results[0]).toEqual({ url: source.url, title: source.title, excerpt: source.excerpts[0] })
        expect(results.map(({ url }) => url)).toEqual([
            source.url,
            'https://web.dev/learn/css/container-queries',
            'https://developer.chrome.com/docs/devtools/css/container-queries',
        ])
        expect(fetcher.mock.calls.map(([, options]) => options?.method)).toEqual(['POST', 'POST', 'POST', 'DELETE'])
        for (const [url, options] of fetcher.mock.calls) {
            expect(url).toBe(ENDPOINT)
            expect(options).toMatchObject({ credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' })
            expect(new Headers(options?.headers).has('Authorization')).toBe(false)
        }
        expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toMatchObject({
            method: 'initialize',
            params: { clientInfo: { name: 'NextAI Translator' } },
        })
        expect(JSON.parse(fetcher.mock.calls[2][1]?.body as string)).toEqual({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'web_search',
                arguments: {
                    objective:
                        'Find short passages from official documentation or specifications that explain the technical phrase.',
                    // eslint-disable-next-line camelcase
                    search_queries: [PHRASE],
                },
            },
        })
        const cleanup = fetcher.mock.calls[3][1]
        expect(cleanup?.headers).toMatchObject({
            'Mcp-Session-Id': 'test-session',
            'MCP-Protocol-Version': '2025-03-26',
        })
        expect(cleanup?.signal).not.toBe(signal)
        expect(cleanup?.body).toBeUndefined()
    })

    it('returns the matching SSE response without waiting for the stream to end', async () => {
        const cancel = vi.fn()
        const encoder = new TextEncoder()
        const result = {
            content: [{ type: 'text', text: JSON.stringify({ results: [source] }) }],
        }
        const reply = JSON.stringify({ jsonrpc: '2.0', id: 2, result })
        const body = new ReadableStream({
            start(controller) {
                controller.enqueue(
                    encoder.encode(': ping\r\ndata: {"jsonrpc":"2.0","method":"notifications/message"}\r\n\r\n')
                )
                controller.enqueue(encoder.encode('event: message\r\nda'))
                controller.enqueue(encoder.encode(`ta: ${reply}\r\n\r\n`))
            },
            cancel,
        })
        const fetcher = vi
            .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
            .mockResolvedValueOnce(initialized())
            .mockResolvedValueOnce(new Response(null, { status: 202 }))
            .mockResolvedValueOnce(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }))

        await expect(lookupPublicPhrase(PHRASE, new AbortController().signal, fetcher)).resolves.toEqual([
            { url: source.url, title: source.title, excerpt: source.excerpts[0] },
        ])
        expect(cancel).toHaveBeenCalledOnce()
        expect(fetcher).toHaveBeenCalledTimes(3)
    })

    it('does not start a request for invalid input or an already-aborted search', async () => {
        const fetcher = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
        const controller = new AbortController()
        await expect(lookupPublicPhrase('singleword', controller.signal, fetcher)).rejects.toThrow()
        controller.abort()
        await expect(lookupPublicPhrase(PHRASE, controller.signal, fetcher)).rejects.toMatchObject({
            name: 'AbortError',
        })
        expect(fetcher).not.toHaveBeenCalled()
    })

    it('attempts bounded cleanup after an aborted search without passing the aborted caller signal', async () => {
        const controller = new AbortController()
        const fetcher = vi
            .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
            .mockResolvedValueOnce(initialized('test-session'))
            .mockImplementationOnce(async () => {
                controller.abort()
                throw new DOMException('Aborted', 'AbortError')
            })
            .mockResolvedValueOnce(new Response(null, { status: 405 }))

        await expect(lookupPublicPhrase(PHRASE, controller.signal, fetcher)).rejects.toMatchObject({
            name: 'AbortError',
        })
        expect(fetcher.mock.calls[2][1]).toMatchObject({ method: 'DELETE', signal: { aborted: false } })
    })
})
