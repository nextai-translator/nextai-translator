# Relevant Knowledge for Homepage Implementation

## State Management Knowledge
UUID: 714cd2d0-ba58-48b5-a087-18e0fb11c348

**Key Points:**
- Use **Jotai** for atomic, fine-grained reactive state (perfect for homepage UI state)
- Use **Zustand** for global application state that needs persistence
- Jotai atoms don't need Provider wrapper and offer excellent performance
- Use atomWithStorage from jotai/utils for persistent state
- Follow the pattern of `showSettingsAtom` for homepage visibility state

**Application to Homepage:**
- `showHomepageAtom` is correctly implemented using Jotai atom pattern
- Homepage UI state (expanded cards, input text) can use local useState or Jotai atoms
- Recent activity fetching uses Dexie with useLiveQuery for reactive data

## Styling Knowledge
UUID: 36c6fca9-982d-458c-88c7-10323421cb47

**Key Points:**
- Use **Styletron** for atomic CSS-in-JS with BaseUI components
- Use **Base Web UI (BaseUI-SD)** for pre-built, accessible components
- Theme system supports light/dark modes via `useStyletron()` hook
- Components should use theme values (not hardcoded colors/spacing)
- Follow theming pattern: `const [css, theme] = useStyletron()`

**Application to Homepage:**
- HomePage.tsx correctly uses BaseUI Card, Button components
- Styling follows Styletron pattern with theme.colors and theme.sizing
- QuickActionCard uses Card component with proper overrides
- All components are theme-aware and support dark/light modes

## Database Schema
- **RecentActivity table** added in database version 5
- Schema: `++id, timestamp, mode, sourceText, targetText, sourceLang, targetLang`
- Use `useLiveQuery` from dexie-react-hooks for reactive queries
- Automatic cleanup: Keep max 50 items with FIFO policy
- Query pattern: `db.recentActivity.orderBy('timestamp').reverse().limit(10)`

## i18n Translation
- All homepage strings are internationalized using i18next
- Translation namespace: `homepage` with nested keys
- Pattern: `t('homepage.title')`, `t('homepage.quickActions.translate.description')`
- Translations exist for: title, subtitle, quick actions, recent activity

## Component Architecture
- Components in `src/common/components/` for cross-platform reuse
- Platform-specific integrations in:
  - `src/tauri/windows/HomeWindow.tsx` for Tauri desktop
  - `src/browser-extension/popup/index.tsx` for browser extension
- Use conditional rendering based on `showHomepageAtom` state
- Quick actions navigate to Translator by toggling atoms

## Testing Strategy
- Unit tests with vitest in `src/common/components/__tests__/`
- E2E tests with Playwright in `e2e/homepage.spec.ts`
- Tests validate scenarios from SCENARIOS_TO_BUILD.json
- Test IDs: `homepage-container`, `homepage-logo`, `recent-activity-list`
