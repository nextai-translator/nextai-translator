// Analytics wrapper for tracking events
// Can be configured to use Google Analytics, Plausible, or other services

export function trackEvent(
  eventName: string,
  parameters?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined') return

  // Google Analytics 4
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, parameters)
  }

  // Plausible
  if (typeof window.plausible !== 'undefined') {
    window.plausible(eventName, { props: parameters })
  }

  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, parameters)
  }
}

export function trackPageView(url: string) {
  trackEvent('page_view', { page_path: url })
}

export function trackDownload(platform: string, source: string) {
  trackEvent('download_click', { platform, source })
}

export function trackLanguageChange(language: string) {
  trackEvent('language_change', { language })
}

export function trackExternalLink(url: string, label: string) {
  trackEvent('external_link_click', { url, label })
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    plausible?: (eventName: string, options?: { props?: Record<string, unknown> }) => void
  }
}
