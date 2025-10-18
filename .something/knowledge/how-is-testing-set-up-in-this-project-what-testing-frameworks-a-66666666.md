# UUID
3464d2f7-1ad8-47c4-9ead-3ebf550fad42

# Trigger
How is testing set up in this project? What testing frameworks are used?

# Content
## Testing Strategy

The project uses multiple testing approaches for different aspects.

## Unit Testing

### Framework: Vitest
**Configuration**: `vite.config.ts`

```typescript
{
    test: {
        globals: true,          // No need to import describe/it/expect
        environment: 'jsdom',   // Simulate browser environment
        root: 'src',           // Tests co-located with source
    }
}
```

### Running Tests
```bash
pnpm test
```

### Test Location
Tests are located in:
- `src/common/__tests__/` - Unit tests for common code
- Co-located with source files (likely `*.test.ts` or `*.spec.ts`)

### Test Environment
- **jsdom** - Simulates browser DOM
- **globals: true** - describe/it/expect available without imports
- React component testing support

## End-to-End Testing

### Framework: Playwright
**Configuration**: `playwright.config.ts`

### Running E2E Tests
```bash
pnpm test:e2e
```

### Test Location
- `e2e/` directory - End-to-end test suites

### Playwright Features
- Cross-browser testing (Chromium, Firefox, WebKit)
- Real browser automation
- Screenshots and videos on failure
- API testing capabilities

## Testing Scope

### What Should Be Tested

#### Unit Tests (Vitest)
- Utility functions (`src/common/utils.ts`)
- Translation logic (`src/common/translate.ts`)
- Engine implementations
- React components (with React Testing Library likely)
- Data transformations
- Business logic

#### E2E Tests (Playwright)
- Complete user flows
- Browser extension functionality
- Desktop app features
- Translation workflows
- Settings management
- Integration between components

## Test Utilities

### For React Components
Likely uses:
- **@testing-library/react** (not in package.json, but common with Vitest)
- Component rendering
- User interaction simulation
- Assertion helpers

### Mocking
- Mock API responses
- Mock browser APIs
- Mock Tauri commands
- Stub dependencies

## Coverage

No explicit coverage tool in package.json, but Vitest has built-in coverage:
```bash
pnpm test -- --coverage
```

## Continuous Integration

Tests likely run in CI/CD:
- Pre-commit hooks (lint-staged runs linting)
- GitHub Actions (`.github/` directory exists)
- Automated testing on PRs

## Testing Best Practices (Inferred)

### Isolation
- Tests don't depend on each other
- Clean state for each test
- Mock external dependencies

### Speed
- Unit tests are fast (Vitest is fast)
- E2E tests may be slower but comprehensive

### Reliability
- No flaky tests
- Deterministic results
- Proper async handling

## Development Workflow

### Test-Driven Development (Optional)
```bash