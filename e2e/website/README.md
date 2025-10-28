# Official Website Test Suite

## Overview

This directory contains comprehensive test scenarios for the nextai Translator official website feature. These tests are written in **TDD RED PHASE**, meaning they will fail until the implementation is complete.

## Test Status

🔴 **TDD RED PHASE** - All tests are expected to fail until the website is implemented.

## Test Structure

### E2E Tests (Playwright)

1. **homepage.spec.ts** - Homepage test scenarios
   - Hero Section (FR-1.1)
   - Feature Highlights (FR-1.2)
   - Platform Showcase (FR-1.3)
   - Social Proof (FR-1.4)
   - Latest Updates (FR-1.5)
   - Navigation and Footer

2. **download.spec.ts** - Download Center test scenarios
   - Platform Selection (FR-2.1)
   - Windows Downloads (FR-2.2)
   - macOS Downloads (FR-2.2)
   - Linux Downloads (FR-2.2)
   - Browser Extensions (FR-2.3)
   - Alternative Installation Methods (FR-2.4)
   - Release Notes (FR-2.5)

3. **documentation.spec.ts** - Documentation test scenarios
   - Getting Started Guide (FR-3.1)
   - Feature Documentation (FR-3.2)
   - Configuration Guides (FR-3.3)
   - Troubleshooting (FR-3.4)
   - FAQ (FR-3.5)
   - Navigation and Content Quality

4. **performance-accessibility.spec.ts** - Performance & Accessibility
   - Page Load Time (NFR-1.1)
   - Image Optimization (NFR-1.2)
   - Code Optimization (NFR-1.3)
   - WCAG 2.1 Level AA Compliance (NFR-2.1)
   - Screen Reader Compatibility
   - Responsive Design (NFR-2.2)
   - Core Web Vitals (NFR-4.2)

5. **seo-i18n.spec.ts** - SEO & Internationalization
   - Meta Tags and Structure (NFR-4.1)
   - Structured Data
   - Sitemap and Robots.txt
   - Internal Linking
   - Multi-language Support (NFR-5.1)
   - Language Switching (NFR-5.2)
   - Security Headers (NFR-6.2)

## Running Tests

### Prerequisites

Ensure the website is running locally or set the `WEBSITE_URL` environment variable:

```bash
export WEBSITE_URL=http://localhost:3000
```

### Run All E2E Tests

```bash
# Run all website tests
pnpm test:e2e e2e/website/

# Run specific test file
pnpm test:e2e e2e/website/homepage.spec.ts

# Run with UI mode
pnpm playwright test e2e/website/ --ui

# Run in headed mode (see browser)
pnpm playwright test e2e/website/ --headed
```

### Run Tests by Category

```bash
# Homepage tests
pnpm playwright test e2e/website/homepage.spec.ts

# Download center tests
pnpm playwright test e2e/website/download.spec.ts

# Documentation tests
pnpm playwright test e2e/website/documentation.spec.ts

# Performance & Accessibility tests
pnpm playwright test e2e/website/performance-accessibility.spec.ts

# SEO & i18n tests
pnpm playwright test e2e/website/seo-i18n.spec.ts
```

## Test Coverage

### Functional Requirements Covered

| Requirement | Description | Test File | Status |
|-------------|-------------|-----------|--------|
| FR-1.1 | Hero Section | homepage.spec.ts | ⏳ Pending |
| FR-1.2 | Feature Highlights | homepage.spec.ts | ⏳ Pending |
| FR-1.3 | Platform Showcase | homepage.spec.ts | ⏳ Pending |
| FR-1.4 | Social Proof | homepage.spec.ts | ⏳ Pending |
| FR-1.5 | Latest Updates | homepage.spec.ts | ⏳ Pending |
| FR-2.1 | Platform Selection | download.spec.ts | ⏳ Pending |
| FR-2.2 | Desktop Downloads | download.spec.ts | ⏳ Pending |
| FR-2.3 | Browser Extensions | download.spec.ts | ⏳ Pending |
| FR-2.4 | Alternative Installations | download.spec.ts | ⏳ Pending |
| FR-2.5 | Release Notes | download.spec.ts | ⏳ Pending |
| FR-3.1 | Getting Started Guide | documentation.spec.ts | ⏳ Pending |
| FR-3.2 | Feature Documentation | documentation.spec.ts | ⏳ Pending |
| FR-3.3 | Configuration Guides | documentation.spec.ts | ⏳ Pending |
| FR-3.4 | Troubleshooting | documentation.spec.ts | ⏳ Pending |
| FR-3.5 | FAQ | documentation.spec.ts | ⏳ Pending |

