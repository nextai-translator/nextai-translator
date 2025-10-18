# nextai translator Official Website

Official website for nextai translator - an AI-powered translation tool supporting 55+ languages with advanced features like polishing, summarization, OCR, and TTS.

## 🚀 Features

- **Fully Responsive**: Optimized for mobile, tablet, and desktop devices
- **Internationalization (i18n)**: Support for English and Chinese with easy language switching
- **SEO Optimized**: Proper meta tags, sitemap, robots.txt, and structured data
- **Accessibility**: WCAG 2.1 Level AA compliant with keyboard navigation and screen reader support
- **Performance**: Static site generation with Next.js for optimal loading speed
- **Dark Mode**: Support for both light and dark themes

## 📁 Project Structure

```
website/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   └── SEO.tsx
│   │   └── layout/          # Layout components
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── Layout.tsx
│   ├── pages/               # Next.js pages
│   │   ├── docs/
│   │   │   ├── index.tsx    # Documentation index
│   │   │   └── faq.tsx      # FAQ page
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── index.tsx        # Homepage
│   │   ├── features.tsx     # Features page
│   │   ├── download.tsx     # Download page
│   │   ├── getting-started.tsx
│   │   ├── support.tsx      # Support page
│   │   └── about.tsx        # About page
│   └── styles/
│       └── globals.css      # Global styles
├── public/
│   ├── locales/             # i18n translation files
│   │   ├── en/              # English translations
│   │   └── zh/              # Chinese translations
│   ├── robots.txt
│   └── sitemap.xml
├── tests/
│   └── e2e/                 # End-to-end tests
├── next.config.js
├── next-i18next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) - React framework with SSG/SSR
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Internationalization**: [next-i18next](https://github.com/i18next/next-i18next) - i18n for Next.js
- **Testing**: [Playwright](https://playwright.dev/) - End-to-end testing
- **Package Manager**: [pnpm](https://pnpm.io/) - Fast, disk space efficient

## 📦 Installation

### Prerequisites

- Node.js 18+
- pnpm 9.0+

### Setup

1. Navigate to the website directory:
```bash
cd website
```

2. Install dependencies:
```bash
pnpm install
```

3. Create environment variables (optional):
```bash
cp .env.example .env.local
```

## 🚀 Development

Start the development server:

```bash
pnpm dev
```

The website will be available at [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production (static export)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test` - Run unit tests
- `pnpm test:e2e` - Run end-to-end tests

## 🏗️ Building for Production

Build the static site:

```bash
pnpm build
```

This generates a static export in the `out/` directory that can be deployed to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

## 🌍 Internationalization

The website supports multiple languages using next-i18next.

### Adding a New Language

1. Create a new locale directory in `public/locales/`:
```bash
mkdir public/locales/fr
```

2. Add translation files (copy from `en/` and translate):
```bash
cp -r public/locales/en/* public/locales/fr/
```

3. Update `next-i18next.config.js`:
```javascript
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh', 'fr'], // Add 'fr' here
  },
  // ...
}
```

### Translation Files Structure

Each page has its own translation file:
- `common.json` - Shared translations (nav, footer, buttons)
- `home.json` - Homepage content
- `features.json` - Features page content
- `download.json` - Download page content
- `getting-started.json` - Getting started guide
- `docs.json` - Documentation content
- `support.json` - Support page content
- `about.json` - About page content

## 🧪 Testing

### E2E Tests

Run Playwright tests:

```bash
pnpm test:e2e
```

Run tests in UI mode:

```bash
pnpm playwright test --ui
```

### Accessibility Testing

The website is designed to meet WCAG 2.1 Level AA standards. All interactive elements support:
- Keyboard navigation (Tab, Enter, Escape)
- Screen readers (ARIA labels, semantic HTML)
- Sufficient color contrast
- Focus indicators

## 🎨 Styling

The website uses Tailwind CSS for styling with custom theme configuration:

- **Colors**: Primary brand colors defined in `tailwind.config.js`
- **Breakpoints**: Mobile (<768px), Tablet (768-1023px), Desktop (>1024px)
- **Dark Mode**: Class-based dark mode support

## 📝 Content Management

### Adding a New Page

1. Create the page in `src/pages/`:
```tsx
// src/pages/new-page.tsx
import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Layout from '@/components/layout/Layout'

export default function NewPage() {
  const { t } = useTranslation('new-page')

  return (
    <Layout title={t('title')}>
      {/* Your content */}
    </Layout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'new-page'])),
    },
  }
}
```

2. Create translation files:
- `public/locales/en/new-page.json`
- `public/locales/zh/new-page.json`

3. Add to navigation in `Header.tsx` if needed

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Set the root directory to `website`
4. Deploy

### Other Static Hosts

After running `pnpm build`, deploy the `out/` directory to:
- Netlify
- GitHub Pages
- Cloudflare Pages
- AWS S3 + CloudFront

## 📊 Performance

Target metrics (from PRD):
- **Page Load**: < 3 seconds on standard broadband
- **Lighthouse Score**: ≥ 90
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1

## 🔒 Security

- HTTPS enforced
- Content Security Policy headers
- No sensitive data in client-side code
- Regular dependency updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## 📄 License

This website is part of the nextai translator project and is licensed under AGPL-3.0.

## 📞 Support

- **Documentation**: Visit [/docs](/docs)
- **FAQ**: Check [/docs/faq](/docs/faq)
- **Issues**: Report bugs on [GitHub](https://github.com/openai-translator/openai-translator/issues)
- **Contact**: Use the [contact form](/support)

## 🔗 Links

- **Main Repository**: https://github.com/openai-translator/openai-translator
- **Chrome Extension**: https://chrome.google.com/webstore/detail/ogjibjphoadhljaoicdnjnmgokohngcc
- **Firefox Add-on**: https://addons.mozilla.org/firefox/addon/openai-translator/

---

Built with ❤️ by the nextai translator team
