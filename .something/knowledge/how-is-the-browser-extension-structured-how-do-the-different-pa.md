# UUID
bf5f9af8-28d6-44a4-8430-56aea4b6507e

# Trigger
How is the browser extension structured? How do the different parts communicate?

# Content
## Browser Extension Architecture

The browser extension supports both Chromium-based browsers (Chrome, Edge) and Firefox.

## Extension Structure (`src/browser-extension/`)

### Background Service (`background/index.ts`)
Background service worker (Chromium) or background page (Firefox):
- Message routing between content scripts and extension
- API request handling
- Extension lifecycle management
- Cross-origin request handling (bypassing CORS)
- Storage management

### Content Script (`content_script/`)
Injected into web pages:

#### `index.tsx`
Main content script entry:
- Detects text selection
- Injects translation UI
- Handles user interactions
- Communicates with background script

#### `TitleBar.tsx`
Translation popup title bar:
- Drag functionality
- Close button
- Window controls

#### `utils.ts`
Content script utilities:
- DOM manipulation helpers
- Position calculation
- Event handling

#### `consts.ts`
Constants for content script

### Popup (`popup/index.tsx`)
Extension popup (click on toolbar icon):
- Quick settings
- Translation interface
- Recent translations

### Options Page (`options/index.tsx`)
Extension settings page:
- Full settings UI
- API configuration
- Preferences

### Common (`common.ts`)
Shared utilities between extension components

### HMR Support (`enable-dev-hmr.ts`)
Hot Module Replacement for development

## Build Configurations

### Chromium (`vite.config.chromium.ts`)
- Manifest V3
- Service worker background script
- Chrome Extension API types

### Firefox (`vite.config.firefox.ts`)
- Manifest V2
- Background page (not service worker)
- WebExtension polyfills

## Communication Flow

```
User selects text on webpage
    ↓
Content Script detects selection
    ↓
Injects translation UI into page
    ↓
User triggers translation
    ↓
Content Script → Background Script (message)
    ↓
Background Script makes API request
    ↓
Background Script → Content Script (response)
    ↓
Content Script updates UI
```

## Message Passing

### From Content Script
```typescript
chrome.runtime.sendMessage({
    type: 'translate',
    text: selectedText,
    // ...
})
```

### From Background
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle message
})
```

## Storage Strategy

### Extension Storage
Uses `chrome.storage.sync` for:
- User settings
- API keys
- Preferences

Synced across devices when user is signed in

### Local Storage
Uses `chrome.storage.local` for:
- Cache
- Temporary data
- Large data sets

## Content Script Injection

### Static Injection (manifest.json)
Automatically injected into all pages:
```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content_script.js"]
  }]
}
```

### Dynamic Injection
Can inject on-demand via `chrome.scripting.executeScript`

## UI Integration on Web Pages

### Floating UI
Uses `@floating-ui/dom` for positioning:
- Follows text selection
- Avoids viewport edges
- Auto-repositioning on scroll

### Shadow DOM (likely)
Isolates extension UI from page styles:
- Prevents CSS conflicts
- Encapsulated styling
- Clean separation

## Cross-Origin Requests

Background script can make requests to any domain:
- Content scripts are limited by CORS
- Background bypasses CORS restrictions
- Proxy pattern for API calls

## Platform Differences

### Chromium (Manifest V3)
- Service worker background
- Promises-based APIs
- Stricter CSP
- Limited background lifetime

### Firefox (Manifest V2)
- Persistent background page
- Callback-based APIs (with polyfill)
- More permissive
- Always-running background

## Permissions

Likely required permissions:
- `storage` - Store settings
- `activeTab` - Access current tab
- `contextMenus` - Right-click menu (if implemented)
- `<all_urls>` or `*://*/*` - Inject into pages
- CORS bypass for API endpoints

## Development Workflow

### Chromium Development
```bash
pnpm dev-chromium
```
- Vite dev server with HMR
- Load unpacked extension from `dist/`
- Auto-reload on changes

### Firefox Development
```bash
pnpm dev-firefox
```
- Watch mode with rebuild
- Use `web-ext` or load temporarily in Firefox
- Manual reload required

## Extension Packaging

### Build
```bash
make build-browser-extension
```
- Builds both Chromium and Firefox versions
- Creates zip files:
  - `dist/browser-extension/chromium.zip`
  - `dist/browser-extension/firefox.zip`

### Distribution
- Chrome Web Store (Chromium)
- Firefox Add-ons (Firefox)
- Manual distribution (enterprise)

## Browser API Abstraction

Uses `webextension-polyfill` for cross-browser compatibility:
```typescript
import browser from 'webextension-polyfill'

// Works in both Chrome and Firefox
await browser.storage.sync.get('apiKey')
```

## Security Considerations

- Content Security Policy compliance
- Sanitize user input (XSS prevention)
- Secure storage for API keys
- HTTPS-only API requests
- Permission minimization