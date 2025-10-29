import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const README_JP_PATH = path.join(__dirname, '..', 'README-JP.md')
const README_EN_PATH = path.join(__dirname, '..', 'README.md')
const README_CN_PATH = path.join(__dirname, '..', 'README-CN.md')

describe('Japanese README - File Existence and Structure', () => {
    it('should have README-JP.md file in repository root', () => {
        const exists = fs.existsSync(README_JP_PATH)
        expect(exists).toBe(true)
    })

    it('should be readable and not empty', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content.length).toBeGreaterThan(0)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should have proper UTF-8 encoding for Japanese characters', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            // Check for Japanese characters (Hiragana, Katakana, Kanji)
            const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(content)
            expect(hasJapanese).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })
})

describe('Japanese README - Language Navigation Links', () => {
    it('should contain language navigation with English and Chinese links', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('README.md')
            expect(content).toContain('README-CN.md')
            expect(content).toContain('English')
            expect(content).toContain('中文')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should show 日本語 as current language (not as link)', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            // Should have 日本語 but NOT as a link
            expect(content).toContain('日本語')
            // Check that 日本語 is not wrapped in <a> tag
            const lines = content.split('\n').filter((line) => line.includes('日本語'))
            const hasJapaneseLink = lines.some((line) => line.includes('<a href="README-JP.md">日本語</a>'))
            expect(hasJapaneseLink).toBe(false)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('README.md should link to README-JP.md', () => {
        const content = fs.readFileSync(README_EN_PATH, 'utf-8')
        expect(content).toContain('README-JP.md')
        expect(content).toContain('日本語')
    })

    it('README-CN.md should link to README-JP.md', () => {
        const content = fs.readFileSync(README_CN_PATH, 'utf-8')
        expect(content).toContain('README-JP.md')
        expect(content).toContain('日本語')
    })
})

describe('Japanese README - Required Sections', () => {
    const requiredSections = [
        { en: 'Why Yet another Translator', jp: 'なぜ' },
        { en: 'More than just a browser extension', jp: 'ブラウザ拡張' },
        { en: 'More than just translation', jp: '翻訳' },
        { en: 'How to use', jp: '使' },
        { en: 'Features', jp: '機能' },
        { en: 'Preparation', jp: '準備' },
        { en: 'Installation', jp: 'インストール' },
        { en: 'Windows', jp: 'Windows' },
        { en: 'MacOS', jp: 'MacOS' },
        { en: 'Troubleshooting', jp: 'トラブル' },
        { en: 'License', jp: 'ライセンス' },
        { en: 'Star History', jp: 'スター' },
    ]

    requiredSections.forEach(({ en, jp }) => {
        it(`should contain section related to "${en}"`, () => {
            if (fs.existsSync(README_JP_PATH)) {
                const content = fs.readFileSync(README_JP_PATH, 'utf-8')
                expect(content).toContain(jp)
            } else {
                expect.fail('README-JP.md does not exist')
            }
        })
    })

    it('should contain trademark notice about Next AI Translator', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            // Should mention the trademark/rename
            const hasNotice =
                content.toLowerCase().includes('openai') || content.includes('nextai') || content.includes('Next AI')
            expect(hasNotice).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })
})

describe('Japanese README - Content Preservation', () => {
    it('should preserve all badge URLs', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('img.shields.io')
            expect(content).toContain('github.com')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should preserve Chrome Web Store link', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('chrome.google.com/webstore')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should preserve Firefox Add-ons link', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('addons.mozilla.org')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should preserve GitHub releases link', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('github.com/yetone/openai-translator/releases')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should preserve image references', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('user-images.githubusercontent.com')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should preserve Azure OpenAI configuration code block', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('resourceName')
            expect(content).toContain('deployName')
            expect(content).toContain('openai.azure.com')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should preserve xattr command for macOS troubleshooting', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('xattr')
            expect(content).toContain('com.apple.quarantine')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should preserve Star History section with chart', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('star-history.com')
            expect(content).toContain('api.star-history.com/svg')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })
})

