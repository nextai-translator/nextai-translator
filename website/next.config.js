/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');

const nextConfig = {
  reactStrictMode: true,
  i18n,
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true,
};

module.exports = nextConfig;
