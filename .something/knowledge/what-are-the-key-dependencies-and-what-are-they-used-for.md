# UUID
a1c0d844-3f50-4be4-b985-29498aa91d00

# Trigger
What are the key dependencies and what are they used for?

# Content
## Key Dependencies

### Core Framework
- **React 18.2.0** - UI framework
- **React DOM 18.2.0** - DOM renderer
- **TypeScript 5.1.6** - Type safety

### Build Tools
- **Vite 4.3.9** - Build tool and dev server
- **@vitejs/plugin-react** - React support for Vite
- **vite-tsconfig-paths** - TypeScript path resolution

### Desktop Framework (Tauri)
- **@tauri-apps/api** (v2.0.0-beta.9) - JavaScript API for Tauri
- **@tauri-apps/cli** (v2.0.0-beta.13) - Tauri CLI
- **Rust** - Backend language (see Cargo.toml)

### State Management
- **jotai 2.8.0** - Atomic state management
- **zustand 4.4.0** - Lightweight state management
- **react-hooks-global-state 2.1.0** - Global state via hooks

### UI Libraries
- **baseui-sd 12.2.4** - Base Web UI components
- **styletron-engine-atomic 1.5.0** - CSS-in-JS engine
- **styletron-react 6.1.0** - React bindings for Styletron
- **react-jss 10.10.0** - JSS for React
- **react-icons 5.0.1** - Icon library

### Internationalization
- **i18next 23.4.4** - i18n framework
- **react-i18next 13.0.3** - React bindings
- **i18next-browser-languagedetector 7.1.0** - Language detection
- **i18next-http-backend 2.2.1** - Translation loading
- **iso-639-1 3.0.1** - Language code utilities

### Browser Extension
- **webextension-polyfill 0.10.0** - Cross-browser WebExtension API
- **@samrum/vite-plugin-web-extension 5.0.0** - Vite plugin for extensions
- **@types/chrome 0.0.242** - Chrome API types
- **@types/webextension-polyfill 0.10.1** - Types for polyfill

### Data Handling
- **dexie 3.2.3** - IndexedDB wrapper (local database)
- **dexie-react-hooks 1.1.3** - React hooks for Dexie
- **swr 2.2.0** - Data fetching and caching

### Utility Libraries
- **lodash.debounce 4.0.8** - Debounce utility
- **underscore 1.13.6** - Utility functions
- **date-fns 2.29.3** / **dayjs 1.11.10** - Date manipulation
- **clsx 1.2.1** - Conditional className utility
- **uuid 9.0.0** - UUID generation
- **qs 6.11.2** - Query string parsing

### Form Handling
- **rc-field-form 1.36.0** - Form management

### AI/LLM Integration
- **eventsource-parser 1.0.0** - Parse Server-Sent Events (SSE)
- **best-effort-json-parser 1.0.1** - Parse partial JSON
- **js-tiktoken 1.0.10** - Token counting for OpenAI models

### Text Processing
- **react-markdown 8.0.7** - Markdown rendering
- **react-latex-next 2.2.0** - LaTeX rendering
- **katex 0.16.8** - Math typesetting
- **prism-react-renderer 2.3.0** - Syntax highlighting
- **react-code-block 1.0.0** - Code block components

### OCR & Media
- **tesseract.js 4.0.2** - OCR (Optical Character Recognition)
- **react-dropzone 14.2.3** - File upload

### UI Interactions
- **react-draggable 4.4.5** - Draggable components
- **hotkeys-js 3.10.1** - Keyboard shortcuts
- **react-hotkeys-hook 4.4.1** - React hotkeys
- **react-window 1.8.9** - Virtualized lists

### Notifications & Feedback
- **react-hot-toast 2.4.1** - Toast notifications
- **react-error-boundary 4.0.10** - Error boundaries

### Other
- **react-copy-to-clipboard 5.1.0** - Copy to clipboard
- **color 4.2.3** - Color manipulation
- **common-tags 1.8.2** - Template literal tags
- **lru-cache 10.0.1** - LRU caching

### Development Tools
- **ESLint 8.46.0** - Linting
- **Prettier 3.0.0** - Code formatting
- **Vitest 0.34.3** - Unit testing
- **Playwright 1.34.3** - E2E testing
- **simple-git-hooks 2.11.1** - Git hooks
- **lint-staged 15.2.2** - Lint staged files

### Analytics & Monitoring
- **@sentry/react 7.61.0** - Error tracking
- **react-ga4 2.1.0** - Google Analytics 4
- **@aptabase/tauri** - Analytics for Tauri apps

### Rust Dependencies (Cargo.toml)
Key Rust crates:
- **tauri 2.0.0-beta.19** - Tauri framework
- **serde/serde_json** - Serialization
- **tokio** - Async runtime
- **reqwest** - HTTP client
- **clipboard** - Clipboard access
- **enigo** - Keyboard/mouse simulation
- **rdev** - Device events
- **screenshots** - Screenshot capture
- **whatlang** - Language detection
- **active-win-pos-rs** - Window position tracking
- **Platform-specific**: cocoa, objc (macOS), windows crate (Windows)