import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { I18nProvider } from '@/components/I18nProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'nextai translator - AI-Powered Translation Tool',
  description:
    'Open-source AI translation tool supporting 55+ languages with multiple AI providers. Available as browser extension and desktop app for Windows, macOS, and Linux.',
  keywords: [
    'AI translator',
    'open source translator',
    'Chrome extension',
    'translation tool',
    'OpenAI translator',
    'Claude translator',
    'multi-language',
  ],
  authors: [{ name: 'nextai translator team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nextai-translator.com',
    siteName: 'nextai translator',
    title: 'nextai translator - AI-Powered Translation Tool',
    description:
      'Open-source AI translation tool supporting 55+ languages with multiple AI providers.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'nextai translator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'nextai translator - AI-Powered Translation Tool',
    description:
      'Open-source AI translation tool supporting 55+ languages with multiple AI providers.',
    images: ['/og-image.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <I18nProvider>
          <Header />
          <main id="main-content" className="flex-grow">
            {children}
          </main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  )
}
