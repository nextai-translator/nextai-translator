import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import clsx from 'clsx'

export default function Header() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.features'), href: '/features' },
    { name: t('nav.download'), href: '/download' },
    { name: t('nav.docs'), href: '/docs' },
    { name: t('nav.support'), href: '/support' },
    { name: t('nav.about'), href: '/about' },
  ]

  const changeLanguage = (locale: string) => {
    router.push(router.pathname, router.asPath, { locale })
  }

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between py-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {t('siteTitle')}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors',
                  router.pathname === item.href
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Language Switcher */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={() => changeLanguage('en')}
              className={clsx(
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                router.locale === 'en'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              aria-label="Switch to English"
            >
              EN
            </button>
            <button
              onClick={() => changeLanguage('zh')}
              className={clsx(
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                router.locale === 'zh'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              aria-label="切换到中文"
            >
              中文
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'block px-3 py-2 rounded-md text-base font-medium',
                  router.pathname === item.href
                    ? 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex space-x-2 px-3 pt-2">
              <button
                onClick={() => {
                  changeLanguage('en')
                  setMobileMenuOpen(false)
                }}
                className={clsx(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium',
                  router.locale === 'en'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800'
                )}
              >
                EN
              </button>
              <button
                onClick={() => {
                  changeLanguage('zh')
                  setMobileMenuOpen(false)
                }}
                className={clsx(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium',
                  router.locale === 'zh'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800'
                )}
              >
                中文
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
