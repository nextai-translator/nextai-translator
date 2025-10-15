import { useTranslation } from 'next-i18next';
import {
  FaLanguage,
  FaMagic,
  FaFileAlt,
  FaBolt,
  FaImage,
  FaBook,
  FaVolumeUp,
  FaSearchLocation,
} from 'react-icons/fa';

interface Feature {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

export default function FeaturesSection() {
  const { t } = useTranslation('common');

  const features: Feature[] = [
    {
      icon: <FaLanguage className="w-8 h-8" />,
      titleKey: 'features.translation.title',
      descriptionKey: 'features.translation.description',
    },
    {
      icon: <FaMagic className="w-8 h-8" />,
      titleKey: 'features.polishing.title',
      descriptionKey: 'features.polishing.description',
    },
    {
      icon: <FaFileAlt className="w-8 h-8" />,
      titleKey: 'features.summarization.title',
      descriptionKey: 'features.summarization.description',
    },
    {
      icon: <FaBolt className="w-8 h-8" />,
      titleKey: 'features.streaming.title',
      descriptionKey: 'features.streaming.description',
    },
    {
      icon: <FaImage className="w-8 h-8" />,
      titleKey: 'features.ocr.title',
      descriptionKey: 'features.ocr.description',
    },
    {
      icon: <FaBook className="w-8 h-8" />,
      titleKey: 'features.vocabulary.title',
      descriptionKey: 'features.vocabulary.description',
    },
    {
      icon: <FaVolumeUp className="w-8 h-8" />,
      titleKey: 'features.tts.title',
      descriptionKey: 'features.tts.description',
    },
    {
      icon: <FaSearchLocation className="w-8 h-8" />,
      titleKey: 'features.detection.title',
      descriptionKey: 'features.detection.description',
    },
  ];

  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {t('features.subtitle')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 bg-gray-50 dark:bg-gray-900 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-transparent hover:border-primary"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-primary text-white rounded-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t(feature.titleKey)}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {t(feature.descriptionKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
