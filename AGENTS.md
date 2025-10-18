# Repository Guidelines

## Project Structure & Module Organization
- `src/browser-extension/` hosts extension surfaces (popup, options, background) and manifest tooling.
- `src/tauri/` contains the React renderer for desktop windows, while `src/common/` keeps shared hooks, stores, and translator logic consumed by both targets.
- `src-tauri/` is the Rust/Tauri backend for native commands, updates, and packaging; platform assets live in `src-tauri/resources` and `src-tauri/icons`.
- Supporting content sits in `public/` (static assets), `scripts/` (build helpers), `docs/` (provider guides), and `e2e/` (Playwright specs). Build outputs land in `dist/` and long-lived bundles in `release/`.

## Build, Test, and Development Commands
Install dependencies with `pnpm install` (package manager is pinned in `package.json`).
- `pnpm dev-chromium` starts the extension in Vite with HMR; `pnpm dev-tauri` boots the desktop shell with Tauri devtools.
- `pnpm build-browser-extension`, `pnpm build-tauri`, and `pnpm build-userscript` produce distributable bundles; use `pnpm clean` to reset `dist/` before packaging.
- `pnpm test` runs Vitest suites and `pnpm test:e2e` executes Playwright specs in `e2e/`.
- `pnpm lint`, `pnpm lint:fix`, and `pnpm format` keep ESLint and Prettier satisfied across TS/JS/CSS/MD files.

## Coding Style & Naming Conventions
TypeScript + React 18 (with Styletron) is the primary stack. Keep 4-space indentation, single quotes, and trailing commas—Prettier enforces this, so format before pushing. Components stay in `PascalCase`, hooks/utilities in `camelCase`, and constants in `SCREAMING_SNAKE_CASE`. Reuse helpers from `src/common` instead of duplicating logic, and keep staged files lint-clean to satisfy the pre-commit hook.

## Testing Guidelines
Unit tests live next to the code (`__tests__/foo.test.ts` or `foo.spec.ts`) and run with Vitest. Mock remote APIs and keep snapshots deterministic, especially around translation results. Update Playwright specs in `e2e/*.spec.ts` when UI flows change, and verify `pnpm test` plus `pnpm test:e2e` before requesting review.

## Commit & Pull Request Guidelines
Follow the lightweight conventional pattern seen in history (`fix:`, `feat:`, `chore:`) with concise, imperative summaries and optional scope (e.g., `fix: handle streaming fallback`). Reference related issues in parentheses `(#1234)` when helpful. PRs should describe the change, attach screenshots or GIFs for UI work, list verification commands, and call out platform coverage across Chrome, Firefox, and Tauri targets. Request review after lint/tests pass and diffs are free of secrets.

## Security & Configuration Tips
Never commit API keys or user artifacts; rely on runtime configuration via the in-app settings or local `.env` files ignored by git. When adding providers, document required environment keys under `docs/` and guard sensitive defaults behind toggles in `src/common`.
