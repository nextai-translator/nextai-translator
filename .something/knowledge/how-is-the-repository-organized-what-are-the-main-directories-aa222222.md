# UUID
7726a344-9b06-4fa3-a83e-4e1312e1d423

# Trigger
How is the repository organized? What are the main directories?

# Content
## Repository Structure

```
nextai-translator/
├── src/                          # TypeScript/React source code
│   ├── common/                   # Shared code across all platforms
│   │   ├── components/           # React components (Settings, Translator, etc.)
│   │   ├── engines/              # LLM provider implementations
│   │   ├── services/             # Business services (actions, vocabulary, etc.)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── tts/                  # Text-to-Speech implementations
│   │   ├── background/           # Background service logic
│   │   ├── i18n/                 # Internationalization
│   │   ├── translate.ts          # Core translation logic
│   │   ├── types.ts              # Shared TypeScript types
│   │   └── utils.ts              # Utility functions
│   ├── tauri/                    # Tauri desktop app specific code
│   │   ├── windows/              # Window components
│   │   ├── components/           # Tauri-specific components
│   │   └── App.tsx               # Main Tauri app
│   └── browser-extension/        # Browser extension specific code
│       ├── background/           # Background service worker
│       ├── content_script/       # Content script injected into pages
│       ├── popup/                # Extension popup UI
│       └── options/              # Extension options page
├── src-tauri/                    # Rust backend for Tauri
│   ├── src/
│   │   ├── main.rs               # Main Rust entry point
│   │   ├── windows.rs            # Window management
│   │   ├── writing.rs            # Writing feature implementation
│   │   ├── utils.rs              # Utility functions
│   │   ├── ocr.rs                # OCR functionality
│   │   ├── tray.rs               # System tray integration
│   │   └── fetch.rs              # HTTP fetching
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── clip-extensions/              # Clip extension integrations
│   ├── popclip/                  # PopClip extension
│   └── snipdo/                   # Snipdo extension
├── docs/                         # Documentation
├── e2e/                          # End-to-end tests
├── public/                       # Static assets
├── scripts/                      # Build and utility scripts
├── vite.config.*.ts              # Multiple Vite configs for different targets
├── package.json                  # Node dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.js                  # ESLint configuration
├── .prettierrc.js                # Prettier configuration
└── Makefile                      # Build automation
```

## Key Design Principles

1. **Code Reuse**: The `src/common/` directory contains all shared logic
2. **Platform Abstraction**: Platform-specific code is isolated in separate directories
3. **Multi-Build Target**: Different Vite configurations for each platform
4. **Monorepo Style**: All platforms in a single repository