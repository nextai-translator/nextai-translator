# nextai translator Official Website

This is the official website for [nextai translator](https://github.com/yetone/nextai-translator), built with Next.js 14, React 18, and TypeScript.

## Features

- 🌍 **Multi-language Support**: English, Chinese (Simplified & Traditional), Japanese, Spanish, French, German
- ⚡ **Performance Optimized**: Static Site Generation (SSG), image optimization, lazy loading
- 📱 **Responsive Design**: Mobile-first approach, works on all devices
- ♿ **Accessibility**: WCAG 2.1 AA compliant
- 🔍 **SEO Optimized**: Meta tags, sitemap, structured data, Open Graph
- 📊 **Analytics Ready**: Support for Google Analytics and Plausible
- 🎨 **Modern UI**: Tailwind CSS, smooth animations, clean design

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) to view the website.

## Project Structure

```
website/
├── src/
│   ├── app/                 # Next.js app directory (pages)
│   ├── components/          # React components
│   ├── lib/                 # Utility functions and libraries
│   ├── styles/              # Global styles
│   └── types/               # TypeScript type definitions
├── public/
│   ├── locales/             # i18n translation files
│   ├── images/              # Static images
│   ├── robots.txt           # SEO robots file
│   └── sitemap.xml          # SEO sitemap
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
```

## Key Technologies

- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Internationalization**: i18next, react-i18next, next-i18next
- **Testing**: Vitest, Playwright
- **Linting**: ESLint, Prettier

## Internationalization

The website supports multiple languages using i18next. Translation files are located in `public/locales/`.

### Supported Languages

- English (en)
- Chinese Simplified (zh-Hans)
- Chinese Traditional (zh-Hant)
- Japanese (ja)
- Spanish (es)
- French (fr)
- German (de)

### Adding a New Language

1. Create a new directory in `public/locales/` with the language code
2. Add translation JSON files (common.json, home.json, etc.)
3. Update the language list in `src/components/LanguageSwitcher.tsx`
4. Update the i18n configuration in `next.config.js`

## Development

### Code Style

The project uses ESLint and Prettier for code formatting. Run:

```bash
# Lint
pnpm lint

# Format
pnpm format
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Deployment

The website can be deployed to:

- **Vercel** (recommended): Zero-config deployment for Next.js
- **Netlify**: Great for static sites with form handling
- **Cloudflare Pages**: Fast global delivery
- **GitHub Pages**: Free hosting for static sites

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Performance Optimizations

- Static Site Generation (SSG) for optimal performance
- Image optimization with Next.js Image component
- Lazy loading for images and components
- Code splitting and tree shaking
- CDN delivery for static assets
- Aggressive caching strategy

## SEO

- Meta tags for all pages
- Open Graph and Twitter Card support
- Structured data (Schema.org)
- XML sitemap
- Robots.txt
- Semantic HTML

## Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatible
- Sufficient color contrast
- Alt text for all images
- ARIA labels where appropriate
- Skip navigation link

## Analytics

The website supports:

- Google Analytics 4
- Plausible Analytics

Configure your analytics ID in the environment variables.

## Environment Variables

Create a `.env.local` file:

```env
# Analytics (optional)
NEXT_PUBLIC_GA_ID=your-google-analytics-id
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This website is part of the nextai translator project and is licensed under the AGPL-3.0 License.

## Links

- [Main Project](https://github.com/yetone/nextai-translator)
- [Documentation](./docs)
- [GitHub Issues](https://github.com/yetone/nextai-translator/issues)
- [GitHub Discussions](https://github.com/yetone/nextai-translator/discussions)
