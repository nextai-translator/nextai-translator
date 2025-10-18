# UUID
97df06e3-9d07-48a6-b70f-52ea301628e6

# Trigger
How is the common layer organized? What is the shared code architecture?

# Content
## Common Layer Architecture

The `src/common/` directory contains all shared code across platforms (Tauri desktop, browser extension, userscript).

## Directory Structure

### Components (`src/common/components/`)
React components used across all platforms:
- **Translator.tsx** (117KB) - Main translation UI component
- **Settings.tsx** (125KB) - Settings/configuration UI
- **Vocabulary.tsx** - Vocabulary book management
- **ActionManager.tsx** - Custom action management
- **Markdown.tsx** - Markdown rendering wrapper
- **CodeBlock.tsx** - Code syntax highlighting
- **Form/** - Form components and utilities

### Engines (`src/common/engines/`)
LLM provider implementations:
- **abstract-engine.ts** - Base engine interface
- **abstract-openai.ts** - Shared OpenAI-compatible logic
- **[provider].ts** - Individual provider implementations
- **interfaces.ts** - Type definitions
- **index.ts** - Provider registry and factory

### Services (`src/common/services/`)
Business logic services:
- **action.ts** - Custom action definitions
- **vocabulary.ts** - Vocabulary management
- **promotion.ts** - Promotional features

### Internal Services (`src/common/internal-services/`)
Internal APIs and data access:
- Database layer (likely using Dexie)
- Local storage abstractions
- Internal API clients

### Hooks (`src/common/hooks/`)
Custom React hooks for:
- State management
- Side effects
- Platform abstractions
- Reusable logic

### TTS (`src/common/tts/`)
Text-to-Speech implementations:
- Multiple TTS provider integrations
- Voice selection
- Playback controls

### Background (`src/common/background/`)
Background service logic:
- Service worker code (browser extension)
- Background tasks
- Message passing

### I18n (`src/common/i18n/`)
Internationalization:
- Translation files
- Language configuration
- i18next setup

### Language (`src/common/lang/`)
Language-specific configurations:
- Language codes and names
- Phonetic notation systems
- Language-specific prompts

### Polyfills (`src/common/polyfills/`)
Compatibility shims for different environments

### Assets (`src/common/assets/`)
Shared static assets (images, icons, etc.)

## Key Files

### `translate.ts`
Core translation orchestration:
- Translation mode handling
- Prompt generation
- Engine invocation
- Quote processing

### `types.ts`
Shared TypeScript types:
- **ISettings** - Application settings
- **IBrowser** - Browser API abstraction
- **IThemedStyleProps** - Theming types
- **TranslateMode** - Translation mode enum

### `utils.ts` (18KB)
Utility functions:
- Settings management
- Text processing
- Helper functions

### `constants.ts`
Application-wide constants

### `store.ts`
Global state store configuration

### `token.ts`
Token counting and management (for LLM APIs)

### `traditional-or-simplified.ts` (17KB)
Chinese character conversion logic

### `geo.ts` / `geo-data.ts`
Geographic/location data handling

### `analysis.ts`
Text analysis utilities

## Design Principles

### Platform Abstraction
The common layer provides abstractions over platform-specific APIs:
- **Storage**: Unified API for localStorage/Tauri store/extension storage
- **Runtime**: Message passing abstraction
- **I18n**: Language detection across platforms

### Component Reusability
UI components are platform-agnostic:
- No direct DOM manipulation
- No platform-specific imports
- Props-based configuration

### Business Logic Isolation
Core logic is separated from UI:
- Translation logic in `translate.ts`
- Engine communication abstracted
- Settings management centralized

### Type Safety
Strong typing throughout:
- Shared interfaces in `types.ts`
- Engine contracts in `interfaces.ts`
- Type-safe state management

## Data Flow Pattern

```
User Action (any platform)
    ↓
Common Component (e.g., Translator.tsx)
    ↓
Business Logic (translate.ts)
    ↓
Service/Engine Layer
    ↓
Platform Adapter (Tauri/Browser API)
    ↓
External API/Resource
```

## State Management Strategy

Multiple state libraries coexist:
1. **Jotai** - Atomic state for specific features
2. **Zustand** - Global application state
3. **React Hooks** - Component-local state
4. **SWR** - Server state and caching

This multi-library approach allows choosing the right tool for each use case.