# Translation latency (time to first character)

`[ttft]` traces answer one question: **where did the time before the first
character go?** They cover the whole path, including the hops that live in the
Rust process, so a slow translation does not have to be guessed at.

## Reading a trace

Every finished translation logs one line (desktop app: printed to the app's
stdout via `log_perf_line`; browser extension: the devtools console):

```
[ttft] translate total=1284ms reason=stop mode=translate provider=DeepSeek
       target=zh-Hans chars=83 model=deepseek-flash
       rust.client=0 rust.send=150 rust.first-chunk=162
       | start->prompt 2 | prompt->settings 0 | settings->engine 0
       | engine->request 1 | request->dispatch 0 | dispatch->headers 191
       | headers->first-byte 12 | first-byte->first-token 1064
       | first-token->paint 14
```

The phases map to code:

| Phase                     | What happens                                                      |
| ------------------------- | ----------------------------------------------------------------- |
| `start->prompt`           | Prompt assembly (`src/common/translate.ts`)                       |
| `prompt->settings`        | Reading settings (cached on desktop, see `polyfills/tauri.ts`)    |
| `settings->engine`        | Engine selection                                                  |
| `engine->request`         | Engine-specific setup: URL, headers, body                         |
| `request->dispatch`       | Entering the streaming fetch (`fetchSSE`)                         |
| `dispatch->headers`       | Listener registration + IPC + `rust.send`                         |
| `headers->first-byte`     | First body bytes reaching JS                                      |
| `first-byte->first-token` | Provider emits the first non-empty delta: **model thinking time** |
| `first-token->paint`      | React commit that puts characters on screen                       |

`rust.*` is measured inside `src-tauri/src/fetch.rs`:

-   `rust.client` — HTTP client lookup/build (should be ~0; clients are pooled)
-   `rust.send` — `send()` until response headers: DNS + TCP + TLS + request round trip
-   `rust.first-chunk` — command entry until the first body chunk

### Typical attribution

With a hosted provider the provider's own time dominates: `first-byte ->
first-token` is usually 0.5-1.5s, while everything the app controls (prompt build,
settings, engine setup, dispatch, paint) is a few milliseconds and the network
setup is tens of milliseconds. Connection reuse is visible as `rust.send`
dropping after the first request of a session.

If a trace shows time somewhere else, that is the regression to chase.

## Enabling / inspecting

-   Desktop: tracing is always on. Lines go to stdout, so run `pnpm dev-tauri`
    from a terminal (or launch the packaged binary from a terminal) to see them.
-   Browser extension: `localStorage.setItem('translate-perf', 'on')`, then
    `localStorage.removeItem('translate-perf')` to go back to the default.
-   Anywhere: `window.__translatePerf` exposes `last()`, `all()` (last 20 traces),
    `csv()`, `active()`, `enable()`, `disable()`, `clear()`.

Traces are cheap (a handful of `performance.now()` calls per translation) and
never throw, so they can stay enabled while debugging a slow provider.

## Related fixes

-   The HTTP client is pooled per proxy configuration; a client per request used
    to pay a full DNS + TCP + TLS handshake on every translation.
-   The first streamed token is painted immediately instead of waiting for the
    120ms coalescing window used for the rest of the stream.
-   Settings are cached for the lifetime of a config version instead of one IPC
    round trip and config file read per `getSettings()` call (~10 per request).
-   Stream decoding keeps partial UTF-8 sequences across chunk boundaries
    (Rust `decode_stream_chunk`, `TextDecoder` with `{ stream: true }` in JS),
    otherwise CJK text shows replacement characters.
