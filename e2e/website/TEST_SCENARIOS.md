# Official Website Test Scenarios

## Document Information
- **Project**: nextai Translator Official Website
- **Phase**: TDD RED PHASE
- **Status**: Tests are scaffolded and will fail until implementation is complete
- **Last Updated**: 2025-10-28

---

## Overview

This document outlines comprehensive test scenarios for the official website of nextai Translator based on the Product Requirements Document (PRD). All tests are written in **TDD RED PHASE**, meaning they are designed to fail initially and will pass once the features are implemented.

### Test Coverage Structure

```
e2e/website/
├── homepage.spec.ts              # Homepage functionality (FR-1.1 to FR-1.5)
├── download.spec.ts              # Download center (FR-2.1 to FR-2.5)
├── documentation.spec.ts         # Documentation pages (FR-3.1 to FR-3.5)
├── seo-i18n.spec.ts             # SEO and internationalization (NFR-4.1, NFR-5.1)
├── performance-accessibility.spec.ts  # Performance and accessibility (NFR-1.1, NFR-2.1)
├── features.spec.ts             # Features page (FR-4.1, FR-4.2)
├── about-community.spec.ts      # About and community pages (FR-5.1, FR-5.2, FR-7.1)
├── blog.spec.ts                 # Blog and news section (FR-6.1, FR-6.2)
└── legal.spec.ts                # Privacy, terms, license pages (FR-9.1 to FR-9.3)

src/common/__tests__/
└── website-utils.test.ts        # Unit tests for utility functions
```

---

## Test Scenario Summary

### 1. Homepage Tests (FR-1.x)
**File**: `e2e/website/homepage.spec.ts`
**Status**: ✅ Implemented (400 lines)

#### Covered Scenarios:
- **Hero Section (FR-1.1)**
  - Display tagline and value proposition
  - Primary CTA with platform auto-detection
  - Secondary CTA for browser extension
  - Platform indicators
  - Hero image/demo showcase

- **Feature Highlights (FR-1.2)**
  - Display all 8 major features
  - Feature cards with icons and descriptions
  - Translation, polishing, summarization modes
  - Language support, cross-platform, screenshot translation
  - Vocabulary books and TTS features

- **Platform Showcase (FR-1.3)**
  - Screenshots for desktop and browser platforms
  - Platform-specific download CTAs
  - Platform selection tabs/cards

- **Social Proof (FR-1.4)**
  - GitHub stars count with link
  - Chrome Web Store and Firefox ratings
  - Open Source badge
  - Download/user metrics

- **Latest Updates (FR-1.5)**
  - Recent blog posts or releases
  - Dates and titles
  - Link to full blog/changelog

- **Navigation**
  - Sticky header with logo and nav links
  - Language selector
  - Mobile hamburger menu
  - Download button in header

- **Footer**
  - Multi-column layout
  - Product, Resources, Community, Legal sections
  - Copyright and social icons

- **Performance**
  - Page load time < 5s
  - Image optimization with lazy loading

---

### 2. Download Center Tests (FR-2.x)
**File**: `e2e/website/download.spec.ts`
**Status**: ✅ Implemented (400 lines)

#### Covered Scenarios:
- **Platform Selection (FR-2.1)**
  - Automatic platform detection
  - Manual platform selector
  - Version number display
  - Platform switching functionality

- **Desktop Downloads (FR-2.2)**
  - **Windows**: .exe installer, system requirements, security warnings
  - **macOS**: Apple Silicon and Intel downloads, quarantine instructions, privacy settings
  - **Linux**: Multiple format support, installation instructions

- **Browser Extensions (FR-2.3)**
  - Chrome Web Store link
  - Firefox Add-ons link
  - Extension version numbers
  - Browser requirements
  - Manual installation guide

- **Alternative Installation (FR-2.4)**
  - Clip extensions guide
  - Userscript installation
  - Package managers (Homebrew, Chocolatey)
  - Build from source instructions

- **Release Notes (FR-2.5)**
  - Latest release notes display
  - Features, fixes, improvements
  - Full changelog link
  - GitHub releases link
  - Release date display

- **Download Tracking**
  - Analytics event tracking
  - Proper button attributes

