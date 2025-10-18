import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import Button from '@/components/common/Button'
import Link from 'next/link'

export default function Documentation() {
  const { t } = useTranslation('docs')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    {
      id: 'gettingStarted',
      icon: '🚀',
      title: t('categories.gettingStarted.title'),
      description: t('categories.gettingStarted.description'),
      items: [
        {
          key: 'installation',
          label: t('categories.gettingStarted.items.installation'),
          href: '/getting-started#installation',
        },
        {
          key: 'quickStart',
          label: t('categories.gettingStarted.items.quickStart'),
          href: '/getting-started',
        },
        {
          key: 'configuration',
          label: t('categories.gettingStarted.items.configuration'),
          href: '/getting-started#configuration',
        },
        {
          key: 'firstTranslation',
          label: t('categories.gettingStarted.items.firstTranslation'),
          href: '/getting-started#usage',
        },
      ],
    },
    {
      id: 'features',
      icon: '✨',
      title: t('categories.features.title'),
      description: t('categories.features.description'),
      items: [
        {
          key: 'translation',
          label: t('categories.features.items.translation'),
          href: '/features#translation',
        },
        {
          key: 'polishing',
          label: t('categories.features.items.polishing'),
          href: '/features#polishing',
        },
        {
          key: 'summarization',
          label: t('categories.features.items.summarization'),
          href: '/features#summarization',
        },
        {
          key: 'ocr',
          label: t('categories.features.items.ocr'),
          href: '/features#ocr',
        },
        {
          key: 'tts',
          label: t('categories.features.items.tts'),
          href: '/features#tts',
        },
        {
          key: 'vocabulary',
          label: t('categories.features.items.vocabulary'),
          href: '/features#vocabulary',
        },
      ],
    },
    {
      id: 'configuration',
      icon: '⚙️',
      title: t('categories.configuration.title'),
      description: t('categories.configuration.description'),
      items: [
        {
          key: 'apiKeys',
          label: t('categories.configuration.items.apiKeys'),
          href: '/getting-started#configuration',
        },
        {
          key: 'shortcuts',
          label: t('categories.configuration.items.shortcuts'),
          href: '/getting-started#configuration',
        },
        {
          key: 'preferences',
          label: t('categories.configuration.items.preferences'),
          href: '/getting-started#configuration',
        },
        {
          key: 'themes',
          label: t('categories.configuration.items.themes'),
          href: '/getting-started#configuration',
        },
      ],
    },
    {
      id: 'advanced',
      icon: '🔧',
      title: t('categories.advanced.title'),
      description: t('categories.advanced.description'),
      items: [
        {
          key: 'plugins',
          label: t('categories.advanced.items.plugins'),
          href: '#',
        },
        {
          key: 'customPrompts',
          label: t('categories.advanced.items.customPrompts'),
          href: '#',
        },
        {
          key: 'automation',
          label: t('categories.advanced.items.automation'),
          href: '#',
        },
        {
          key: 'api',
          label: t('categories.advanced.items.api'),
          href: '#',
        },
      ],
    },
    {
      id: 'troubleshooting',
      icon: '🔍',
      title: t('categories.troubleshooting.title'),
      description: t('categories.troubleshooting.description'),
      items: [
        {
          key: 'faq',
          label: t('categories.troubleshooting.items.faq'),
          href: '/docs/faq',
        },
        {
          key: 'commonIssues',
          label: t('categories.troubleshooting.items.commonIssues'),
          href: '/getting-started#troubleshooting',
        },
        {
          key: 'performance',
          label: t('categories.troubleshooting.items.performance'),
          href: '#',
        },
        {
          key: 'support',
          label: t('categories.troubleshooting.items.support'),
          href: '/support',
        },
      ],
    },
    {
      id: 'development',
      icon: '💻',
      title: t('categories.development.title'),
      description: t('categories.development.description'),
      items: [
        {
          key: 'contributing',
          label: t('categories.development.items.contributing'),
          href: 'https://github.com/nextai-translator/nextai-translator/blob/main/CONTRIBUTING.md',
        },
        {
          key: 'buildFromSource',
          label: t('categories.development.items.buildFromSource'),
          href: 'https://github.com/nextai-translator/nextai-translator#building-from-source',
        },
        {
          key: 'architecture',
          label: t('categories.development.items.architecture'),
          href: 'https://github.com/nextai-translator/nextai-translator/blob/main/docs/ARCHITECTURE.md',
        },
        {
          key: 'pluginDevelopment',
          label: t('categories.development.items.pluginDevelopment'),
          href: '#',
        },
      ],
    },
  ]

  const popularTopics = t('popular.items', { returnObjects: true }) as string[]

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

            {/* Search Bar */}
            <div className="mt-8 max-w-2xl mx-auto">
              <label htmlFor="docs-search" className="sr-only">
                {t('hero.search')}
              </label>
              <div className="relative">
                <input
                  id="docs-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('hero.search')}
                  className="w-full px-6 py-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  aria-label="Search documentation"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {categories.map((category) => (
              <article
                key={category.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8"
                aria-labelledby={`category-${category.id}`}
              >
                <div className="flex items-start mb-6">
                  <div className="text-4xl mr-4" aria-hidden="true">
                    {category.icon}
                  </div>
                  <div>
                    <h2
                      id={`category-${category.id}`}
                      className="text-2xl font-bold text-gray-900 dark:text-white"
                    >
                      {category.title}
                    </h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                      {category.description}
                    </p>
                  </div>
                </div>

                <nav aria-label={`${category.title} navigation`}>
                  <ul className="space-y-2" role="list">
                    {category.items.map((item) => {
                      const isExternal = item.href.startsWith('http')
                      return (
                        <li key={item.key}>
                          {isExternal ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                            >
                              {item.label}
                              <span className="ml-1" aria-label="Opens in new window">
                                ↗
                              </span>
                            </a>
                          ) : (
                            <Link
                              href={item.href}
                              className="block px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                            >
                              {item.label}
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('popular.title')}
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <nav aria-label="Popular topics">
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="list">
                {popularTopics.map((topic, index) => (
                  <li key={index}>
                    <Link
                      href="#"
                      className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:border-primary-600 dark:hover:border-primary-400 hover:shadow-md transition-all"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{topic}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section>

      {/* Support CTA */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('support.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('support.description')}
            </p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Button
                href="https://github.com/nextai-translator/nextai-translator"
                variant="primary"
                external
              >
                {t('support.github')}
              </Button>
              <Button
                href="https://github.com/nextai-translator/nextai-translator/discussions"
                variant="outline"
                external
              >
                {t('support.discussions')}
              </Button>
              <Button
                href="https://github.com/nextai-translator/nextai-translator/issues"
                variant="outline"
                external
              >
                {t('support.issues')}
              </Button>
              <Button href="/support" variant="outline">
                {t('support.contact')}
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
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'docs'])),
    },
  }
}
