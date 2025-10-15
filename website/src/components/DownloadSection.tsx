import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import {
  FaChrome,
  FaFirefox,
  FaSafari,
  FaWindows,
  FaApple,
  FaLinux,
  FaCode,
  FaDownload,
  FaExternalLinkAlt,
} from 'react-icons/fa';

interface Platform {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  requirementsKey: string;
  downloadLink: string;
  isStore: boolean;
}

export default function DownloadSection() {
  const { t } = useTranslation('common');
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  useEffect(() => {
    // Platform detection
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (platform.includes('win')) {
      setDetectedPlatform('windows');
    } else if (platform.includes('mac')) {
      if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        setDetectedPlatform('safari');
      } else {
        setDetectedPlatform('macos');
      }
    } else if (platform.includes('linux')) {
      setDetectedPlatform('linux');
    } else if (userAgent.includes('chrome')) {
      setDetectedPlatform('chrome');
    } else if (userAgent.includes('firefox')) {
      setDetectedPlatform('firefox');
    }
  }, []);

  const platforms: Platform[] = [
    {
      id: 'chrome',
      icon: <FaChrome className="w-12 h-12" />,
      titleKey: 'download.chrome.title',
      descriptionKey: 'download.chrome.description',
      requirementsKey: 'download.chrome.requirements',
      downloadLink: 'https://chrome.google.com/webstore',
      isStore: true,
    },
    {
      id: 'firefox',
      icon: <FaFirefox className="w-12 h-12" />,
      titleKey: 'download.firefox.title',
      descriptionKey: 'download.firefox.description',
      requirementsKey: 'download.firefox.requirements',
      downloadLink: 'https://addons.mozilla.org/firefox/',
      isStore: true,
    },
    {
      id: 'safari',
      icon: <FaSafari className="w-12 h-12" />,
      titleKey: 'download.safari.title',
      descriptionKey: 'download.safari.description',
      requirementsKey: 'download.safari.requirements',
      downloadLink: 'https://github.com/openai-translator/openai-translator/releases',
      isStore: false,
    },
    {
      id: 'windows',
      icon: <FaWindows className="w-12 h-12" />,
      titleKey: 'download.windows.title',
      descriptionKey: 'download.windows.description',
      requirementsKey: 'download.windows.requirements',
      downloadLink: 'https://github.com/openai-translator/openai-translator/releases',
      isStore: false,
    },
    {
      id: 'macos',
      icon: <FaApple className="w-12 h-12" />,
      titleKey: 'download.macos.title',
      descriptionKey: 'download.macos.description',
      requirementsKey: 'download.macos.requirements',
      downloadLink: 'https://github.com/openai-translator/openai-translator/releases',
      isStore: false,
    },
    {
      id: 'linux',
      icon: <FaLinux className="w-12 h-12" />,
      titleKey: 'download.linux.title',
      descriptionKey: 'download.linux.description',
      requirementsKey: 'download.linux.requirements',
      downloadLink: 'https://github.com/openai-translator/openai-translator/releases',
      isStore: false,
    },
    {
      id: 'userscript',
      icon: <FaCode className="w-12 h-12" />,
      titleKey: 'download.userscript.title',
      descriptionKey: 'download.userscript.description',
      requirementsKey: 'download.userscript.requirements',
      downloadLink: 'https://github.com/openai-translator/openai-translator/releases',
      isStore: false,
    },
  ];

  return (
    <section id="download" className="py-20 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('download.title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t('download.subtitle')}
          </p>
        </div>

        {/* Platforms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className={`relative p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl ${
                detectedPlatform === platform.id
                  ? 'border-primary ring-4 ring-primary/20'
                  : 'border-transparent hover:border-primary'
              }`}
            >
              {/* Recommended Badge */}
              {detectedPlatform === platform.id && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold shadow-md">
                  {t('download.recommended')}
                </div>
              )}

              {/* Platform Icon */}
              <div className="flex justify-center mb-4 text-primary">
                {platform.icon}
              </div>

              {/* Platform Info */}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
                {t(platform.titleKey)}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-3 text-center text-sm">
                {t(platform.descriptionKey)}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-center text-xs">
                {t(platform.requirementsKey)}
              </p>

              {/* Download Button */}
              <a
                href={platform.downloadLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                {platform.isStore ? (
                  <>
                    <FaExternalLinkAlt className="mr-2" />
                    {t('download.viewOnStore')}
                  </>
                ) : (
                  <>
                    <FaDownload className="mr-2" />
                    {t('download.downloadButton')}
                  </>
                )}
              </a>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            All versions are open source and available on{' '}
            <a
              href="https://github.com/openai-translator/openai-translator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-dark underline font-semibold"
            >
              GitHub
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
