import { useTranslation } from 'next-i18next';

export default function ProvidersSection() {
  const { t } = useTranslation('common');

  const providers = [
    'OpenAI',
    'Azure OpenAI',
    'Claude (Anthropic)',
    'Google Gemini',
    'Ollama',
    'ChatGLM',
    'DeepSeek',
    'Cohere',
    'Groq',
    'Moonshot',
    'Kimi',
    'MiniMax',
    'ChatGPT',
  ];

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('providers.title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t('providers.subtitle')}
          </p>
        </div>

        {/* Providers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {providers.map((provider, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-primary"
            >
              <span className="text-center font-semibold text-gray-800 dark:text-gray-200">
                {provider}
              </span>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            And more providers being added regularly...
          </p>
        </div>
      </div>
    </section>
  );
}
