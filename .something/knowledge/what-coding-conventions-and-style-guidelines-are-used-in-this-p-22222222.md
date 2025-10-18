# UUID
a760e13b-26ce-41da-9b93-b2b78fed73e4

# Trigger
What coding conventions and style guidelines are used in this project?

# Content
## Coding Conventions

### TypeScript Configuration
**Location**: `tsconfig.json`

Key settings:
- **Strict Mode**: Enabled (`"strict": true`)
- **Target**: ES2017
- **Module**: ESNext
- **JSX**: `react-jsx` (new JSX transform, no React import needed)
- **Module Resolution**: Node
- **Source Maps**: Disabled in production
- **Skip Lib Check**: True for faster builds

Path aliases:
```typescript
"@/*": ["./src/*"]
```

### ESLint Rules
**Location**: `.eslintrc.js`

#### Core Rules
- **camelCase**: Required (`camelcase: 'error'`)
- **Strict Equality**: Always use `===` (`eqeqeq: ['error', 'always']`)
- **No Duplicate Imports**: Enforced
- **Spaced Comments**: Required (`// comment` not `//comment`)

#### React Rules
- **React in JSX Scope**: Off (not needed with new JSX transform)
- **Hooks Rules**: Strictly enforced
- **Exhaustive Deps**: Enforced for useEffect/useCallback

#### Prettier Integration
- Prettier violations are errors
- Auto-formatting on save recommended

### Prettier Configuration
**Location**: `.prettierrc.js`

Formatting rules:
- **Single Quotes**: Yes (for JS/TS)
- **JSX Single Quotes**: Yes
- **Semicolons**: No
- **Trailing Commas**: ES5
- **Tab Width**: 4 spaces
- **Use Tabs**: No
- **Print Width**: 120 characters
- **Bracket Spacing**: Yes
- **Quote Props**: Consistent

### Git Hooks
**Pre-commit Hook**:
- Runs ESLint on staged files
- Runs Prettier on staged files
- Configured via `simple-git-hooks` and `lint-staged`

### Naming Conventions

#### Files
- **Components**: PascalCase (e.g., `Translator.tsx`, `Settings.tsx`)
- **Utilities**: camelCase (e.g., `utils.ts`, `translate.ts`)
- **Types**: camelCase (e.g., `types.ts`)
- **Config**: kebab-case (e.g., `.eslintrc.js`, `vite.config.ts`)

#### Code
- **Variables/Functions**: camelCase
- **Constants**: camelCase or UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **Interface prefix**: Use `I` prefix (e.g., `ISettings`, `IEngine`)

### Import Organization
Resolved via TypeScript path mapping:
```typescript
import { something } from '@/common/utils'
```

### Comment Style
```typescript
// Single line comments with space after //

/* eslint-disable camelcase */  // Directive comments
```

### Type Safety
- Avoid `any` types when possible
- Use explicit types for function parameters and returns
- Leverage TypeScript's type inference where clear
- Comment with `/* eslint-disable @typescript-eslint/no-explicit-any */` when `any` is necessary