describe('Japanese README - Translation Quality and Technical Terms', () => {
    const technicalTerms = [
        { en: 'API', jp: 'API' }, // Should be preserved
        { en: 'Browser', jp: 'ブラウザ' },
        { en: 'Desktop', jp: 'デスクトップ' },
        { en: 'Windows', jp: 'Windows' }, // Should be preserved
        { en: 'macOS', jp: 'macOS' }, // Should be preserved
        { en: 'Linux', jp: 'Linux' }, // Should be preserved
    ]

    technicalTerms.forEach(({ en, jp }) => {
        it(`should use appropriate Japanese term for "${en}"`, () => {
            if (fs.existsSync(README_JP_PATH)) {
                const content = fs.readFileSync(README_JP_PATH, 'utf-8')
                expect(content).toContain(jp)
            } else {
                expect.fail('README-JP.md does not exist')
            }
        })
    })

    it('should use polite form (です/ます) in Japanese text', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            // Look for common polite forms
            const hasPoliteForm = content.includes('です') || content.includes('ます') || content.includes('ました')
            expect(hasPoliteForm).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })
})

describe('Japanese README - Markdown Formatting', () => {
    it('should have proper markdown headers', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            const hasHeaders = /^#{1,6}\s+/m.test(content)
            expect(hasHeaders).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should have proper code blocks with syntax highlighting', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            const hasCodeBlocks = /```[a-z]*\n[\s\S]*?\n```/.test(content)
            expect(hasCodeBlocks).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should have proper image markdown syntax', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            const hasImages = /!\[.*?\]\(.*?\)/.test(content) || /<img.*?src=.*?\/?>/.test(content)
            expect(hasImages).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should have proper link markdown syntax', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            const hasLinks = /\[.*?\]\(.*?\)/.test(content) || /<a.*?href=.*?>/.test(content)
            expect(hasLinks).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should preserve HTML alignment tags', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('<p align="center">')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })
})

describe('Japanese README - Feature List Completeness', () => {
    const features = [
        'translation', // 翻訳
        'polishing', // 文章改善/推敲
        'summarization', // 要約
        '55', // 55 languages
        'streaming', // ストリーミング
        'TTS', // 音声読み上げ
        'screenshot', // スクリーンショット
        'vocabulary', // 単語帳
    ]

    features.forEach((feature) => {
        it(`should mention feature: ${feature}`, () => {
            if (fs.existsSync(README_JP_PATH)) {
                const content = fs.readFileSync(README_JP_PATH, 'utf-8')
                const contentLower = content.toLowerCase()
                expect(contentLower).toContain(feature.toLowerCase())
            } else {
                expect.fail('README-JP.md does not exist')
            }
        })
    })
})

describe('Japanese README - Installation Instructions', () => {
    it('should have Windows installation instructions', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('Windows')
            expect(content).toContain('.exe')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should have macOS installation instructions', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('MacOS')
            expect(content).toContain('.dmg')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should mention Apple Silicon and aarch64', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            const hasAppleSilicon = content.includes('Apple Silicon') || content.includes('aarch64')
            expect(hasAppleSilicon).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should have browser extension installation section', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            const hasBrowserSection =
                content.includes('ブラウザ') && (content.includes('拡張') || content.includes('エクステンション'))
            expect(hasBrowserSection).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })
})

describe('Japanese README - API Configuration', () => {
    it('should mention OpenAI API Key', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('OpenAI')
            expect(content).toContain('API')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should mention Azure OpenAI Service', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            expect(content).toContain('Azure')
            expect(content).toContain('OpenAI')
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })

    it('should have configuration examples with TypeScript code', () => {
        if (fs.existsSync(README_JP_PATH)) {
            const content = fs.readFileSync(README_JP_PATH, 'utf-8')
            const hasTSCode = content.includes('```ts') || content.includes('```typescript')
            expect(hasTSCode).toBe(true)
        } else {
            expect.fail('README-JP.md does not exist')
        }
    })
})
