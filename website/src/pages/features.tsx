import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Layout from '@/components/layout/Layout'
import Button from '@/components/common/Button'

export default function Features() {
  const { t } = useTranslation('features')

  const mainFeatures = [
    {
      id: 'translation',
      icon: '🌐',
      title: t('translation.title'),
      description: t('translation.description'),
      details: [
        {
          icon: '⚡',
          title: t('translation.details.streaming.title'),
          description: t('translation.details.streaming.description'),
        },
        {
          icon: '🌍',
          title: t('translation.details.languages.title'),
          description: t('translation.details.languages.description'),
        },
        {
          icon: '🧠',
          title: t('translation.details.context.title'),
          description: t('translation.details.context.description'),
        },
        {
          icon: '🎨',
          title: t('translation.details.customization.title'),
          description: t('translation.details.customization.description'),
        },
      ],
    },
    {
      id: 'polishing',
      icon: '✨',
      title: t('polishing.title'),
      description: t('polishing.description'),
      details: [
        {
          icon: '✅',
          title: t('polishing.details.grammar.title'),
          description: t('polishing.details.grammar.description'),
        },
        {
          icon: '📖',
          title: t('polishing.details.style.title'),
          description: t('polishing.details.style.description'),
        },
        {
          icon: '🎭',
          title: t('polishing.details.tone.title'),
          description: t('polishing.details.tone.description'),
        },
        {
          icon: '💡',
          title: t('polishing.details.suggestions.title'),
          description: t('polishing.details.suggestions.description'),
        },
      ],
    },
    {
      id: 'summarization',
      icon: '📝',
      title: t('summarization.title'),
      description: t('summarization.description'),
      details: [
        {
          icon: '📏',
          title: t('summarization.details.length.title'),
          description: t('summarization.details.length.description'),
        },
        {
          icon: '🎯',
          title: t('summarization.details.keyPoints.title'),
          description: t('summarization.details.keyPoints.description'),
        },
        {
          icon: '📋',
          title: t('summarization.details.bulletPoints.title'),
          description: t('summarization.details.bulletPoints.description'),
        },
        {
          icon: '🌐',
          title: t('summarization.details.multilingual.title'),
          description: t('summarization.details.multilingual.description'),
        },
      ],
    },
    {
      id: 'ocr',
      icon: '📷',
      title: t('ocr.title'),
      description: t('ocr.description'),
      details: [
        {
          icon: '📸',
          title: t('ocr.details.instant.title'),
          description: t('ocr.details.instant.description'),
        },
        {
          icon: '🎯',
          title: t('ocr.details.accurate.title'),
          description: t('ocr.details.accurate.description'),
        },
        {
          icon: '🌏',
          title: t('ocr.details.multiLanguage.title'),
          description: t('ocr.details.multiLanguage.description'),
        },
        {
          icon: '🖼️',
          title: t('ocr.details.overlay.title'),
          description: t('ocr.details.overlay.description'),
        },
      ],
    },
    {
      id: 'tts',
      icon: '🔊',
      title: t('tts.title'),
      description: t('tts.description'),
      details: [
        {
          icon: '🎙️',
          title: t('tts.details.voices.title'),
          description: t('tts.details.voices.description'),
        },
        {
          icon: '⏩',
          title: t('tts.details.speed.title'),
          description: t('tts.details.speed.description'),
        },
        {
          icon: '🌍',
          title: t('tts.details.multiLanguage.title'),
          description: t('tts.details.multiLanguage.description'),
        },
        {
          icon: '📡',
          title: t('tts.details.offline.title'),
          description: t('tts.details.offline.description'),
        },
      ],
    },
    {
      id: 'vocabulary',
      icon: '📚',
      title: t('vocabulary.title'),
      description: t('vocabulary.description'),
      details: [
        {
          icon: '💾',
          title: t('vocabulary.details.save.title'),
          description: t('vocabulary.details.save.description'),
        },
        {
          icon: '📖',
          title: t('vocabulary.details.examples.title'),
          description: t('vocabulary.details.examples.description'),
        },
        {
          icon: '🔁',
          title: t('vocabulary.details.review.title'),
          description: t('vocabulary.details.review.description'),
        },
        {
          icon: '📤',
          title: t('vocabulary.details.export.title'),
          description: t('vocabulary.details.export.description'),
        },
      ],
    },
  ]

  const additionalFeatures = [
    {
      icon: '⌨️',
      title: t('additional.shortcut.title'),
      description: t('additional.shortcut.description'),
    },
    {
      icon: '📜',
      title: t('additional.history.title'),
      description: t('additional.history.description'),
    },
    {
      icon: '🌓',
      title: t('additional.themes.title'),
      description: t('additional.themes.description'),
    },
    {
      icon: '🔒',
      title: t('additional.privacy.title'),
      description: t('additional.privacy.description'),
    },
    {
      icon: '💻',
      title: t('additional.openSource.title'),
      description: t('additional.openSource.description'),
    },
    {
      icon: '🖥️',
      title: t('additional.crossPlatform.title'),
      description: t('additional.crossPlatform.description'),
    },
  ]

  return (
    <Layout title={t('title')} description={t('description')}>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {t('hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Features */}
      {mainFeatures.map((feature, index) => (
        <section
          key={feature.id}
          className={`py-20 ${
            index % 2 === 0
              ? 'bg-white dark:bg-gray-800'
              : 'bg-gray-50 dark:bg-gray-900'
          }`}
          aria-labelledby={`feature-${feature.id}`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="text-6xl mb-4" aria-hidden="true">
                {feature.icon}
              </div>
              <h2
                id={`feature-${feature.id}`}
                className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
              >
                {feature.title}
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {feature.details.map((detail, detailIndex) => (
                <article
                  key={detailIndex}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
                >
                  <div className="text-3xl mb-3" aria-hidden="true">
                    {detail.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {detail.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {detail.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Additional Features */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('additional.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {additionalFeatures.map((feature, index) => (
              <article
                key={index}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-3" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              {t('cta.title')}
            </h2>
            <p className="mt-4 text-lg text-primary-100">
              {t('cta.subtitle')}
            </p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Button
                href="/download"
                variant="secondary"
                size="lg"
                aria-label="Download nextai translator"
              >
                {t('cta.download')}
              </Button>
              <Button
                href="/docs"
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
                aria-label="View documentation"
              >
                {t('cta.viewDocs')}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'features'])),
    },
  }
}
