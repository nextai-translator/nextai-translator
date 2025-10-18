import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import Button from '@/components/common/Button'

export default function GettingStarted() {
  const { t } = useTranslation('getting-started')
  const [selectedPlatform, setSelectedPlatform] = useState<'desktop' | 'browser'>('desktop')
  const [selectedOS, setSelectedOS] = useState<'windows' | 'macos' | 'linux' | 'chrome' | 'firefox'>(
    'windows'
  )

  const quickStartSteps = [
    {
      number: 1,
      title: t('quickStart.step1.title'),
      description: t('quickStart.step1.description'),
    },
    {
      number: 2,
      title: t('quickStart.step2.title'),
      description: t('quickStart.step2.description'),
    },
    {
      number: 3,
      title: t('quickStart.step3.title'),
      description: t('quickStart.step3.description'),
    },
  ]

  const platforms = {
    desktop: ['windows', 'macos', 'linux'],
    browser: ['chrome', 'firefox'],
  }

  const apiProviders = [
    {
      id: 'openai',
      title: t('configuration.apiKeys.providers.openai.title'),
      steps: t('configuration.apiKeys.providers.openai.steps', { returnObjects: true }) as string[],
    },
    {
      id: 'anthropic',
      title: t('configuration.apiKeys.providers.anthropic.title'),
      steps: t('configuration.apiKeys.providers.anthropic.steps', {
        returnObjects: true,
      }) as string[],
    },
    {
      id: 'google',
      title: t('configuration.apiKeys.providers.google.title'),
      steps: t('configuration.apiKeys.providers.google.steps', { returnObjects: true }) as string[],
    },
  ]

  const defaultShortcuts = [
    t('configuration.shortcuts.default.translate'),
    t('configuration.shortcuts.default.polish'),
    t('configuration.shortcuts.default.summarize'),
    t('configuration.shortcuts.default.screenshot'),
    t('configuration.shortcuts.default.vocabulary'),
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

      {/* Quick Start */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('quickStart.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {quickStartSteps.map((step) => (
              <article
                key={step.number}
                className="relative rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900 p-8"
              >
                <div
                  className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-bold"
                  aria-label={`Step ${step.number}`}
                >
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 mt-4">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Installation */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('installation.title')}
            </h2>
          </div>

          {/* Platform Tabs */}
          <div className="flex justify-center mb-8" role="tablist" aria-label="Platform selection">
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 p-1">
              <button
                role="tab"
                aria-selected={selectedPlatform === 'desktop'}
                aria-controls="desktop-panel"
                onClick={() => {
                  setSelectedPlatform('desktop')
                  setSelectedOS('windows')
                }}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  selectedPlatform === 'desktop'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {t('installation.desktop.title')}
              </button>
              <button
                role="tab"
                aria-selected={selectedPlatform === 'browser'}
                aria-controls="browser-panel"
                onClick={() => {
                  setSelectedPlatform('browser')
                  setSelectedOS('chrome')
                }}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  selectedPlatform === 'browser'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {t('installation.browser.title')}
              </button>
            </div>
          </div>

          {/* OS Tabs */}
          <div className="flex justify-center mb-8" role="tablist" aria-label="Operating system selection">
            <div className="inline-flex flex-wrap justify-center gap-2">
              {platforms[selectedPlatform].map((os) => (
                <button
                  key={os}
                  role="tab"
                  aria-selected={selectedOS === os}
                  aria-controls={`${os}-instructions`}
                  onClick={() => setSelectedOS(os as any)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${
                    selectedOS === os
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 border-2 border-primary-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {os === 'macos' ? 'macOS' : os}
                </button>
              ))}
            </div>
          </div>

          {/* Installation Steps */}
          <div
            role="tabpanel"
            id={`${selectedOS}-instructions`}
            aria-labelledby={selectedOS}
            className="max-w-3xl mx-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8"
          >
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 capitalize">
              {t(`installation.${selectedPlatform}.${selectedOS}.title`)}
            </h3>
            <ol className="space-y-4" role="list">
              {(
                t(`installation.${selectedPlatform}.${selectedOS}.steps`, {
                  returnObjects: true,
                }) as string[]
              ).map((step, index) => (
                <li key={index} className="flex items-start">
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center font-semibold mr-4"
                    aria-label={`Step ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Configuration - API Keys */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('configuration.apiKeys.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {t('configuration.apiKeys.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {apiProviders.map((provider) => (
              <article
                key={provider.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {provider.title}
                </h3>
                <ol className="space-y-3" role="list">
                  {provider.steps.map((step, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-semibold mr-3">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('configuration.shortcuts.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('configuration.shortcuts.description')}
            </p>
          </div>

          <div className="max-w-3xl mx-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8">
            <ul className="space-y-4" role="list">
              {defaultShortcuts.map((shortcut, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0"
                >
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-sm">
                    {shortcut}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('troubleshooting.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 max-w-5xl mx-auto">
            {['apiError', 'shortcut', 'ocr', 'performance'].map((issue) => (
              <article
                key={issue}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t(`troubleshooting.common.${issue}.title`)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t(`troubleshooting.common.${issue}.description`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              {t('nextSteps.title')}
            </h2>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Button href="/features" variant="secondary" size="lg">
                {t('nextSteps.explore')}
              </Button>
              <Button
                href="/docs"
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                {t('nextSteps.documentation')}
              </Button>
              <Button
                href="/support"
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
              >
                {t('nextSteps.community')}
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
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'getting-started'])),
    },
  }
}
