'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { getRepoInfo, type GitHubRepoInfo } from '@/lib/github'
import { trackDownload, trackExternalLink } from '@/lib/analytics'

export default function HomePage() {
  const { t } = useTranslation('home')
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null)

  useEffect(() => {
    getRepoInfo().then(setRepoInfo)
  }, [])

  const features = [
    {
      icon: '🌍',
      title: t('features.multi_platform.title'),
      description: t('features.multi_platform.description'),
    },
    {
      icon: '🗣️',
      title: t('features.languages.title'),
      description: t('features.languages.description'),
    },
    {
      icon: '🤖',
      title: t('features.ai_powered.title'),
      description: t('features.ai_powered.description'),
    },
    {
      icon: '🔒',
      title: t('features.privacy.title'),
      description: t('features.privacy.description'),
    },
    {
      icon: '⚡',
      title: t('features.fast.title'),
      description: t('features.fast.description'),
    },
    {
      icon: '📖',
      title: t('features.vocabulary.title'),
      description: t('features.vocabulary.description'),
    },
    {
      icon: '🔊',
      title: t('features.tts.title'),
      description: t('features.tts.description'),
    },
    {
      icon: '📸',
      title: t('features.ocr.title'),
      description: t('features.ocr.description'),
    },
  ]

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link
                href="/download"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                onClick={() => trackDownload('unknown', 'hero_cta')}
              >
                {t('hero.cta_primary')}
              </Link>
              <Link
                href="/features"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg border-2 border-blue-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {t('hero.cta_secondary')}
              </Link>
            </div>

            {/* Social Proof */}
            {repoInfo && (
              <div className="flex flex-wrap gap-6 justify-center items-center text-gray-600">
                <a
                  href="https://github.com/yetone/nextai-translator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 hover:text-blue-600 transition-colors"
                  onClick={() =>
                    trackExternalLink(
                      'https://github.com/yetone/nextai-translator',
                      'hero_github_stars'
                    )
                  }
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="font-semibold">
                    {repoInfo.stars.toLocaleString()} {t('hero.stars')}
                  </span>
                </a>
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="font-semibold">{t('hero.open_source')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                  <span className="font-semibold">{t('hero.multi_platform')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow border border-gray-200"
              >
                <div className="text-4xl mb-4" role="img" aria-label={feature.title}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/features"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg"
            >
              {t('features.learn_more')}
              <svg
                className="w-5 h-5 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t('platforms.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('platforms.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl p-8 text-center hover:shadow-lg transition-shadow border border-gray-200">
              <div className="text-5xl mb-4">🌐</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('platforms.browser.title')}
              </h3>
              <p className="text-gray-600 mb-4">{t('platforms.browser.description')}</p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://chrome.google.com/webstore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() =>
                    trackExternalLink(
                      'https://chrome.google.com/webstore',
                      'platform_chrome'
                    )
                  }
                >
                  Chrome / Edge
                </a>
                <a
                  href="https://addons.mozilla.org/firefox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() =>
                    trackExternalLink('https://addons.mozilla.org/firefox', 'platform_firefox')
                  }
                >
                  Firefox
                </a>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 text-center hover:shadow-lg transition-shadow border border-gray-200">
              <div className="text-5xl mb-4">💻</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('platforms.desktop.title')}
              </h3>
              <p className="text-gray-600 mb-4">{t('platforms.desktop.description')}</p>
              <div className="flex flex-col gap-2">
                <span className="text-gray-700">Windows</span>
                <span className="text-gray-700">macOS</span>
                <span className="text-gray-700">Linux</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 text-center hover:shadow-lg transition-shadow border border-gray-200">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('platforms.others.title')}
              </h3>
              <p className="text-gray-600 mb-4">{t('platforms.others.description')}</p>
              <div className="flex flex-col gap-2">
                <span className="text-gray-700">Userscript</span>
                <span className="text-gray-700">PopClip</span>
                <span className="text-gray-700">Snipdo</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/download"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg inline-block"
              onClick={() => trackDownload('unknown', 'platforms_cta')}
            >
              {t('platforms.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </p>
          <Link
            href="/download"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg shadow-lg inline-block"
            onClick={() => trackDownload('unknown', 'bottom_cta')}
          >
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </div>
  )
}
