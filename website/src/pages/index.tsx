import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import DownloadSection from '@/components/DownloadSection';
import ProvidersSection from '@/components/ProvidersSection';

export default function Home() {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <title>{t('site.title')}</title>
        <meta name="description" content={t('site.description')} />
        <meta name="keywords" content="AI translator, OpenAI, Claude, Gemini, Ollama, translation tool, browser extension, desktop app, multilingual, 55 languages, GPT translator" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://openai-translator.io/" />
        <meta property="og:title" content={t('site.title')} />
        <meta property="og:description" content={t('site.description')} />
        <meta property="og:image" content="https://openai-translator.io/og-image.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://openai-translator.io/" />
        <meta property="twitter:title" content={t('site.title')} />
        <meta property="twitter:description" content={t('site.description')} />
        <meta property="twitter:image" content="https://openai-translator.io/og-image.png" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://openai-translator.io/" />
      </Head>
      <Layout>
        <HeroSection />
        <FeaturesSection />
        <ProvidersSection />
        <DownloadSection />
      </Layout>
    </>
  );
}