- **Responsive Design**
  - Mobile, tablet, desktop layouts

---

### 3. Documentation Tests (FR-3.x)
**File**: `e2e/website/documentation.spec.ts`
**Status**: ✅ Implemented (473 lines)

#### Covered Scenarios:
- **Getting Started Guide (FR-3.1)**
  - Installation walkthrough per platform
  - API key acquisition (OpenAI and Azure)
  - Initial configuration steps
  - First translation walkthrough
  - Screenshots for each step

- **Feature Documentation (FR-3.2)**
  - Translation, polishing, summarization guides
  - Screenshot translation guide
  - Vocabulary books guide
  - TTS configuration
  - Keyboard shortcuts reference
  - Settings overview

- **Configuration Guides (FR-3.3)**
  - OpenAI configuration (API URL, model selection)
  - Azure OpenAI configuration (resource, deployment, API version)
  - API proxy setup
  - Custom translation prompts
  - Clip extensions setup
  - Autostart configuration
  - Shortcut customization

- **Troubleshooting (FR-3.4)**
  - macOS security and permission problems
  - Windows installation issues
  - Linux compatibility issues
  - API connection problems
  - Extension issues
  - Performance optimization
  - Error message reference

- **FAQ (FR-3.5)**
  - Categorized questions (General, Installation, Features, Troubleshooting, Privacy, Pricing)
  - Search functionality
  - Expandable answers
  - Sufficient FAQ content (10+ items)

- **Navigation**
  - Sidebar navigation with active states
  - Table of contents for long pages
  - Breadcrumb navigation
  - Previous/Next page links
  - "Edit on GitHub" link
  - Search functionality

- **Content Quality**
  - Code blocks with syntax highlighting
  - Copy button for code blocks
  - Images with alt text
  - Proper heading hierarchy

- **Responsive Design**
  - Mobile sidebar toggle
  - Collapsible sidebar

---

### 4. SEO and Internationalization Tests (NFR-4.x, NFR-5.x)
**File**: `e2e/website/seo-i18n.spec.ts`
**Status**: ✅ Implemented (501 lines)

#### Covered Scenarios:
- **Meta Tags and Structure (NFR-4.1)**
  - HTML lang attribute
  - Title tag (10-70 chars)
  - Meta description (50-160 chars)
  - Meta viewport for mobile
  - Canonical URL
  - Open Graph tags (title, description, image, URL, type)
  - Twitter Card tags
  - Single H1 tag per page
  - Semantic HTML5 elements (header, nav, main, footer)

- **Structured Data (NFR-4.1)**
  - JSON-LD structured data
  - Organization schema
  - WebSite schema with search action

- **Sitemap and Robots (NFR-4.1)**
  - sitemap.xml availability
  - robots.txt availability
  - robots.txt references sitemap

- **Internal Linking**
  - No broken internal links
  - Descriptive anchor text (avoid "click here")

- **SEO per Page**
  - Unique titles for each page
  - Unique meta descriptions for each page

- **Multi-language Support (NFR-5.1, NFR-5.2)**
  - Language selector visibility
  - English language support
  - Chinese (Simplified) language support
  - Hreflang tags for language alternates
  - URL updates on language change
  - Language selection persistence
  - Translated navigation items
  - Footer language toggle
  - Translated content (homepage and docs)

- **Performance for SEO**
  - Server-side rendering or static generation
  - Minimal redirects (≤ 1)
  - Proper HTTP status codes (200, 404)

- **Security Headers (NFR-6.2)**
  - X-Frame-Options
  - X-Content-Type-Options
  - HTTPS protocol in production

---

### 5. Performance and Accessibility Tests (NFR-1.x, NFR-2.x)
**File**: `e2e/website/performance-accessibility.spec.ts`
**Status**: ✅ Implemented (see below)

#### Covered Scenarios:
- **Performance (NFR-1.1)**
  - Page load time < 3s on 4G connection
  - Image optimization with lazy loading
  - Code splitting and bundle size < 200KB
  - Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
  - Lighthouse performance score > 90

