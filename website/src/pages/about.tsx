import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Layout from '@/components/layout/Layout'
import Button from '@/components/common/Button'

export default function About() {
  const { t } = useTranslation('about')

  const timeline = [
    {
      year: '2023',
      title: t('story.timeline.founded.title'),
      description: t('story.timeline.founded.description'),
    },
    {
      year: '2023',
      title: t('story.timeline.firstRelease.title'),
      description: t('story.timeline.firstRelease.description'),
    },
    {
      year: '2024',
      title: t('story.timeline.growth.title'),
      description: t('story.timeline.growth.description'),
    },
    {
      year: '2025',
      title: t('story.timeline.community.title'),
      description: t('story.timeline.community.description'),
    },
  ]

  const values = [
    {
      icon: '💻',
      title: t('values.openSource.title'),
      description: t('values.openSource.description'),
    },
    {
      icon: '🔒',
      title: t('values.privacy.title'),
      description: t('values.privacy.description'),
    },
    {
      icon: '🌍',
      title: t('values.accessibility.title'),
      description: t('values.accessibility.description'),
    },
    {
      icon: '⭐',
      title: t('values.quality.title'),
      description: t('values.quality.description'),
    },
  ]

  const differentiators = [
    {
      icon: '🔄',
      title: t('features.multiProvider.title'),
      description: t('features.multiProvider.description'),
    },
    {
      icon: '🎯',
      title: t('features.comprehensive.title'),
      description: t('features.comprehensive.description'),
    },
    {
      icon: '💻',
      title: t('features.crossPlatform.title'),
      description: t('features.crossPlatform.description'),
    },
    {
      icon: '🔐',
      title: t('features.privacy.title'),
      description: t('features.privacy.description'),
    },
  ]

  const stats = [
    {
      value: t('stats.downloads.value'),
      label: t('stats.downloads.label'),
    },
    {
      value: t('stats.stars.value'),
      label: t('stats.stars.label'),
    },
    {
      value: t('stats.languages.value'),
      label: t('stats.languages.label'),
    },
    {
      value: t('stats.contributors.value'),
      label: t('stats.contributors.label'),
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

      {/* Mission */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl mb-6">
              {t('mission.title')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              {t('mission.description')}
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 italic">
              {t('mission.vision')}
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('story.title')}
            </h2>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-600 dark:text-gray-300">
              {t('story.content')}
            </p>
          </div>

          {/* Timeline */}
          <div className="relative mt-16">
            <div
              className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-primary-200 dark:bg-primary-800"
              aria-hidden="true"
            />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <article
                  key={index}
                  className={`relative flex items-center ${
                    index % 2 === 0 ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`w-full md:w-5/12 ${
                      index % 2 === 0 ? 'md:pr-12 text-right' : 'md:pl-12 text-left'
                    }`}
                  >
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
                      <div
                        className={`text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2 ${
                          index % 2 === 0 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {item.year}
                      </div>
                      <h3
                        className={`text-xl font-semibold text-gray-900 dark:text-white mb-2 ${
                          index % 2 === 0 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={`text-gray-600 dark:text-gray-300 ${
                          index % 2 === 0 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="absolute left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-primary-600 border-4 border-white dark:border-gray-800" />
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('values.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <article
                key={index}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center"
              >
                <div className="text-5xl mb-4" aria-hidden="true">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('features.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {differentiators.map((feature, index) => (
              <article
                key={index}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
              >
                <div className="text-4xl mb-4" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('stats.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl mb-6">
              {t('team.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              {t('team.description')}
            </p>
            <Button
              href="https://github.com/nextai-translator/nextai-translator/blob/main/CONTRIBUTING.md"
              variant="primary"
              size="lg"
              external
            >
              {t('team.contribute')}
            </Button>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('openSource.title')}
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-600 dark:text-gray-300">
              {t('openSource.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
            <article className="rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('openSource.github.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {t('openSource.github.description')}
              </p>
              <Button
                href="https://github.com/nextai-translator/nextai-translator"
                variant="primary"
                external
              >
                {t('openSource.github.cta')}
              </Button>
            </article>

            <article className="rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900 p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('openSource.contributing.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {t('openSource.contributing.description')}
              </p>
              <Button
                href="https://github.com/nextai-translator/nextai-translator/blob/main/CONTRIBUTING.md"
                variant="primary"
                external
              >
                {t('openSource.contributing.cta')}
              </Button>
            </article>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('contact.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('contact.description')}
            </p>
          </div>

          <div className="flex justify-center gap-4 flex-wrap">
            <Button
              href="https://github.com/nextai-translator/nextai-translator/discussions"
              variant="outline"
              external
            >
              {t('contact.github')}
            </Button>
            <Button href="/support" variant="outline">
              {t('contact.support')}
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">{t('cta.title')}</h2>
            <p className="mt-4 text-lg text-primary-100">{t('cta.description')}</p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Button href="/download" variant="secondary" size="lg">
                {t('cta.download')}
              </Button>
              <Button
                href="/docs"
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                {t('cta.documentation')}
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
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'about'])),
    },
  }
}
