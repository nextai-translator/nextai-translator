import Layout from '@/components/Layout';
import { FaGithub, FaHeart, FaCode } from 'react-icons/fa';

export default function About() {
  return (
    <Layout title="About - NextAI Translator">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          About NextAI Translator
        </h1>

        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Our Mission
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              NextAI Translator is an open-source project dedicated to making AI-powered translation accessible to everyone. We believe that language should never be a barrier to communication, learning, or collaboration.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Why NextAI Translator?
            </h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                <strong className="text-gray-900 dark:text-white">Multi-Provider Support:</strong> Unlike other translation tools that lock you into a single AI provider, NextAI Translator supports 13+ AI engines, giving you the freedom to choose based on your needs, budget, and preferences.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">Privacy-Focused:</strong> All your data, including API keys and translation history, is stored locally on your device. We never collect or transmit your personal information.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">Multi-Platform:</strong> Whether you're using Chrome, Firefox, Safari, Windows, macOS, or Linux, we've got you covered with native applications for every platform.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-white">Open Source:</strong> Our code is publicly available on GitHub, allowing anyone to review, contribute, or modify the software to suit their needs.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Features That Set Us Apart
            </h2>
            <ul className="space-y-3 text-gray-600 dark:text-gray-300">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Screenshot Translation with OCR:</strong> Translate text from images using advanced optical character recognition.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Vocabulary Books:</strong> Save and organize words you want to remember with offline-capable storage.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Streaming Responses:</strong> See translations appear in real-time as they're generated.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Text-to-Speech:</strong> Hear pronunciations to improve your language learning.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Multi-Engine Language Detection:</strong> Accurate language identification using Google, Baidu, Bing, and local algorithms.</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Technology Stack
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              NextAI Translator is built with modern, reliable technologies:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li><strong className="text-gray-900 dark:text-white">Frontend:</strong> React 18.2, TypeScript, Tailwind CSS</li>
              <li><strong className="text-gray-900 dark:text-white">Desktop:</strong> Tauri 2.0 for native performance</li>
              <li><strong className="text-gray-900 dark:text-white">Browser Extensions:</strong> WebExtension API (Manifest V3 for Chrome, V2 for Firefox)</li>
              <li><strong className="text-gray-900 dark:text-white">Storage:</strong> Dexie (IndexedDB) for offline-capable data</li>
              <li><strong className="text-gray-900 dark:text-white">OCR:</strong> Tesseract.js for screenshot translation</li>
            </ul>
          </section>

          <section className="mb-12 bg-blue-50 dark:bg-gray-900 p-8 rounded-xl">
            <div className="flex items-center justify-center mb-6">
              <FaHeart className="text-red-500 w-8 h-8 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Open Source & Community
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              NextAI Translator is licensed under AGPL-3.0 and maintained by a community of contributors who believe in the power of open-source software.
            </p>
            <div className="flex justify-center space-x-6">
              <a
                href="https://github.com/openai-translator/openai-translator"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <FaGithub className="mr-2 w-5 h-5" />
                View on GitHub
              </a>
              <a
                href="https://github.com/openai-translator/openai-translator/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <FaCode className="mr-2 w-5 h-5" />
                Contribute
              </a>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Get Involved
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              We welcome contributions from developers, designers, translators, and users. Here's how you can help:
            </p>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li>⭐ Star the project on GitHub to show your support</li>
              <li>🐛 Report bugs and suggest features through GitHub Issues</li>
              <li>💻 Contribute code by submitting pull requests</li>
              <li>🌍 Help translate the application into more languages</li>
              <li>📖 Improve documentation and tutorials</li>
              <li>💬 Share your experience and help other users</li>
            </ul>
          </section>
        </div>
      </div>
    </Layout>
  );
}

