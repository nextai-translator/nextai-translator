import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';

export default function Terms() {
  return (
    <Layout title="Terms of Service - NextAI Translator">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Terms of Service
        </h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              By accessing and using NextAI Translator, you accept and agree to be bound by the terms and provisions of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. Use License
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              NextAI Translator is open-source software licensed under the GNU Affero General Public License v3.0. You are free to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 mt-4">
              <li>Use the software for personal or commercial purposes</li>
              <li>Modify the source code</li>
              <li>Distribute copies of the software</li>
              <li>Distribute modified versions of the software</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 mt-4">
              Subject to the terms of the AGPL-3.0 license, which requires that modified versions be released under the same license.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Third-Party Services
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              NextAI Translator requires API keys from third-party AI providers (OpenAI, Claude, etc.). You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 mt-4">
              <li>Obtaining and maintaining your own API keys</li>
              <li>Complying with the terms of service of the AI providers you use</li>
              <li>Any costs associated with API usage</li>
              <li>Securing your API keys</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Disclaimer of Warranties
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              NextAI Translator is provided "as is" without warranty of any kind, either express or implied. We do not guarantee that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 mt-4">
              <li>The software will meet your requirements</li>
              <li>The software will be uninterrupted, timely, secure, or error-free</li>
              <li>The results obtained from using the software will be accurate or reliable</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Limitation of Liability
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              In no event shall NextAI Translator or its contributors be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, or goodwill.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Acceptable Use
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              You agree not to use NextAI Translator to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 mt-4">
              <li>Violate any laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Transmit malicious code or malware</li>
              <li>Attempt to gain unauthorized access to systems</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Modifications to Service
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              We reserve the right to modify or discontinue the service at any time without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Governing Law
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              These terms shall be governed by and construed in accordance with applicable international open-source software regulations and conventions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Contact Information
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              For questions about these terms, please visit our{' '}
              <a
                href="https://github.com/openai-translator/openai-translator"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};
