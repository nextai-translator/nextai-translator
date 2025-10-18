# UUID
d18dd11f-56cd-4c28-82db-41b312b3c613

# Trigger
How is the Tauri desktop application structured? How does the Rust backend work?

# Content
## Tauri Desktop Architecture

The desktop application uses **Tauri 2.0**, combining a Rust backend with a React frontend.

## Frontend Structure (`src/tauri/`)

### Main Entry (`index.tsx`, `App.tsx`)
- Application bootstrap
- Window routing
- Global providers

### Windows (`src/tauri/windows/`)
Different window types:
- **TranslatorWindow.tsx** - Main translation window
- **SettingsWindow.tsx** - Settings/preferences
- **ScreenshotWindow.tsx** - Screenshot translation
- **ActionManagerWindow.tsx** - Custom action management
- **UpdaterWindow.tsx** - Update notifications
- **ThumbWindow.tsx** - Thumbnail/preview window

### Components (`src/tauri/components/`)
- **Window.tsx** - Window wrapper/container

### Utilities
- **utils.ts** - Tauri-specific utilities
- **bindings.ts** - Rust-to-TypeScript type bindings (auto-generated)

## Rust Backend (`src-tauri/`)

### Core Files

#### `main.rs` (22KB)
Main Tauri application:
- Application initialization
- Window management
- Command registration
- Plugin initialization
- System tray setup

#### `windows.rs` (21KB)
Window management logic:
- Window creation and positioning
- Window state management
- Multi-window coordination
- Window events

#### `writing.rs` (17KB)
Writing/composition features:
- Text input assistance
- Writing mode implementation
- Clipboard integration

#### `utils.rs` (12KB)
Utility functions:
- Text selection
- System information
- Helper functions

#### `ocr.rs` (5.7KB)
OCR functionality:
- Screenshot capture
- Text extraction from images
- OCR engine integration

#### `tray.rs` (3.7KB)
System tray integration:
- Tray icon management
- Tray menu
- Tray events

#### `fetch.rs` (5.3KB)
HTTP fetching:
- Custom HTTP client
- Proxy support
- Request handling

#### `config.rs` (3.3KB)
Configuration management:
- App configuration
- Settings persistence

#### `lang.rs` (217 bytes)
Language utilities for Rust side

### Rust Dependencies (Key Crates)

#### Tauri Ecosystem
- **tauri** - Main framework
- **tauri-plugin-*** - Official plugins:
  - autostart - Launch on system startup
  - global-shortcut - Keyboard shortcuts
  - notification - System notifications
  - updater - Auto-update functionality
  - fs - File system access
  - http - HTTP client
  - shell - Shell command execution
  - process - Process management
  - os - OS information
  - single-instance - Prevent multiple instances

#### System Integration
- **clipboard** - Clipboard access
- **enigo** - Keyboard/mouse simulation
- **mouse_position** - Mouse cursor tracking
- **rdev** - Device event listening
- **active-win-pos-rs** - Active window tracking

#### Screenshot & OCR
- **screenshots** - Screen capture
- **image** - Image processing
- **get-selected-text** - Text selection retrieval

#### Language Detection
- **whatlang** - Language detection library

#### macOS Specific
- **cocoa** - Cocoa framework bindings
- **objc** - Objective-C runtime
- **macos-accessibility-client** - Accessibility API
- **accessibility-ng** - Accessibility features
- **core-foundation** - Core Foundation framework
- **core-graphics** - Graphics framework

#### Windows Specific
- **windows** crate - Windows API bindings
  - UI and messaging
  - OCR (Windows.Media.Ocr)
  - Graphics

#### Async & HTTP
- **tokio** - Async runtime
- **reqwest** - HTTP client with streaming
- **futures-util** - Future utilities

#### Utilities
- **serde/serde_json** - Serialization
- **once_cell** - Lazy statics
- **parking_lot** - Synchronization primitives
- **mouce** - Mouse control
- **tiny_http** - Minimal HTTP server
- **text-diff** - Text diffing
- **similar** - Diff algorithms

#### Type Generation
- **specta** - TypeScript type generation
- **tauri-specta** - Tauri + Specta integration
  - Auto-generates `bindings.ts`

#### Analytics
- **tauri-plugin-aptabase** - Analytics

## Command Pattern

Rust functions are exposed to JavaScript via Tauri commands:

```rust