'use client'

import Link from 'next/link'

export default function APIKeysPage() {
  const providers = [
    {
      name: 'OpenAI',
      icon: '🔵',
      description: 'GPT-3.5, GPT-4, and GPT-4 Turbo models',
      difficulty: 'Easy',
      pricing: 'Pay-as-you-go',
      href: '/docs/api-keys/openai',
    },
    {
      name: 'Claude (Anthropic)',
      icon: '🟣',
      description: 'Claude 2, Claude 3 (Opus, Sonnet, Haiku)',
      difficulty: 'Easy',
      pricing: 'Pay-as-you-go',
      href: '/docs/api-keys/claude',
    },
    {
      name: 'Gemini (Google)',
      icon: '🔴',
      description: 'Gemini Pro and Gemini Ultra models',
      difficulty: 'Easy',
      pricing: 'Free tier available',
      href: '/docs/api-keys/gemini',
    },
    {
      name: 'Azure OpenAI',
      icon: '☁️',
      description: 'Enterprise-grade OpenAI models',
      difficulty: 'Medium',
      pricing: 'Azure subscription',
      href: '/docs/api-keys/azure',
    },
    {
      name: 'Moonshot',
      icon: '🌙',
      description: 'Chinese AI models',
      difficulty: 'Easy',
      pricing: 'Pay-as-you-go',
      href: '/docs/api-keys/moonshot',
    },
    {
      name: 'DeepSeek',
      icon: '🔍',
      description: 'High-performance AI models',
      difficulty: 'Easy',
      pricing: 'Competitive pricing',
      href: '/docs/api-keys/deepseek',
    },
  ]

  return (
    <div className="py-12 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-12">
          <Link
            href="/docs"
            className="text-blue-600 hover:text-blue-700 inline-flex items-center mb-6"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Documentation
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            API Keys Configuration
          </h1>
          <p className="text-xl text-gray-600">
            Choose your AI provider and follow the setup guide to start translating
          </p>
        </div>

        {/* Quick Start */}
        <div className="max-w-4xl mx-auto mb-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Quick Start</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Choose an AI provider from the list below</li>
            <li>Sign up for an account and obtain an API key</li>
            <li>Open nextai translator settings</li>
            <li>Paste your API key and save</li>
            <li>Start translating!</li>
          </ol>
        </div>

        {/* Provider Cards */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Supported AI Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
              <Link
                key={provider.name}
                href={provider.href}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl" role="img" aria-label={provider.name}>
                    {provider.icon}
                  </span>
                  <svg
                    className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{provider.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{provider.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Setup: <span className="font-semibold">{provider.difficulty}</span>
                  </span>
                  <span className="text-gray-500">{provider.pricing}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="max-w-6xl mx-auto mt-12 bg-white rounded-xl p-8 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Provider Comparison</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Provider</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Free Tier
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Best For
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Setup Time
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">OpenAI</td>
                  <td className="py-3 px-4 text-gray-600">$5 credit</td>
                  <td className="py-3 px-4 text-gray-600">General purpose</td>
                  <td className="py-3 px-4 text-gray-600">5 min</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Claude</td>
                  <td className="py-3 px-4 text-gray-600">Limited free</td>
                  <td className="py-3 px-4 text-gray-600">Long contexts</td>
                  <td className="py-3 px-4 text-gray-600">5 min</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Gemini</td>
                  <td className="py-3 px-4 text-green-600 font-semibold">Yes</td>
                  <td className="py-3 px-4 text-gray-600">Free usage</td>
                  <td className="py-3 px-4 text-gray-600">3 min</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">Azure OpenAI</td>
                  <td className="py-3 px-4 text-gray-600">No</td>
                  <td className="py-3 px-4 text-gray-600">Enterprise</td>
                  <td className="py-3 px-4 text-gray-600">15 min</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="max-w-4xl mx-auto mt-12 bg-gray-100 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Issues</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                &quot;Invalid API Key&quot; Error
              </h3>
              <p className="text-gray-700">
                Make sure you copied the entire API key without extra spaces. Check that the key
                is active in your provider&apos;s dashboard.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                &quot;Rate Limit Exceeded&quot; Error
              </h3>
              <p className="text-gray-700">
                You&apos;ve reached your API usage limit. Wait for the limit to reset or upgrade
                your plan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Translation Not Working
              </h3>
              <p className="text-gray-700">
                Check your internet connection and ensure your API key has the necessary
                permissions. Visit our{' '}
                <Link href="/docs/troubleshooting" className="text-blue-600 hover:underline">
                  troubleshooting guide
                </Link>{' '}
                for more help.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
