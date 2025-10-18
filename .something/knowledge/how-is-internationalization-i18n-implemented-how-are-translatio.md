# UUID
530d22b8-eb6b-4014-bf93-0aff38afd264

# Trigger
How is internationalization (i18n) implemented? How are translations managed?

# Content
## Internationalization (i18n) System

The project uses **i18next** for comprehensive internationalization support.

## i18n Stack

### Core Libraries
- **i18next** (v23.4.4) - Core i18n framework
- **react-i18next** (v13.0.3) - React integration
- **i18next-browser-languagedetector** (v7.1.0) - Automatic language detection
- **i18next-http-backend** (v2.2.1) - Load translations from files

### Language Utilities
- **iso-639-1** (v3.0.1) - ISO 639-1 language codes

## Configuration

### Setup Location
- `src/common/i18n/` - i18n configuration directory
- `src/common/i18n.js` - Main i18n initialization (1.3KB)
- `src/common/i18n.d.ts` - TypeScript definitions

### Basic Setup Pattern
```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

i18n
    .use(Backend)                    // Load translations
    .use(LanguageDetector)           // Detect user language
    .use(initReactI18next)           // React integration
    .init({
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,       // React already escapes
        },
    })
```

## Language Detection

### Detection Strategy
**i18next-browser-languagedetector** tries (in order):
1. Query string (?lng=en)
2. Cookie
3. localStorage
4. Session storage
5. Navigator language
6. HTML lang attribute

### Custom Language Detection
The project also has custom language detection:
- `src/common/lang/` - Language-specific code
- Language detection for translation source text
- Uses browser API: `chrome.i18n.detectLanguage()` (in IBrowser interface)

## Supported Languages

The application supports translation between **55+ languages**, including:
- Chinese variants (Simplified, Traditional, Literary, Cantonese)
- Major European languages
- Asian languages
- Middle Eastern languages
- And many more

## Translation Resources

### Resource Location
Translations likely stored in:
- `public/locales/` (standard i18next pattern)
- Or loaded via HTTP backend
- JSON format per language

### Resource Structure
```
locales/
├── en/
│   ├── common.json
│   ├── settings.json
│   └── translation.json
├── zh-Hans/
│   ├── common.json
│   ├── settings.json
│   └── translation.json
└── ...
```

## Usage Patterns

### In React Components
```typescript
import { useTranslation } from 'react-i18next'

function Component() {
    const { t, i18n } = useTranslation()

    return (
        <div>
            <h1>{t('welcome')}</h1>
            <button onClick={() => i18n.changeLanguage('zh-Hans')}>
                {t('switchLanguage')}
            </button>
        </div>
    )
}
```

### With Interpolation
```typescript
t('greeting', { name: 'John' })
// Translation: "Hello, {{name}}"
// Output: "Hello, John"
```

### With Plurals
```typescript
t('items', { count: 5 })
// Translation: "{{count}} item_one", "{{count}} items_other"
// Output: "5 items"
```

### Namespaces
```typescript
const { t } = useTranslation('settings')
t('apiKey')  // Loads from settings namespace
```

## Language Configuration

### Language Metadata (`src/common/lang/`)
Each language has configuration:
- Language name (native and English)
- Language code (ISO 639-1 or extended)
- Phonetic notation system (IPA, Pinyin, etc.)
- Role prompts for LLM (language-specific)
- Text direction (LTR/RTL)

### LangCode Type
```typescript
type LangCode = 'en' | 'zh-Hans' | 'zh-Hant' | 'ja' | 'ko' | // ... many more
```

### Language Functions
- `getLangName(code)` - Get language name
- `getLangConfig(code)` - Get language configuration

## UI Language vs Translation Language

Two separate concepts:

### 1. UI Language (i18n)
- Language of the app interface
- Settings labels, buttons, menus
- Managed by i18next
- Set via `ISettings.i18n`

### 2. Translation Languages
- Source language (detectFrom)
- Target language (detectTo)
- Used for actual translation
- Managed per translation request

## Platform-Specific Considerations

### Browser Extension
- Uses `chrome.i18n` API for browser UI strings
- i18next for app content
- Localized manifest.json

### Tauri Desktop
- i18next for all UI strings
- System language detection
- Native menu localization

## RTL Support

Likely supported via i18next:
- Automatic RTL detection
- CSS direction switching
- RTL languages: Arabic, Hebrew, Persian, etc.

## Dynamic Language Switching

### Change Language
```typescript
await i18n.changeLanguage('zh-Hans')
```

### Persistence
- Selected language saved to settings
- Restored on app restart
- Synced across devices (browser extension)

## Translation Keys Organization

Best practices (inferred):
- **Namespaces**: Group by feature/page
- **Nesting**: Organize hierarchically
- **Naming**: Clear, descriptive keys
- **Consistency**: Follow conventions

Example structure:
```json
{
  "settings": {
    "title": "Settings",
    "api": {
      "key": "API Key",
      "url": "API URL"
    }
  }
}
```

## Missing Translation Handling

### Fallback Strategy
1. Try requested language
2. Fall back to English (fallbackLng)
3. Show key as last resort

### Development Mode
- Show missing translation warnings
- Log missing keys for translation

## Performance Optimization

### Lazy Loading
- Load translations on demand
- Split by namespace
- HTTP backend for async loading

### Caching
- Cache loaded translations
- localStorage for persistence
- Reduce network requests

## Special Cases

### Chinese Variants
Multiple Chinese languages supported:
- `zh-Hans` - Simplified Chinese
- `zh-Hant` - Traditional Chinese
- `lzh` - Literary Chinese
- `yue` - Cantonese
- `jdbhw` - 晋语 (Jin dialect)
- `xdbhw` - 吴语 (Wu dialect)

### Language-Specific Features
- Chinese word mode: Different prompt format
- Phonetic notation varies by language
- Grammar explanation tailored per language