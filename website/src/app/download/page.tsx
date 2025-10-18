'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import {
  detectPlatform,
  detectBrowser,
  getDownloadOptions,
  type Platform,
  type Browser,
  type DownloadOption,
} from '@/lib/platform-detect'
import { getLatestRelease, type GitHubRelease } from '@/lib/github'
import { trackDownload } from '@/lib/analytics'

export default function DownloadPage() {
  const { t } = useTranslation(['download', 'common'])
  const [platform, setPlatform] = useState<Platform>('unknown')
  const [browser, setBrowser] = useState<Browser>('other')
  const [options, setOptions] = useState<DownloadOption[]>([])
  const [release, setRelease] = useState<GitHubRelease | null>(null)

  useEffect(() => {
    const detectedPlatform = detectPlatform()
    const detectedBrowser = detectBrowser()
    setPlatform(detectedPlatform)
    setBrowser(detectedBrowser)
    setOptions(getDownloadOptions(detectedPlatform, detectedBrowser))
    getLatestRelease().then(setRelease)
  }, [])

  const handleDownload = (option: DownloadOption) => {
    trackDownload(option.platform, 'download_page')
  }

  const recommendedOptions = options.filter((opt) => opt.recommended)
  const otherOptions = options.filter((opt) => !opt.recommended)

  return (
    <div className="py-12 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Download nextai translator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the best version for your platform and start translating today
          </p>
          {release && (
            <p className="text-sm text-gray-500 mt-4">
              Latest version: <span className="font-semibold">{release.tag_name}</span> •{' '}
              Released on {new Date(release.published_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Recommended Downloads */}
        {recommendedOptions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Recommended for You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {recommendedOptions.map((option) => (
                <div
                  key={option.id}
                  className="bg-white rounded-xl p-8 shadow-lg border-2 border-blue-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{option.name}</h3>
                      {option.fileType && (
                        <span className="text-sm text-gray-500">{option.fileType}</span>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Detected: {platform !== 'unknown' ? platform : 'your system'} •{' '}
                    {browser !== 'other' ? browser : 'your browser'}
                  </p>
                  <a
                    href={option.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-blue-600 text-white text-center px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    onClick={() => handleDownload(option)}
                  >
                    Download Now
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Download Options */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            All Download Options
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {options.map((option) => (
              <div
                key={option.id}
                className={`bg-white rounded-xl p-6 shadow-md border ${
                  option.recommended ? 'border-blue-200' : 'border-gray-200'
                } hover:shadow-lg transition-shadow`}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{option.name}</h3>
                {option.fileType && (
                  <span className="text-sm text-gray-500 block mb-4">{option.fileType}</span>
                )}
                <a
                  href={option.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gray-800 text-white text-center px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors font-medium"
                  onClick={() => handleDownload(option)}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="max-w-4xl mx-auto bg-white rounded-xl p-8 shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Installation Instructions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Browser Extensions (Chrome, Edge, Firefox)
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Click on the extension store link above</li>
                <li>Click "Add to Chrome/Firefox" button</li>
                <li>Confirm the installation</li>
                <li>The extension icon will appear in your browser toolbar</li>
                <li>
                  Click the icon and follow the{' '}
                  <Link href="/docs/api-keys" className="text-blue-600 hover:underline">
                    API key setup guide
                  </Link>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Desktop Apps (Windows, macOS, Linux)
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Download the installer for your operating system</li>
                <li>
                  <strong>Windows:</strong> Run the .exe file and follow the installation wizard
                </li>
                <li>
                  <strong>macOS:</strong> Open the .dmg file and drag the app to Applications
                </li>
                <li>
                  <strong>Linux:</strong> Make the AppImage executable and run it
                </li>
                <li>Launch the application and configure your AI provider API keys</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-gray-700">
                Check out our{' '}
                <Link href="/docs" className="text-blue-600 hover:underline">
                  documentation
                </Link>{' '}
                or visit{' '}
                <a
                  href="https://github.com/yetone/nextai-translator/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub Discussions
                </a>{' '}
                for support.
              </p>
            </div>
          </div>
        </div>

        {/* System Requirements */}
        <div className="max-w-4xl mx-auto mt-8 bg-gray-100 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">System Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Windows</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>Windows 10 or later</li>
                <li>64-bit processor</li>
                <li>200 MB disk space</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">macOS</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>macOS 10.15 or later</li>
                <li>Intel or Apple Silicon</li>
                <li>200 MB disk space</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Linux</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>Modern Linux distribution</li>
                <li>64-bit processor</li>
                <li>200 MB disk space</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
