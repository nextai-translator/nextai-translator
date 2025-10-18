export type Platform = 'windows' | 'macos' | 'linux' | 'unknown'
export type Browser = 'chrome' | 'firefox' | 'safari' | 'edge' | 'other'

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown'

  const userAgent = window.navigator.userAgent.toLowerCase()

  if (userAgent.indexOf('win') !== -1) return 'windows'
  if (userAgent.indexOf('mac') !== -1) return 'macos'
  if (userAgent.indexOf('linux') !== -1) return 'linux'

  return 'unknown'
}

export function detectBrowser(): Browser {
  if (typeof window === 'undefined') return 'other'

  const userAgent = window.navigator.userAgent.toLowerCase()

  if (userAgent.indexOf('edg') !== -1) return 'edge'
  if (userAgent.indexOf('chrome') !== -1) return 'chrome'
  if (userAgent.indexOf('firefox') !== -1) return 'firefox'
  if (userAgent.indexOf('safari') !== -1) return 'safari'

  return 'other'
}

export interface DownloadOption {
  id: string
  name: string
  platform: Platform | 'extension'
  browser?: Browser
  url: string
  fileType?: string
  recommended?: boolean
}

export function getDownloadOptions(detectedPlatform: Platform, detectedBrowser: Browser): DownloadOption[] {
  const options: DownloadOption[] = [
    // Browser Extensions
    {
      id: 'chrome-extension',
      name: 'Chrome Extension',
      platform: 'extension',
      browser: 'chrome',
      url: 'https://chrome.google.com/webstore/detail/nextai-translator/TODO',
      recommended: detectedBrowser === 'chrome' || detectedBrowser === 'edge',
    },
    {
      id: 'firefox-extension',
      name: 'Firefox Add-on',
      platform: 'extension',
      browser: 'firefox',
      url: 'https://addons.mozilla.org/firefox/addon/nextai-translator/',
      recommended: detectedBrowser === 'firefox',
    },
    // Desktop Applications
    {
      id: 'windows-exe',
      name: 'Windows Installer',
      platform: 'windows',
      url: 'https://github.com/yetone/nextai-translator/releases/latest/download/nextai-translator-windows.exe',
      fileType: '.exe',
      recommended: detectedPlatform === 'windows',
    },
    {
      id: 'macos-dmg',
      name: 'macOS Installer',
      platform: 'macos',
      url: 'https://github.com/yetone/nextai-translator/releases/latest/download/nextai-translator-macos.dmg',
      fileType: '.dmg',
      recommended: detectedPlatform === 'macos',
    },
    {
      id: 'linux-appimage',
      name: 'Linux AppImage',
      platform: 'linux',
      url: 'https://github.com/yetone/nextai-translator/releases/latest/download/nextai-translator-linux.AppImage',
      fileType: '.AppImage',
      recommended: detectedPlatform === 'linux',
    },
  ]

  return options.sort((a, b) => {
    if (a.recommended && !b.recommended) return -1
    if (!a.recommended && b.recommended) return 1
    return 0
  })
}
