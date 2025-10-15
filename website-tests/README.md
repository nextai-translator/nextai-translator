# Website Tests - TDD Red Phase

This directory contains test scaffolding for the "Add website" project. These tests are intentionally written to **fail** as part of the TDD (Test-Driven Development) red phase.

## Purpose

These tests define the expected behavior of the marketing website before implementation begins. They serve as:

1. **Specification**: Clear documentation of what needs to be built
2. **Acceptance Criteria**: Tests that must pass for features to be considered complete
3. **Development Guide**: Developers know exactly what to implement

## Test Structure

```
website-tests/
├── unit/                      # Component-level tests
│   ├── hero-section.test.ts   # Hero section component tests
│   ├── language-switcher.test.ts  # Language switcher tests
│   └── platform-card.test.ts  # Platform download card tests
├── integration/               # Integration tests
│   ├── github-api.test.ts     # GitHub Releases API integration
│   └── platform-detection.test.ts  # User platform detection
└── e2e/                       # End-to-end tests
    ├── homepage.spec.ts       # Homepage user journey
    ├── download.spec.ts       # Download section functionality
    └── i18n.spec.ts           # Language switching flow
```

## Running Tests

These tests are designed to work with the project's existing test infrastructure:

### Unit & Integration Tests (Vitest)
```bash
# Run all Vitest tests (will fail in red phase)
pnpm test

# Run specific test file
pnpm test website-tests/unit/hero-section.test.ts

# Watch mode for TDD workflow
pnpm test --watch
```

### E2E Tests (Playwright)
```bash
# Run E2E tests (will fail until website is deployed)
pnpm test:e2e website-tests/e2e/

# Run specific spec
pnpm test:e2e website-tests/e2e/homepage.spec.ts

# Run with UI
pnpm test:e2e --ui
```

## Test Scenarios Coverage

These tests cover the 12 main scenarios from SCENARIOS_TO_BUILD.json:

1. **Homepage Hero Section** - Value proposition, CTAs, statistics display
2. **Multi-Platform Downloads** - Platform detection, download links, GitHub API
3. **Internationalization** - English/Chinese switching, browser detection
4. **Features Showcase** - Core features, AI providers, unique capabilities
5. **Responsive Design** - Mobile, tablet, desktop layouts
6. **SEO Optimization** - Meta tags, Open Graph, sitemap
7. **Performance** - Core Web Vitals, load times
8. **Accessibility** - WCAG 2.1 AA compliance, keyboard navigation
9. **Documentation Hub** - Installation guides, API setup, FAQ
10. **Analytics** - Privacy-focused tracking, event logging
11. **Footer & Legal** - Footer links, privacy policy, terms of service
12. **Deployment** - CI/CD pipeline, HTTPS, CDN

## TDD Workflow

### Red Phase (Current)
✅ **Tests written** - All tests exist and fail
❌ **Implementation missing** - No website code exists yet

### Green Phase (Next)
- Implement minimal code to make tests pass
- Create Next.js project structure
- Build components and pages
- Run tests frequently: `pnpm test --watch`

### Refactor Phase (Later)
- Improve code quality without breaking tests
- Optimize performance
- Enhance UX
- Tests continue to pass

## Implementation Checklist

When implementing the website, use these tests as your guide:

- [ ] Set up Next.js project with TypeScript
- [ ] Configure Tailwind CSS for styling
- [ ] Set up react-i18next for internationalization
- [ ] Create homepage with hero section component
- [ ] Build download section with platform cards
- [ ] Implement GitHub API integration for versions
- [ ] Add platform detection logic
- [ ] Create language switcher component
- [ ] Build features showcase section
- [ ] Implement responsive design breakpoints
- [ ] Add SEO meta tags and Open Graph
- [ ] Set up Plausible/Fathom analytics
- [ ] Create footer and legal pages
- [ ] Configure deployment pipeline (Vercel/Netlify)
- [ ] Run all tests and fix failures

## Expected Test Results (Red Phase)

All tests should **FAIL** with messages like:

```
❌ Hero Section Component > should render the main value proposition heading
   Expected: false
   Received: true

❌ Platform Detection > should detect Windows from user agent
   Expected: false
   Received: true
```

This is **correct behavior** for the red phase. Once implementation begins, these failures will guide development.

## Notes

- Tests use `expect(true).toBe(false)` for intentional failures in red phase
- E2E tests expect `http://localhost:3000` - update URL when deployed
- GitHub API tests will need mock data for hermetic testing
- Accessibility tests may require manual verification with screen readers
- Performance tests should run in CI with consistent environment

## Related Documents

- `SCENARIOS_TO_BUILD.json` - Full scenario definitions with test cases
- `CODE_SIMULATIONS.json` - Legacy format (same content)
- PRD document - Business requirements and user stories
- Technical Design Specification - Implementation guidelines
