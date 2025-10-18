import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Layout from '@/components/layout/Layout'
import Button from '@/components/common/Button'

export default function Home() {
  const { t } = useTranslation('home')

  const features = [
    {
      title: t('features.translation.title'),
      description: t('features.translation.description'),
      icon: '🌐',
    },
    {
      title: t('features.polishing.title'),
      description: t('features.polishing.description'),
      icon: '✨',
    },
    {
      title: t('features.summarization.title'),
      description: t('features.summarization.description'),
      icon: '📝',
    },
    {
      title: t('features.ocr.title'),
      description: t('features.ocr.description'),
      icon: '📷',
    },
    {
      title: t('features.tts.title'),
      description: t('features.tts.description'),
      icon: '🔊',
    },
    {
      title: t('features.vocabulary.title'),
      description: t('features.vocabulary.description'),
      icon: '📚',
    },
  ]

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {t('hero.subtitle')}
            </p>
            <div className="mt-10 flex justify-center gap-4 flex-wrap">
              <Button href="/download" size="lg">
                {t('hero.primaryCTA')}
              </Button>
              <Button href="/features" variant="outline" size="lg">
                {t('hero.secondaryCTA')}
              </Button>
            </div>

            {/* Social Proof */}
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  4.8K+
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('socialProof.stars')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  100K+
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('socialProof.downloads')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  55+
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('socialProof.languages')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('features.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4" aria-hidden="true">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button href="/features" variant="primary">
              View All Features
            </Button>
          </div>
        </div>
      </section>

      {/* Platform Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('platforms.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('platforms.subtitle')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-800 p-8 text-center">
              <div className="text-5xl mb-4" aria-hidden="true">🌐</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('platforms.browser')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Chrome, Firefox, Safari
              </p>
            </div>

            <div className="rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-800 p-8 text-center">
              <div className="text-5xl mb-4" aria-hidden="true">💻</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('platforms.desktop')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Windows, macOS, Linux
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button href="/download" variant="primary" size="lg">
              {t('platforms.allPlatforms')}
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'home'])),
    },
  }
}
