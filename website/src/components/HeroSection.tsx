import { useTranslation } from 'next-i18next';
import { FaGithub, FaDownload } from 'react-icons/fa';

export default function HeroSection() {
  const { t } = useTranslation('common');

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            {t('hero.title')}
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-primary font-semibold mb-4">
            {t('hero.subtitle')}
          </p>

          {/* Description */}
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-12">
            {t('hero.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <a
              href="#download"
              className="inline-flex items-center px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <FaDownload className="mr-2" />
              {t('hero.ctaPrimary')}
            </a>
            <a
              href="https://github.com/openai-translator/openai-translator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <FaGithub className="mr-2" />
              {t('hero.ctaSecondary')}
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="text-3xl font-bold text-primary mb-2">55+</div>
              <div className="text-gray-600 dark:text-gray-300">{t('hero.stats.languages')}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="text-3xl font-bold text-primary mb-2">13+</div>
              <div className="text-gray-600 dark:text-gray-300">{t('hero.stats.providers')}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <div className="text-3xl font-bold text-primary mb-2">Multi</div>
              <div className="text-gray-600 dark:text-gray-300">{t('hero.stats.platforms')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-200 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
    </section>
  );
}
