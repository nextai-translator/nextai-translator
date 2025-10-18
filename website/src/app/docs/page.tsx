'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export default function DocsPage() {
  const { t } = useTranslation(['docs', 'common'])

  const sections = [
    {
      title: 'Getting Started',
      icon: '🚀',
      links: [
        { name: 'Installation', href: '/docs/installation' },
        { name: 'Quick Start', href: '/docs/quick-start' },
        { name: 'API Keys Setup', href: '/docs/api-keys' },
      ],
    },
    {
      title: 'Features',
      icon: '✨',
      links: [
        { name: 'Translation Modes', href: '/docs/translation-modes' },
        { name: 'Text-to-Speech', href: '/docs/tts' },
        { name: 'OCR Translation', href: '/docs/ocr' },
        { name: 'Vocabulary Book', href: '/docs/vocabulary' },
      ],
    },
    {
      title: 'AI Providers',
      icon: '🤖',
      links: [
        { name: 'OpenAI Setup', href: '/docs/api-keys/openai' },
        { name: 'Claude Setup', href: '/docs/api-keys/claude' },
        { name: 'Gemini Setup', href: '/docs/api-keys/gemini' },
        { name: 'All Providers', href: '/docs/api-keys' },
      ],
    },
    {
      title: 'Help & Support',
      icon: '❓',
      links: [
        { name: 'FAQ', href: '/docs/faq' },
        { name: 'Troubleshooting', href: '/docs/troubleshooting' },
        { name: 'Keyboard Shortcuts', href: '/docs/shortcuts' },
      ],
    },
  ]

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Documentation
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know about using nextai translator
          </p>
        </div>

        {/* Search Bar (placeholder) */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <input
              type="search"
              placeholder="Search documentation..."
              className="w-full px-6 py-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search documentation"
            />
            <svg
              className="absolute right-4 top-4 w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <span className="text-4xl mr-3" role="img" aria-label={section.title}>
                  {section.icon}
                </span>
                <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
              </div>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-blue-600 hover:text-blue-700 hover:underline flex items-center group"
                    >
                      <svg
                        className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform"
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
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Additional Resources */}
        <div className="max-w-4xl mx-auto mt-12 bg-blue-50 rounded-xl p-8 border border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need More Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href="https://github.com/yetone/nextai-translator/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <svg
                className="w-8 h-8 text-blue-600 mb-2"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
              <span className="font-semibold text-gray-900">Discussions</span>
              <span className="text-sm text-gray-600">Ask the community</span>
            </a>
            <a
              href="https://github.com/yetone/nextai-translator/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <svg
                className="w-8 h-8 text-blue-600 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-semibold text-gray-900">Report Issue</span>
              <span className="text-sm text-gray-600">Found a bug?</span>
            </a>
            <a
              href="https://github.com/yetone/nextai-translator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <svg
                className="w-8 h-8 text-blue-600 mb-2"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold text-gray-900">GitHub</span>
              <span className="text-sm text-gray-600">View source code</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