- **Accessibility (NFR-2.1)**
  - WCAG 2.1 Level AA compliance
  - Keyboard navigation support
  - Screen reader compatibility
  - Color contrast ratios (4.5:1 minimum)
  - Alt text for all images
  - Semantic HTML structure
  - ARIA labels where needed

- **Responsive Design (NFR-2.1)**
  - Mobile (320px-767px)
  - Tablet (768px-1023px)
  - Desktop (1024px+)
  - 4K displays

- **Browser Compatibility (NFR-3.1)**
  - Chrome/Edge (last 2 versions)
  - Firefox (last 2 versions)
  - Safari (last 2 versions)
  - Opera (last 2 versions)

---

### 6. Features Page Tests (FR-4.x)
**File**: `e2e/website/features.spec.ts`
**Status**: ⏳ To be created

#### Scenarios to Cover:
- **Detailed Feature Showcase (FR-4.1)**
  - Dedicated section for each major feature
  - Screenshots or GIFs demonstrating features
  - Use cases for each feature
  - Technical specifications
  - Comparison table with competitors (optional)

- **Language Support (FR-4.2)**
  - Complete list of 55+ supported languages
  - Language codes reference
  - Flags or visual indicators
  - Language detection information

---

### 7. About and Community Tests (FR-5.x, FR-7.x)
**File**: `e2e/website/about-community.spec.ts`
**Status**: ⏳ To be created

#### Scenarios to Cover:
- **Project Information (FR-5.1)**
  - Project history and evolution
  - Mission and vision statement
  - Rebranding explanation (OpenAI Translator → nextai Translator)
  - Team information
  - Technology stack overview

- **Open Source Information (FR-5.2)**
  - License information (AGPL-3.0)
  - GitHub repository link
  - Contribution guidelines summary
  - Link to AGENTS.md
  - Code of conduct

- **Support Resources (FR-7.1)**
  - GitHub Issues link
  - GitHub Discussions link
  - Documentation link
  - FAQ link
  - Contact information

- **Community Links (FR-7.2)**
  - GitHub repository link
  - Social media links
  - Community guidelines
  - Ways to contribute
  - Star History showcase

---

### 8. Blog and News Tests (FR-6.x)
**File**: `e2e/website/blog.spec.ts`
**Status**: ⏳ To be created

#### Scenarios to Cover:
- **News and Updates (FR-6.1)**
  - Blog post listing page
  - Individual blog post pages
  - Categories and tags
  - RSS feed
  - Social sharing buttons
  - Search functionality

- **Release Announcements (FR-6.2)**
  - Release announcement template
  - Feature highlights
  - Breaking changes
  - Migration guides
  - Download links

---

### 9. Legal Pages Tests (FR-9.x)
**File**: `e2e/website/legal.spec.ts`
**Status**: ⏳ To be created

#### Scenarios to Cover:
- **Privacy Policy (FR-9.1)**
  - Data collection disclosure
  - API key handling information
  - Analytics usage
  - Third-party services
  - User rights
  - GDPR compliance

- **Terms of Service (FR-9.2)**
  - Usage terms
  - Disclaimers
  - Liability limitations
  - License terms reference

- **License Information (FR-9.3)**
  - Full AGPL-3.0 license text
  - License summary for users
  - Third-party licenses

---

### 10. Utility Functions Tests
**File**: `src/common/__tests__/website-utils.test.ts`
**Status**: ⚠️ Partially implemented (placeholder tests)

#### Scenarios to Cover:
- **Platform Detection**
  - Detect Windows, macOS, Linux
  - Detect Apple Silicon vs Intel on macOS
  - Handle unknown user agents

- **Download URL Formatter**
  - Format GitHub release URLs for each platform
  - Handle version numbers
  - Support "latest" version

- **Language Code Validator**
  - Validate English and Chinese codes
  - Reject invalid codes

- **Version Comparator**
  - Compare semantic versions
  - Handle version prefixes
  - Support pre-release versions

- **Browser Extension Store Link Formatter**
  - Chrome Web Store URLs
  - Firefox Add-ons URLs

- **GitHub API Helper**
  - Format releases API URL
  - Format star count URL

- **Markdown to HTML Converter**
  - Convert markdown to HTML
  - Sanitize HTML output
  - Handle code blocks with syntax highlighting

