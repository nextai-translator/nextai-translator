import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Layout from '@/components/layout/Layout'
import Button from '@/components/common/Button'

export default function Download() {
  const { t } = useTranslation('download')

  const platforms = [
    {
      id: 'windows',
      icon: '🪟',
      title: t('desktop.windows.title'),
      description: t('desktop.windows.description'),
      downloadUrl: 'https://github.com/nextai-translator/nextai-translator/releases/latest',
      architectures: [
        { label: t('desktop.windows.architecture.x64'), url: '#' },
        { label: t('desktop.windows.architecture.arm64'), url: '#' },
      ],
    },
    {
      id: 'macos',
      icon: '🍎',
      title: t('desktop.macos.title'),
      description: t('desktop.macos.description'),
      downloadUrl: 'https://github.com/nextai-translator/nextai-translator/releases/latest',
      architectures: [
        { label: t('desktop.macos.architecture.intel'), url: '#' },
        { label: t('desktop.macos.architecture.apple'), url: '#' },
      ],
    },
    {
      id: 'linux',
      icon: '🐧',
      title: t('desktop.linux.title'),
      description: t('desktop.linux.description'),
      downloadUrl: 'https://github.com/nextai-translator/nextai-translator/releases/latest',
      formats: [
        { label: t('desktop.linux.formats.appimage'), url: '#' },
        { label: t('desktop.linux.formats.deb'), url: '#' },
        { label: t('desktop.linux.formats.rpm'), url: '#' },
        { label: t('desktop.linux.formats.snap'), url: '#' },
      ],
    },
  ]

  const browsers = [
    {
      id: 'chrome',
      icon: '🌐',
      title: t('browser.chrome.title'),
      description: t('browser.chrome.description'),
      url: 'https://chrome.google.com/webstore',
      available: true,
    },
    {
      id: 'firefox',
      icon: '🦊',
      title: t('browser.firefox.title'),
      description: t('browser.firefox.description'),
      url: 'https://addons.mozilla.org',
      available: true,
    },
    {
      id: 'safari',
      icon: '🧭',
      title: t('browser.safari.title'),
      description: t('browser.safari.description'),
      url: '#',
      available: false,
    },
  ]

  const features = [
    {
      icon: '📡',
      title: t('features.offline.title'),
      description: t('features.offline.description'),
    },
    {
      icon: '🔄',
      title: t('features.sync.title'),
      description: t('features.sync.description'),
    },
    {
      icon: '⚡',
      title: t('features.updates.title'),
      description: t('features.updates.description'),
    },
    {
      icon: '🔒',
      title: t('features.privacy.title'),
      description: t('features.privacy.description'),
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

      {/* Desktop Applications */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('desktop.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('desktop.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {platforms.map((platform) => (
              <article
                key={platform.id}
                className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 hover:shadow-lg transition-shadow"
                aria-label={`${platform.title} download options`}
              >
                <div className="text-5xl mb-4" aria-hidden="true">
                  {platform.icon}
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  {platform.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {platform.description}
                </p>

                {platform.architectures && (
                  <div className="space-y-2 mb-6" role="list">
                    {platform.architectures.map((arch, index) => (
                      <Button
                        key={index}
                        href={platform.downloadUrl}
                        variant="outline"
                        className="w-full"
                        external
                        aria-label={`Download ${arch.label}`}
                      >
                        {arch.label}
                      </Button>
                    ))}
                  </div>
                )}

                {platform.formats && (
                  <div className="space-y-2 mb-6" role="list">
                    {platform.formats.map((format, index) => (
                      <Button
                        key={index}
                        href={platform.downloadUrl}
                        variant="outline"
                        className="w-full"
                        external
                        aria-label={`Download ${format.label}`}
                      >
                        {format.label}
                      </Button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Browser Extensions */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('browser.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('browser.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {browsers.map((browser) => (
              <article
                key={browser.id}
                className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center"
                aria-label={`${browser.title} extension`}
              >
                <div className="text-5xl mb-4" aria-hidden="true">
                  {browser.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {browser.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {browser.description}
                </p>
                {browser.available ? (
                  <Button
                    href={browser.url}
                    variant="primary"
                    className="w-full"
                    external
                    aria-label={`Install ${browser.title}`}
                  >
                    {t(`browser.${browser.id}.install`)}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full cursor-not-allowed opacity-50"
                    aria-disabled="true"
                  >
                    {t('browser.safari.comingSoon')}
                  </Button>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('features.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl mb-4" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('systemRequirements.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {['windows', 'macos', 'linux'].map((platform) => (
              <div
                key={platform}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 capitalize">
                  {platform === 'macos' ? 'macOS' : platform}
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">OS:</dt>
                    <dd className="text-gray-900 dark:text-white">
                      {t(`systemRequirements.${platform}.os`)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Processor:
                    </dt>
                    <dd className="text-gray-900 dark:text-white">
                      {t(`systemRequirements.${platform}.processor`)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Memory:
                    </dt>
                    <dd className="text-gray-900 dark:text-white">
                      {t(`systemRequirements.${platform}.memory`)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Storage:
                    </dt>
                    <dd className="text-gray-900 dark:text-white">
                      {t(`systemRequirements.${platform}.storage`)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GitHub & Installation Guide */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Open Source */}
            <div className="rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('github.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {t('github.description')}
              </p>
              <Button
                href="https://github.com/nextai-translator/nextai-translator"
                variant="primary"
                external
              >
                {t('github.viewOnGitHub')}
              </Button>
            </div>

            {/* Installation Guide */}
            <div className="rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('installation.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Need help installing? Check out our step-by-step installation guide.
              </p>
              <Button href="/getting-started" variant="primary">
                {t('installation.viewGuide')}
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
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'download'])),
    },
  }
}