### Non-Functional Requirements Covered

| Requirement | Description | Test File | Status |
|-------------|-------------|-----------|--------|
| NFR-1.1 | Page Load Time < 3s | performance-accessibility.spec.ts | ⏳ Pending |
| NFR-1.2 | Image Optimization | performance-accessibility.spec.ts | ⏳ Pending |
| NFR-1.3 | Code Splitting | performance-accessibility.spec.ts | ⏳ Pending |
| NFR-2.1 | WCAG 2.1 Level AA | performance-accessibility.spec.ts | ⏳ Pending |
| NFR-2.2 | Responsive Design | performance-accessibility.spec.ts | ⏳ Pending |
| NFR-4.1 | SEO Best Practices | seo-i18n.spec.ts | ⏳ Pending |
| NFR-4.2 | Core Web Vitals | performance-accessibility.spec.ts | ⏳ Pending |
| NFR-5.1 | Multi-language Support | seo-i18n.spec.ts | ⏳ Pending |
| NFR-5.2 | Language Switching | seo-i18n.spec.ts | ⏳ Pending |
| NFR-6.2 | Security Headers | seo-i18n.spec.ts | ⏳ Pending |

## Test Data

### Test IDs Convention

All tests use `data-testid` attributes for reliable element selection:

```tsx
// Example usage in components
<button data-testid="hero-primary-cta">Download</button>
<section data-testid="features-section">...</section>
<div data-testid="platform-option-windows">Windows</div>
```

### Common Test IDs

#### Homepage
- `hero-headline` - Main headline
- `hero-primary-cta` - Primary download button
- `hero-secondary-cta` - Secondary CTA
- `platform-indicators` - Platform badges
- `features-section` - Features section
- `feature-card` - Individual feature card
- `platform-showcase` - Platform showcase section

#### Navigation
- `main-header` - Site header
- `site-logo` - Logo link
- `language-selector` - Language switcher
- `mobile-menu-button` - Mobile menu toggle
- `main-footer` - Site footer

#### Download Page
- `platform-selector` - Platform tabs/selector
- `platform-option-{platform}` - Platform option (e.g., `platform-option-windows`)
- `download-{platform}-{format}` - Download link (e.g., `download-windows-exe`)
- `{platform}-requirements` - System requirements
- `{platform}-instructions` - Installation instructions

#### Documentation
- `docs-sidebar` - Documentation sidebar
- `docs-content` - Main documentation content
- `docs-search` - Documentation search
- `table-of-contents` - Page TOC
- `breadcrumbs` - Breadcrumb navigation

## Expected Failures

Since this is TDD RED PHASE, all tests are expected to fail with errors like:

- `locator.toBeVisible: Error: Target closed`
- `expect.toBeVisible: Timeout exceeded`
- `404 Not Found`
- Missing elements with specified test IDs

This is **normal and expected** until the website is implemented.

## Implementation Checklist

### Phase 1: MVP (Week 1-4)

- [ ] Set up Next.js project structure
- [ ] Implement homepage with all sections
- [ ] Implement download center
- [ ] Create basic documentation pages
- [ ] Add navigation and footer
- [ ] Implement responsive design
- [ ] Run tests and fix failures

### Phase 2: Enhanced Content (Week 5-6)

- [ ] Complete all documentation pages
- [ ] Add FAQ section
- [ ] Implement search functionality
- [ ] Add multi-language support
- [ ] Create blog infrastructure
- [ ] Run tests and fix failures

### Phase 3: Optimization (Week 7-8)

- [ ] Optimize performance (images, code splitting)
- [ ] Ensure WCAG compliance
- [ ] Implement SEO best practices
- [ ] Add analytics
- [ ] Run all tests and ensure they pass

## Contributing

When implementing features:

1. Read the corresponding test file to understand requirements
2. Implement features with proper `data-testid` attributes
3. Run tests frequently: `pnpm playwright test e2e/website/`
4. Fix failing tests until all pass
5. Add additional tests for edge cases

## References

- [PRD Document](/.something/prd.md)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Notes

- All tests include detailed comments explaining what they verify
- Tests are organized by functional and non-functional requirements
- Each test file focuses on specific aspects of the website
- Tests use realistic user interactions and expectations
- Performance tests include actual metrics measurement where possible
