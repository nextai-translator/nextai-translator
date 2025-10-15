import Layout from '@/components/Layout';

export default function Privacy() {
  return (
    <Layout title="Privacy Policy - NextAI Translator">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Information We Collect
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              NextAI Translator is designed with privacy in mind. We collect minimal information necessary for the application to function:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 mt-4">
              <li>API keys (stored locally on your device)</li>
              <li>User preferences and settings (stored locally)</li>
              <li>Translation history (stored locally, optional)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. How We Use Your Information
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              All data is processed locally on your device. We do not collect or transmit your personal data to our servers. Your API keys and translation data are sent directly to the AI provider you have configured (OpenAI, Claude, etc.) according to their respective privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Third-Party Services
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              NextAI Translator integrates with third-party AI providers. When you use the application, your translation requests are sent to the AI provider you have configured. Please review their privacy policies:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 mt-4">
              <li><a href="https://openai.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">OpenAI Privacy Policy</a></li>
              <li><a href="https://www.anthropic.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Anthropic (Claude) Privacy Policy</a></li>
              <li><a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Data Security
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Your API keys and settings are stored securely on your local device using industry-standard encryption. We never have access to your API keys or translation data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Analytics
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              We use privacy-focused analytics (Plausible) on our website to understand how users interact with our site. This analytics service does not use cookies and does not collect personal information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Your Rights
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Since all data is stored locally on your device, you have complete control over your data. You can:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 mt-4">
              <li>Clear your translation history at any time</li>
              <li>Remove the application and all associated data</li>
              <li>Export your data using the application's settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Changes to This Policy
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              We may update this privacy policy from time to time. We will notify users of any significant changes through the application or on our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              If you have questions about this privacy policy, please contact us through our{' '}
              <a
                href="https://github.com/openai-translator/openai-translator/issues"
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

