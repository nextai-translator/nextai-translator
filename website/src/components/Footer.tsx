import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaGithub, FaTwitter, FaDiscord } from 'react-icons/fa';

export default function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer className="bg-gray-50 border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4">
              NextAI Translator
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('site.description')}
            </p>
            <div className="flex space-x-4">
              <a
                href="https://github.com/openai-translator/openai-translator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-light"
                aria-label="GitHub"
              >
                <FaGithub className="w-6 h-6" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-light"
                aria-label="Twitter"
              >
                <FaTwitter className="w-6 h-6" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-light"
                aria-label="Discord"
              >
                <FaDiscord className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Links Column */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/documentation"
                  className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-light"
                >
                  {t('footer.documentation')}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/openai-translator/openai-translator/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-light"
                >
                  {t('footer.support')}
                </a>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-light"
                >
                  {t('footer.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-light"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary-light"
                >
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-gray-600 dark:text-gray-400">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
