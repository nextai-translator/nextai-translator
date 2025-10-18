import { describe, it, expect, beforeEach, vi } from 'vitest'
import { detectPlatform, detectBrowser, getDownloadOptions } from '@/lib/platform-detect'

describe('Platform Detection', () => {
  beforeEach(() => {
    // Reset window.navigator for each test
    vi.stubGlobal('window', { navigator: { userAgent: '' } })
  })

  describe('detectPlatform', () => {
    it('should detect Windows', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
      })
      expect(detectPlatform()).toBe('windows')
    })

    it('should detect macOS', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        writable: true,
      })
      expect(detectPlatform()).toBe('macos')
    })

    it('should detect Linux', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64)',
        writable: true,
      })
      expect(detectPlatform()).toBe('linux')
    })

    it('should return unknown for unrecognized platforms', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Unknown Device',
        writable: true,
      })
      expect(detectPlatform()).toBe('unknown')
    })
  })

  describe('detectBrowser', () => {
    it('should detect Chrome', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: true,
      })
      expect(detectBrowser()).toBe('chrome')
    })

    it('should detect Firefox', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        writable: true,
      })
      expect(detectBrowser()).toBe('firefox')
    })

    it('should detect Edge', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        writable: true,
      })
      expect(detectBrowser()).toBe('edge')
    })
  })

  describe('getDownloadOptions', () => {
    it('should recommend Chrome extension for Chrome users', () => {
      const options = getDownloadOptions('windows', 'chrome')
      const chromeOption = options.find((opt) => opt.id === 'chrome-extension')
      expect(chromeOption?.recommended).toBe(true)
    })

    it('should recommend Windows installer for Windows users', () => {
      const options = getDownloadOptions('windows', 'other')
      const windowsOption = options.find((opt) => opt.id === 'windows-exe')
      expect(windowsOption?.recommended).toBe(true)
    })

    it('should return all download options', () => {
      const options = getDownloadOptions('unknown', 'other')
      expect(options.length).toBeGreaterThan(0)
      expect(options.some((opt) => opt.platform === 'extension')).toBe(true)
      expect(options.some((opt) => opt.platform === 'windows')).toBe(true)
      expect(options.some((opt) => opt.platform === 'macos')).toBe(true)
      expect(options.some((opt) => opt.platform === 'linux')).toBe(true)
    })
  })
})
