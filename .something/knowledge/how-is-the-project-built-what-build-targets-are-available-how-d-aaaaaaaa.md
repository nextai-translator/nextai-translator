# UUID
a30b551f-292b-4af0-b088-119228485f43

# Trigger
How is the project built? What build targets are available? How does the build system work?

# Content
## Build System

The project uses **Vite** with multiple configuration files for different build targets.

## Build Targets

### 1. Tauri Desktop App
**Config**: `vite.config.tauri.ts`
- **Dev**: `pnpm dev-tauri-renderer` - Start Vite dev server
- **Build**: `pnpm build-tauri-renderer` - Build frontend, then `tauri build`
- **Full Build**: `pnpm build-tauri` - Build everything including Rust backend
- Output: Native desktop applications for Windows/macOS/Linux

### 2. Browser Extension - Chromium
**Config**: `vite.config.chromium.ts`
- **Dev**: `pnpm dev-chromium` - Development mode with HMR
- **Build**: Via Makefile - `make build-browser-extension`
- Output: `dist/browser-extension/chromium/` (Chrome, Edge, Brave, etc.)
- Uses `@samrum/vite-plugin-web-extension`

### 3. Browser Extension - Firefox
**Config**: `vite.config.firefox.ts`
- **Dev**: `pnpm dev-firefox` - Watch mode rebuild
- **Build**: Via Makefile - `make build-browser-extension`
- Output: `dist/browser-extension/firefox/`
- Firefox-specific manifest and polyfills

### 4. Userscript
**Config**: `vite.config.userscript.ts`
- **Build**: `pnpm build-userscript` or `make build-userscript`
- Output: Tampermonkey/Greasemonkey compatible script
- Uses `vite-plugin-monkey`

### 5. Clip Extensions
- **PopClip**: `make build-popclip-extension`
- **Snipdo**: `make build-snipdo-extension`

## Build Scripts (package.json)

```json
{
  "dev-tauri-renderer": "vite -c vite.config.tauri.ts --force",
  "dev-chromium": "vite -c vite.config.chromium.ts",
  "dev-firefox": "NODE_ENV=development vite build -c vite.config.firefox.ts --watch",
  "build-browser-extension": "tsc && make build-browser-extension",
  "build-userscript": "make build-userscript"
}
```

## Makefile Commands

### Version Management
- `make change-version VERSION=x.y.z` - Update Tauri config version
- `make change-package-version VERSION=x.y.z` - Update package.json version

### Build Commands
- `make build-browser-extension` - Build and zip Chrome + Firefox extensions
- `make build-userscript` - Build userscript version
- `make clean` - Remove dist directory

## Common Vite Configuration

**Base config** (`vite.config.ts`):
- Path alias: `@` → `./src`
- Vitest configuration for testing
- Test environment: jsdom

## Build Process

### TypeScript Compilation
1. Type checking via `tsc` (no emit)
2. Vite handles transpilation during build

### Asset Handling
- SVG: Via `vite-plugin-svgr` - Import as React components
- Images: Inlined or copied based on size
- Fonts: Bundled as needed

### Code Splitting
- Automatic chunk splitting by Vite
- Vendor chunks separated
- Dynamic imports supported

### Production Optimizations
- Minification
- Tree shaking
- Asset optimization
- Source maps disabled (per tsconfig.json)

## Platform-Specific Builds

### Tauri Backend
- Rust compiled via Cargo
- Tauri CLI orchestrates frontend + backend
- Native binary output per platform

### Browser Extensions
- Manifest V3 (Chromium) / V2 (Firefox)
- Web Extension polyfills for compatibility
- Background service worker (Chromium) / Background page (Firefox)

### Package Manager
- **pnpm** required (v9.1.3)
- Lock file: `pnpm-lock.yaml`
- Workspace-style dependencies