- **SEO Meta Tag Generator**
  - Generate meta tags for pages
  - Generate structured data JSON-LD

- **Analytics Event Tracker**
  - Track download clicks
  - Track language changes

- **Date Formatter**
  - Format dates in user locale
  - Format relative time

---

## Test Execution Strategy

### Running Tests

```bash
# Unit tests
npm run test                    # Run all unit tests with Vitest
npm run test -- website-utils   # Run specific unit test file

# E2E tests
npm run test:e2e                # Run all E2E tests with Playwright
npm run test:e2e -- homepage    # Run specific E2E test file

# Set custom website URL for E2E tests
WEBSITE_URL=http://localhost:3000 npm run test:e2e
```

### Expected Behavior (TDD RED PHASE)

**Current State**: All tests are expected to **FAIL** because:
1. The website implementation does not exist yet
2. Tests are written based on PRD requirements
3. This is the **TDD RED phase** - tests fail first

**Next Steps**:
1. Implement website features according to PRD
2. Add proper data-testid attributes to components
3. Implement utility functions
4. Tests will gradually turn GREEN as features are completed

### Test Data Requirements

For tests to pass, the implementation should include:
- **data-testid attributes** on all tested elements
- **Consistent naming** as specified in test files
- **Proper HTML structure** with semantic elements
- **Meta tags** for SEO
- **Internationalization** support with language switching
- **Responsive design** for mobile, tablet, desktop
- **Accessibility features** (ARIA labels, keyboard navigation)

---

## Test Coverage Metrics

### Functional Requirements Coverage

| Requirement | Test File | Status | Tests |
|------------|-----------|--------|-------|
| FR-1.1 Hero Section | homepage.spec.ts | ✅ | 6 |
| FR-1.2 Feature Highlights | homepage.spec.ts | ✅ | 3 |
| FR-1.3 Platform Showcase | homepage.spec.ts | ✅ | 5 |
| FR-1.4 Social Proof | homepage.spec.ts | ✅ | 5 |
| FR-1.5 Latest Updates | homepage.spec.ts | ✅ | 4 |
| FR-2.1 Platform Selection | download.spec.ts | ✅ | 4 |
| FR-2.2 Desktop Downloads | download.spec.ts | ✅ | 17 |
| FR-2.3 Browser Extensions | download.spec.ts | ✅ | 6 |
| FR-2.4 Alternative Installation | download.spec.ts | ✅ | 4 |
| FR-2.5 Release Notes | download.spec.ts | ✅ | 5 |
| FR-3.1 Getting Started | documentation.spec.ts | ✅ | 6 |
| FR-3.2 Feature Documentation | documentation.spec.ts | ✅ | 8 |
| FR-3.3 Configuration Guides | documentation.spec.ts | ✅ | 8 |
| FR-3.4 Troubleshooting | documentation.spec.ts | ✅ | 7 |
| FR-3.5 FAQ | documentation.spec.ts | ✅ | 5 |
| FR-4.1 Feature Showcase | features.spec.ts | ⏳ | 0 |
| FR-4.2 Language Support | features.spec.ts | ⏳ | 0 |
| FR-5.1 Project Information | about-community.spec.ts | ⏳ | 0 |
| FR-5.2 Open Source Info | about-community.spec.ts | ⏳ | 0 |
| FR-6.1 News and Updates | blog.spec.ts | ⏳ | 0 |
| FR-6.2 Release Announcements | blog.spec.ts | ⏳ | 0 |
| FR-7.1 Support Resources | about-community.spec.ts | ⏳ | 0 |
| FR-7.2 Community Links | about-community.spec.ts | ⏳ | 0 |
| FR-9.1 Privacy Policy | legal.spec.ts | ⏳ | 0 |
| FR-9.2 Terms of Service | legal.spec.ts | ⏳ | 0 |
| FR-9.3 License Information | legal.spec.ts | ⏳ | 0 |

### Non-Functional Requirements Coverage

