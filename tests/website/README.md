# nextai translator Official Website - Test Suite

This directory contains comprehensive test scaffolding for the official website project, following Test-Driven Development (TDD) methodology.

## Current Status: TDD RED PHASE ⚠️

All tests in this directory are currently in **TDD RED phase**, meaning:
- Tests are written BEFORE implementation
- All tests use `it.fails()` to indicate they should fail until implementation is complete
- Tests define the expected behavior and requirements
- Implementation should be driven by making these tests pass

## Test Coverage

This test suite covers all requirements from the PRD:

### Functional Requirements
- ✅ **homepage.test.ts** - REQ-1: Homepage and Product Overview (9 tests)
- ✅ **download.test.ts** - REQ-2: Download Center (10 tests)
- ✅ **features.test.ts** - REQ-3: Features & Capabilities Page (12 tests)
- ✅ **getting-started.test.ts** - REQ-4: Getting Started Guide (9 tests)
- ✅ **docs.test.ts** - REQ-5: Documentation Section (10 tests)
- ✅ **support.test.ts** - REQ-6: Support and Community (8 tests)
- ✅ **about.test.ts** - REQ-7: About Page (8 tests)

### Non-Functional Requirements
- ✅ **performance.test.ts** - NFR-1: Performance (17 tests)
- ✅ **responsive.test.ts** - NFR-2: Responsive Design (11 tests)
- ✅ **accessibility.test.ts** - NFR-4: Accessibility WCAG 2.1 AA (15 tests)
- ✅ **seo.test.ts** - NFR-5: SEO Optimization (13 tests)
- ✅ **i18n.test.ts** - NFR-6: Internationalization (15 tests)

### Total Test Coverage
- **12 test files**
- **137 comprehensive tests**
- **All PRD requirements covered**

## Running the Tests

### Run all website tests:
```bash
pnpm vitest run --dir . tests/website
```

### Run specific test file:
```bash
pnpm vitest run --dir . tests/website/homepage.test.ts
```

### Watch mode during development:
```bash
pnpm vitest --dir . tests/website
```

## Test Structure

Each test file follows this structure:

```typescript
import { describe, expect, it } from 'vitest'

describe('Feature Name - Description', () => {
    it.fails('should implement specific behavior', () => {
        // Implementation pending - TDD red phase
        // Expected: Description of expected behavior
        expect(false).toBe(true) // Will fail until implemented
    })
})
```

## Converting from RED to GREEN Phase

When implementing the website:

1. **Remove `it.fails()`**: Change `it.fails('should...')` to `it('should...')`
2. **Implement the feature**: Build the actual website component/page
3. **Update test logic**: Replace placeholder assertions with real tests
4. **Run tests**: Ensure tests pass with `pnpm vitest run --dir . tests/website`
5. **Update status**: Mark scenarios as "pass" in `.something/SCENARIOS_TO_BUILD.json`

### Example Conversion

**Before (RED phase):**
```typescript
it.fails('should render homepage with correct title', () => {
    expect(false).toBe(true)
})
```

**After (GREEN phase):**
```typescript
it('should render homepage with correct title', () => {
    const { getByText } = render(<Homepage />)
    expect(getByText(/nextai translator/i)).toBeInTheDocument()
})
```

## Test Categories

### Unit Tests
Test individual components in isolation:
- Button components
- Form validation
- Language switcher logic
- SEO meta tag generation

### Integration Tests
Test how components work together:
- Page rendering with data
- Form submission flows
- Navigation between pages
- API interactions

### E2E Tests
Test complete user flows:
- Download flow from homepage to store
- Getting started guide walkthrough
- Documentation search and navigation
- Language switching experience

### Performance Tests
Validate performance requirements:
- Lighthouse audits
- Core Web Vitals (LCP, FID, CLS)
- Bundle size limits
- Image optimization

### Accessibility Tests
Ensure WCAG 2.1 AA compliance:
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios
- ARIA labels and semantic HTML

## Key Testing Principles

1. **Comprehensive Coverage**: Every PRD requirement has corresponding tests
2. **TDD Approach**: Tests written before implementation
3. **Clear Expectations**: Each test clearly states expected behavior
4. **Maintainable**: Tests are organized by feature/page
5. **Realistic**: Tests validate actual user scenarios

## Technology Stack

- **Test Runner**: Vitest (compatible with existing project setup)
- **Test Library**: React Testing Library (for component tests)
- **E2E Testing**: Playwright (for end-to-end tests)
- **Accessibility**: axe-core (for a11y audits)
- **Performance**: Lighthouse CI (for performance audits)

## Next Steps

1. **Choose Website Framework**: Next.js, Astro, or VuePress (as per PRD)
2. **Set Up Project Structure**: Create `website/` directory with chosen framework
3. **Start Implementation**: Begin with homepage (Scenario 1)
4. **Convert Tests**: Remove `it.fails()` and implement real assertions
5. **Achieve GREEN**: Make tests pass by implementing features
6. **Refactor**: Clean up implementation while keeping tests green

## Related Documentation

- **PRD**: `.something/prd.md` - Complete product requirements
- **Scenarios**: `.something/SCENARIOS_TO_BUILD.json` - Detailed test scenarios
- **Test Results**: `.something/TEST_RESULTS.json` - Current test status
- **Main README**: `README.md` - Project overview and setup

## Questions or Issues?

If tests need clarification or modification:
1. Review the corresponding scenario in `.something/SCENARIOS_TO_BUILD.json`
2. Check the PRD requirement being tested
3. Update tests to match refined requirements
4. Ensure all stakeholders agree on expected behavior

---

**Remember**: These tests are your specification. When all tests pass, the website meets all PRD requirements! 🎯
