# UUID
714cd2d0-ba58-48b5-a087-18e0fb11c348

# Trigger
How is state managed in this application? What state management libraries are used and why?

# Content
## State Management Strategy

The project uses a **multi-library state management approach**, choosing the right tool for each use case.

## State Management Libraries

### 1. Jotai (v2.8.0)
**Philosophy**: Atomic state management

**Use Cases**:
- Fine-grained reactive state
- Derived/computed values
- State that needs to be split into atoms
- Local feature state
- Minimal boilerplate

**Characteristics**:
- Bottom-up approach (atoms compose)
- No Provider wrapper needed (uses Context internally)
- TypeScript-first
- Excellent performance (only re-renders what changed)

**Example Pattern**:
```typescript
import { atom, useAtom } from 'jotai'

const textAtom = atom('')
const lengthAtom = atom((get) => get(textAtom).length)

function Component() {
    const [text, setText] = useAtom(textAtom)
    const [length] = useAtom(lengthAtom)
    // ...
}
```

### 2. Zustand (v4.4.0)
**Philosophy**: Simplified Redux-like store

**Use Cases**:
- Global application state
- Cross-component communication
- State that needs to persist
- Complex state updates
- State that doesn't need frequent updates

**Characteristics**:
- Single store or multiple stores
- No Provider wrapper needed
- Can use outside React
- Middleware support (persist, devtools, etc.)

**Example Pattern**:
```typescript
import create from 'zustand'

const useStore = create((set) => ({
    settings: {},
    updateSettings: (settings) => set({ settings }),
}))

function Component() {
    const settings = useStore((state) => state.settings)
    // ...
}
```

### 3. react-hooks-global-state (v2.1.0)
**Philosophy**: Simple global state with hooks

**Use Cases**:
- Simple global state
- Migration from local state to global
- Lightweight state sharing
- Quick prototyping

**Characteristics**:
- Minimal API
- Hook-based
- Very lightweight
- Easy migration path

### 4. SWR (v2.2.0)
**Philosophy**: Stale-While-Revalidate

**Use Cases**:
- Remote data fetching
- API response caching
- Automatic revalidation
- Real-time data
- Optimistic updates

**Characteristics**:
- Built-in caching
- Automatic refetching
- Deduplication of requests
- Polling support
- Offline support

**Example Pattern**:
```typescript
import useSWR from 'swr'

function Component() {
    const { data, error, mutate } = useSWR('/api/settings', fetcher)
    // ...
}
```

### 5. React Built-in Hooks
**Philosophy**: Component-local state

**Use Cases**:
- Component-local state (`useState`)
- Side effects (`useEffect`)
- Context (`useContext`)
- Performance optimization (`useMemo`, `useCallback`)

## State Categories

### Application State
**Managed by**: Zustand or Jotai
- User settings (ISettings)
- Theme preferences
- Language settings
- UI preferences

### UI State
**Managed by**: useState, Jotai
- Modal open/closed
- Form inputs
- Dropdown state
- Loading states

### Server State
**Managed by**: SWR
- Translation results (cached)
- Vocabulary items
- User data (if from API)
- Remote configuration

### Platform State
**Managed by**: Custom hooks + storage
- Tauri: Tauri store
- Browser Extension: chrome.storage
- Abstracted via utilities

## State Flow Patterns

### Settings Management
```
User changes setting
    ↓
Update Zustand/Jotai store
    ↓
Persist to platform storage (Tauri/chrome.storage)
    ↓
Trigger re-renders via subscriptions
```

### Translation Request
```
User requests translation
    ↓
Local state update (loading: true)
    ↓
API call via SWR or direct fetch
    ↓
Stream responses (useState for accumulation)
    ↓
Final result cached (SWR) or stored
```

### Cross-Component Communication
```
Component A updates Zustand store
    ↓
Store notifies all subscribers
    ↓
Component B automatically re-renders
```

## Storage Persistence

### Settings Persistence
- **Desktop (Tauri)**: Uses Tauri store or file system
- **Browser Extension**: `chrome.storage.sync` or `chrome.storage.local`
- **Abstraction layer**: `src/common/utils.ts` likely has `getSettings()` and `setSettings()`

### Database (Dexie)
**Use Cases**:
- Vocabulary storage
- Translation history
- Offline data
- Large datasets

**Pattern**:
```typescript
import { useLiveQuery } from 'dexie-react-hooks'

const items = useLiveQuery(() => db.vocabulary.toArray())
```

## Why Multiple Libraries?

### Design Philosophy
Each library excels at different things:
- **Jotai**: Atomic updates, derived state
- **Zustand**: Global state, simple API
- **SWR**: Remote data, caching
- **React Hooks**: Local state, built-in

### Benefits
1. **Right Tool for the Job**: Choose based on requirements
2. **Performance**: Minimal re-renders with atomic/selector approaches
3. **Developer Experience**: Simple APIs, less boilerplate
4. **Bundle Size**: Each library is small (~1-3KB)

### Trade-offs
1. **Learning Curve**: Developers need to know multiple libraries
2. **Consistency**: Need conventions for which library to use when
3. **Debugging**: Different devtools for different libraries

## State Management Best Practices (Inferred)

### Separation of Concerns
- UI state: Local (useState)
- Feature state: Jotai (atoms)
- Global state: Zustand
- Server data: SWR

### Minimal State
- Derive values when possible (computed properties)
- Don't duplicate state
- Single source of truth

### Immutability
- Never mutate state directly
- Use spread operators or libraries like immer
- Zustand and Jotai handle immutability

### Type Safety
All state is TypeScript-typed:
```typescript
interface AppState {
    settings: ISettings
    theme: ThemeType
    // ...
}
```

## Performance Optimizations

### Selective Subscriptions
Zustand allows subscribing to specific parts:
```typescript
const apiKey = useStore((state) => state.settings.apiKey)
// Only re-renders when apiKey changes
```

### Memoization
- `useMemo` for expensive computations
- `useCallback` for stable function references
- Prevents unnecessary re-renders

### Lazy Loading
- Initialize state only when needed
- Async state initialization
- Code splitting for large state logic