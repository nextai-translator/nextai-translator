import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';

export default function Documentation() {
  const { t } = useTranslation('common');

  return (
    <Layout title="Documentation - NextAI Translator">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          {t('nav.documentation')}
        </h1>

        {/* Getting Started */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Getting Started
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Welcome to NextAI Translator! This guide will help you get started with installation and configuration.
          </p>
        </section>

        {/* Installation */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Installation
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Browser Extension (Chrome/Firefox)
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>Visit the Chrome Web Store or Firefox Add-ons</li>
                <li>Search for "NextAI Translator"</li>
                <li>Click "Add to Chrome" or "Add to Firefox"</li>
                <li>Follow the prompts to complete installation</li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Desktop App (Windows/macOS/Linux)
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>Download the appropriate installer from GitHub Releases</li>
                <li>Run the installer</li>
                <li>Follow the installation wizard</li>
                <li>Launch the application from your applications folder</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            API Configuration
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            NextAI Translator requires an API key from one of the supported AI providers. Here's how to configure it:
          </p>

          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
                OpenAI Configuration
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>Create an account at <a href="https://platform.openai.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">platform.openai.com</a></li>
                <li>Navigate to API Keys section</li>
                <li>Click "Create new secret key"</li>
                <li>Copy the key and paste it in NextAI Translator settings</li>
              </ol>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Claude (Anthropic) Configuration
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>Create an account at <a href="https://console.anthropic.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></li>
                <li>Generate an API key from your account settings</li>
                <li>Copy and configure it in NextAI Translator</li>
              </ol>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Ollama (Local) Configuration
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>Install Ollama from <a href="https://ollama.ai" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">ollama.ai</a></li>
                <li>Pull a model: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">ollama pull llama2</code></li>
                <li>Configure NextAI Translator to use Ollama endpoint (usually http://localhost:11434)</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Troubleshooting
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Issue: Translation not working
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                <li>Verify your API key is correctly configured</li>
                <li>Check your internet connection</li>
                <li>Ensure you have sufficient API credits</li>
                <li>Try switching to a different AI provider</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Issue: Extension not appearing
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                <li>Check if the extension is enabled in your browser settings</li>
                <li>Try restarting your browser</li>
                <li>Reinstall the extension if the problem persists</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Support */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Need More Help?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            If you're experiencing issues or have questions:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>Check the <a href="https://github.com/openai-translator/openai-translator" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">GitHub repository</a> for more information</li>
            <li>Open an issue on <a href="https://github.com/openai-translator/openai-translator/issues" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">GitHub Issues</a></li>
            <li>Join our community discussions</li>
          </ul>
        </section>
      </div>
    </Layout>
  );
}

