import Head from 'next/head'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  type?: string
}

export default function SEO({ title, description, image, type = 'website' }: SEOProps) {
  const { t } = useTranslation('common')
  const router = useRouter()

  const siteTitle = t('siteTitle')
  const siteDescription = description || t('siteDescription')
  const pageTitle = title ? `${title} | ${siteTitle}` : siteTitle
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nextai-translator.com'
  const currentUrl = `${siteUrl}${router.asPath}`
  const ogImage = image || `${siteUrl}/og-image.png`

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={siteDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <link rel="canonical" href={currentUrl} />

      {/* Language alternates */}
      <link rel="alternate" hrefLang="en" href={`${siteUrl}/en${router.pathname}`} />
      <link rel="alternate" hrefLang="zh" href={`${siteUrl}/zh${router.pathname}`} />
      <link rel="alternate" hrefLang="x-default" href={`${siteUrl}/en${router.pathname}`} />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: siteTitle,
            description: siteDescription,
            applicationCategory: 'ProductivityApplication',
            operatingSystem: 'Windows, macOS, Linux, Chrome, Firefox',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency': 'USD',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.8',
              ratingCount: '1000',
            },
          }),
        }}
      />
    </Head>
  )
}
