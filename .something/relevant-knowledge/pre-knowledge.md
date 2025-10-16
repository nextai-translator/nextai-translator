# Relevant Knowledge for Tauri v2 Upgrade

## Knowledge UUID: d18dd11f-56cd-4c28-82db-41b312b3c613

## Tauri Desktop Architecture

The desktop application uses **Tauri 2.0**, combining a Rust backend with a React frontend.

### Key Rust Backend Files
- **main.rs** (22KB) - Application initialization, plugin registration, command registration
- **windows.rs** (21KB) - Window management logic
- **writing.rs** (17KB) - Writing/composition features
- **utils.rs** (12KB) - Utility functions
- **ocr.rs** (5.7KB) - OCR functionality
- **tray.rs** (3.7KB) - System tray integration
- **fetch.rs** (5.3KB) - HTTP fetching with proxy support
- **config.rs** (3.3KB) - Configuration management

### Tauri Plugins in Use
- tauri-plugin-autostart - Launch on system startup
- tauri-plugin-global-shortcut - Keyboard shortcuts
- tauri-plugin-notification - System notifications
- tauri-plugin-updater - Auto-update functionality
- tauri-plugin-fs - File system access
- tauri-plugin-http - HTTP client
- tauri-plugin-shell - Shell command execution
- tauri-plugin-process - Process management
- tauri-plugin-os - OS information
- tauri-plugin-single-instance - Prevent multiple instances

### Type Generation
- **specta** - TypeScript type generation
- **tauri-specta** - Tauri + Specta integration, auto-generates `bindings.ts`

## Current Version State
- @tauri-apps/api: 2.0.0-beta.9
- @tauri-apps/cli: 2.0.0-beta.13
- tauri crate: 2.0.0-beta.19
- tauri-build: 2.0.0-beta.15
- tauri-utils: 2.0.0-beta.15
- specta: 2.0.0-rc.12
- tauri-specta: 2.0.0-rc.10
- All plugins: git references with v2 branches

## Target Versions
- All core packages and plugins: stable 2.0.0 or higher
- Remove all beta, rc, and git references
- Use published npm and crates.io versions
