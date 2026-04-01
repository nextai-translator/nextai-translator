# simple-translator (Tauri-only)

<p align="center">
    <br> English | <a href="README-CN.md">中文</a>
</p>

Minimal desktop translator built with **Tauri + React**, using **Ollama only**.

## What’s included

- **Translator**
- **History**
- **Global hotkeys**
- **Provider**: Ollama only

Everything else (browser extensions/userscripts/OCR/updater/thumb/action manager, etc.) has been removed.

## Prerequisites

- **Rust toolchain** (for Tauri)
- **Ollama** running locally
  - Default URL: `http://127.0.0.1:11434`
  - Recommended: use `127.0.0.1` instead of `localhost`

## Development

```bash
pnpm install
pnpm dev-tauri
```

## Build

```bash
pnpm build-tauri
```

## Notes

- If you previously configured a proxy, local Ollama requests may fail with 502. This build bypasses proxy for `localhost/127.0.0.1`.

## License

[LICENSE](./LICENSE)
