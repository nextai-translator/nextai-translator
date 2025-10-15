module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-CN', 'zh-TW'],
    localeDetection: true,
  },
  fallbackLng: {
    'zh-CN': ['zh-CN', 'en'],
    'zh-TW': ['zh-TW', 'zh-CN', 'en'],
    default: ['en'],
  },
  localePath: './public/locales',
};
