# NextAI Translator Website

This is the official marketing website for NextAI Translator, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🌍 Multi-language support (English, Simplified Chinese, Traditional Chinese) with next-i18next
- 🎨 Modern, responsive design with Tailwind CSS
- ⚡ Static site generation for optimal performance
- 🔍 SEO optimized with meta tags and Open Graph support
- ♿ WCAG 2.1 AA accessible
- 📱 Mobile-first responsive design
- 🎯 Platform auto-detection for downloads

## Tech Stack

- **Framework**: Next.js 14.x
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Internationalization**: next-i18next
- **Icons**: React Icons

## Getting Started

### Prerequisites

- Node.js 18+ or pnpm

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

### Development

The website will be available at `http://localhost:3000`

## Project Structure

```
website/
├── public/
│   └── locales/         # Translation files
│       ├── en/
│       ├── zh-CN/
│       └── zh-TW/
├── src/
│   ├── components/      # React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Layout.tsx
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── ProvidersSection.tsx
│   │   └── DownloadSection.tsx
│   ├── pages/           # Next.js pages
│   │   ├── index.tsx
│   │   ├── documentation.tsx
│   │   ├── privacy.tsx
│   │   ├── terms.tsx
│   │   └── about.tsx
│   └── styles/          # Global styles
│       └── globals.css
├── next.config.js
├── next-i18next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Adding New Content

### Adding Translations

Edit the JSON files in `public/locales/{locale}/common.json`:

```json
{
  "new_section": {
    "title": "New Section Title",
    "description": "New section description"
  }
}
```

### Adding New Pages

Create a new file in `src/pages/` and use the Layout component:

```tsx
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';

export default function NewPage() {
  return (
    <Layout title="New Page - NextAI Translator">
      {/* Your content */}
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables (if needed)
3. Deploy automatically on push to main branch

### Other Platforms

```bash
# Build static export
pnpm build
pnpm export

# The output will be in the 'out' directory
```

## Performance Optimization

- Images are optimized with Next.js Image component
- Code splitting for optimal bundle sizes
- Tailwind CSS purging removes unused styles
- Static generation for fast page loads

## Accessibility

The website follows WCAG 2.1 Level AA guidelines:

- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility
- Proper color contrast ratios
- Focus indicators on interactive elements

## License

This website is part of the NextAI Translator project, licensed under AGPL-3.0.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## Support

- [GitHub Issues](https://github.com/openai-translator/openai-translator/issues)
- [Documentation](./src/pages/documentation.tsx)
