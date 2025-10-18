'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { trackExternalLink } from '@/lib/analytics'

export function Footer() {
  const { t } = useTranslation('common')
  const currentYear = new Date().getFullYear()

  const footerSections = [
    {
      title: t('footer.product'),
      links: [
        { name: t('nav.features'), href: '/features' },
        { name: t('nav.download'), href: '/download' },
        { name: t('footer.changelog'), href: '/changelog' },
        { name: t('footer.roadmap'), href: '/roadmap' },
      ],
    },
    {
      title: t('footer.resources'),
      links: [
        { name: t('nav.docs'), href: '/docs' },
        { name: t('footer.api_keys'), href: '/docs/api-keys' },
        { name: t('footer.faq'), href: '/docs/faq' },
        { name: t('footer.troubleshooting'), href: '/docs/troubleshooting' },
      ],
    },
    {
      title: t('footer.community'),
      links: [
        { name: 'GitHub', href: 'https://github.com/yetone/nextai-translator', external: true },
        { name: t('footer.discussions'), href: 'https://github.com/yetone/nextai-translator/discussions', external: true },
        { name: t('footer.issues'), href: 'https://github.com/yetone/nextai-translator/issues', external: true },
        { name: t('footer.contributing'), href: '/community/contributing' },
      ],
    },
    {
      title: t('footer.about'),
      links: [
        { name: t('nav.about'), href: '/about' },
        { name: t('footer.privacy'), href: '/privacy' },
        { name: t('footer.license'), href: '/license' },
        { name: t('footer.contact'), href: '/contact' },
      ],
    },
  ]

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl font-bold text-blue-600">nextai</span>
              <span className="text-2xl font-light text-gray-800">translator</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              {t('footer.tagline')}
            </p>
            <div className="flex space-x-4">
              <a
                href="https://github.com/yetone/nextai-translator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors"
                aria-label="GitHub"
                onClick={() => trackExternalLink('https://github.com/yetone/nextai-translator', 'footer_github')}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-gray-900 font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
                        onClick={() => trackExternalLink(link.href, `footer_${link.name.toLowerCase()}`)}
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">
              © {currentYear} nextai translator. {t('footer.license_text')}{' '}
              <a
                href="https://github.com/yetone/nextai-translator/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                AGPL-3.0
              </a>
            </p>
            <p className="text-gray-600 text-sm mt-2 md:mt-0">
              {t('footer.made_with_love')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
