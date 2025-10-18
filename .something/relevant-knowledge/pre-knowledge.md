# Relevant Knowledge for Official Website Implementation

## Project Overview (UUID: 9784d98a-2069-4d34-8940-4413cf949203)

**nextai translator** is a multi-platform translation tool with:
- Browser extensions (Chrome, Firefox)
- Desktop applications (Tauri)
- 55+ languages support
- Multiple AI providers (OpenAI, Claude, Gemini, etc.)

**Technology Stack:**
- React 18 + TypeScript
- State Management: Jotai, Zustand
- UI Framework: BaseUI with Styletron
- Build Tools: Vite
- Testing: Vitest, Playwright

## Internationalization (UUID: 530d22b8-eb6b-4014-bf93-0aff38afd264)

**i18n Stack:**
- **i18next** (v23.4.4) - Core i18n framework
- **react-i18next** (v13.0.3) - React integration
- **i18next-browser-languagedetector** (v7.1.0) - Auto language detection
- **i18next-http-backend** (v2.2.1) - Load translations from files

**Setup Pattern:**
```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    })
```

**Priority Languages:** English, Chinese (Simplified and Traditional), Japanese, Spanish, French, German

## Repository Structure (UUID: 7726a344-9b06-4fa3-a83e-4e1312e1d423)

```
nextai-translator/
├── src/common/           # Shared code across platforms
├── src/tauri/            # Desktop app specific
├── src/browser-extension/ # Browser extension specific
├── src-tauri/            # Rust backend
├── docs/                 # Documentation
└── public/               # Static assets
```

## Key Implementation Considerations

1. **Website should be separate from main product** - Create in a subdirectory or separate location
2. **Leverage existing i18next knowledge** - Use same i18n patterns
3. **Align with product tech stack** - React 18, TypeScript, similar patterns
4. **Use BaseUI if possible** - Maintain visual consistency with product
