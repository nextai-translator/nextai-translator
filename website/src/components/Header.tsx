import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FaBars, FaTimes, FaGithub } from 'react-icons/fa';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation('common');
  const router = useRouter();
  const { pathname, asPath, query, locale } = router;

  const changeLanguage = (newLocale: string) => {
    router.push({ pathname, query }, asPath, { locale: newLocale });
  };

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/#features', label: t('nav.features') },
    { href: '/#download', label: t('nav.download') },
    { href: '/documentation', label: t('nav.documentation') },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-700">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 font-bold text-xl text-primary">
              <span>NextAI Translator</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary-light"
              >
                {link.label}
              </Link>
            ))}

            {/* Language Switcher */}
            <div className="flex items-center space-x-2 border-l pl-4 border-gray-300 dark:border-gray-600">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 rounded ${
                  locale === 'en'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('zh-CN')}
                className={`px-2 py-1 rounded ${
                  locale === 'zh-CN'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                aria-label="切换到简体中文"
              >
                简
              </button>
              <button
                onClick={() => changeLanguage('zh-TW')}
                className={`px-2 py-1 rounded ${
                  locale === 'zh-TW'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
                aria-label="切換到繁體中文"
              >
                繁
              </button>
            </div>

            {/* GitHub Link */}
            <a
              href="https://github.com/openai-translator/openai-translator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary-light"
              aria-label="View on GitHub"
            >
              <FaGithub className="w-6 h-6" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-700 dark:text-gray-300"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2 text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary-light"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Language Switcher */}
            <div className="flex items-center space-x-2 py-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Language:</span>
              <button
                onClick={() => {
                  changeLanguage('en');
                  setIsMenuOpen(false);
                }}
                className={`px-3 py-1 rounded ${
                  locale === 'en'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  changeLanguage('zh-CN');
                  setIsMenuOpen(false);
                }}
                className={`px-3 py-1 rounded ${
                  locale === 'zh-CN'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                简体中文
              </button>
              <button
                onClick={() => {
                  changeLanguage('zh-TW');
                  setIsMenuOpen(false);
                }}
                className={`px-3 py-1 rounded ${
                  locale === 'zh-TW'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                繁體中文
              </button>
            </div>

            {/* Mobile GitHub Link */}
            <a
              href="https://github.com/openai-translator/openai-translator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 py-2 text-gray-700 hover:text-primary transition-colors dark:text-gray-300 dark:hover:text-primary-light"
              onClick={() => setIsMenuOpen(false)}
            >
              <FaGithub className="w-5 h-5" />
              <span>{t('nav.github')}</span>
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