| Requirement | Test File | Status | Tests |
|------------|-----------|--------|-------|
| NFR-1.1 Page Load Time | performance-accessibility.spec.ts | ✅ | 5 |
| NFR-1.2 Image Optimization | performance-accessibility.spec.ts | ✅ | 2 |
| NFR-1.3 Code Splitting | performance-accessibility.spec.ts | ✅ | 1 |
| NFR-2.1 WCAG Compliance | performance-accessibility.spec.ts | ✅ | 8 |
| NFR-2.2 Responsive Design | All spec files | ✅ | 12 |
| NFR-3.1 Browser Compatibility | performance-accessibility.spec.ts | ✅ | 4 |
| NFR-4.1 SEO Best Practices | seo-i18n.spec.ts | ✅ | 20 |
| NFR-4.2 Core Web Vitals | performance-accessibility.spec.ts | ✅ | 3 |
| NFR-5.1 Multi-language Support | seo-i18n.spec.ts | ✅ | 8 |
| NFR-5.2 Language Switching | seo-i18n.spec.ts | ✅ | 5 |
| NFR-6.1 HTTPS Only | seo-i18n.spec.ts | ✅ | 1 |
| NFR-6.2 Security Headers | seo-i18n.spec.ts | ✅ | 2 |

**Total Test Coverage:**
- ✅ **Implemented**: 160+ test scenarios across 5 files
- ⏳ **Pending**: 40+ test scenarios across 4 files
- **Overall**: ~80% of PRD requirements covered by test scenarios

---

## Implementation Checklist

### For Developers Implementing Features:

When implementing a feature, ensure you:

1. **Add data-testid attributes** to match test expectations:
   ```tsx
   <div data-testid="hero-headline">The translator that does more...</div>
   <button data-testid="hero-primary-cta">Download</button>
   ```

2. **Follow semantic HTML structure**:
   ```tsx
   <header data-testid="main-header">
     <nav>...</nav>
   </header>
   <main>
     <section data-testid="features-section">...</section>
   </main>
   <footer data-testid="main-footer">...</footer>
   ```

3. **Implement meta tags** for SEO:
   ```tsx
   <Head>
     <title>Page Title</title>
     <meta name="description" content="..." />
     <meta property="og:title" content="..." />
     <link rel="canonical" href="..." />
   </Head>
   ```

4. **Add internationalization** support:
   ```tsx
   <html lang={locale}>
   <select data-testid="language-selector">
     <option data-testid="language-option-en">English</option>
     <option data-testid="language-option-zh">中文</option>
   </select>
   ```

5. **Ensure accessibility**:
   ```tsx
   <img src="..." alt="Descriptive text" />
   <button aria-label="Close menu">X</button>
   <nav aria-label="Main navigation">...</nav>
   ```

6. **Optimize performance**:
   - Use Next.js Image component
   - Implement lazy loading
   - Code splitting
   - Static generation where possible

7. **Run tests** as you implement:
   ```bash
   npm run test:e2e -- homepage
   ```

---

## Maintenance and Updates

### When to Update Tests:

1. **PRD Changes**: If requirements change, update corresponding tests
2. **New Features**: Add new test files/scenarios for new features
3. **Bug Fixes**: Add regression tests for fixed bugs
4. **Refactoring**: Update tests if component structure changes

### Test Review Checklist:

- [ ] All test descriptions are clear and descriptive
- [ ] data-testid values are consistent and meaningful
- [ ] Tests cover both happy paths and error cases
- [ ] Tests are independent and can run in any order
- [ ] Timeouts and waits are appropriate
- [ ] Tests follow the existing pattern and structure

---

## Conclusion

This comprehensive test suite ensures that the nextai Translator official website will meet all PRD requirements. The TDD approach allows developers to:

1. **Understand requirements** clearly through tests
2. **Build with confidence** knowing what "done" looks like
3. **Prevent regressions** as features are added
4. **Maintain quality** throughout development

**Next Steps:**
1. ✅ Review and approve test scenarios
2. ⏳ Begin website implementation
3. ⏳ Watch tests turn GREEN as features are completed
4. ⏳ Add remaining test files (features, blog, about, legal)
5. ⏳ Enhance unit tests with actual implementations

---

**Document Status**: Living document - will be updated as implementation progresses
**Last Review**: 2025-10-28
**Next Review**: After Phase 1 MVP completion
