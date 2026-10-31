import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('./CodeBlock', () => ({ CodeBlock: () => null }))
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))
vi.mock('../hooks/useTheme', async () => {
    const { LightTheme } = await import('baseui-sd/themes')
    return { useTheme: () => ({ theme: LightTheme, themeType: 'light' }) }
})
vi.mock('../hooks/useSettings', () => ({
    useSettings: () => ({ settings: { tts: {} }, isSettingsLoading: false }),
}))
import { Markdown } from './Markdown'
import { PhoneticText } from './PhoneticText'
import { HoverableText, WordHoverProvider } from './WordHoverCard'

const renderHoverableText = (text: string) => <HoverableText>{text}</HoverableText>

describe('GFM table rendering', () => {
    it('renders pipe tables as HTML tables instead of plain paragraph text', () => {
        const tableMarkdown = '| 代码 | 说明 |\n| --- | --- |\n| diff | 差值计数 |'
        const html = renderToStaticMarkup(<Markdown>{tableMarkdown}</Markdown>)
        expect(html).toContain('<table')
        expect(html).toContain('<th')
        expect(html).toContain('<td')
        expect(html).not.toContain('|')
    })
})

describe('GFM table styling', () => {
    const tableMarkdown = '| 代码 | 说明 |\n| --- | --- |\n| diff | 差值计数 |'

    it('draws cell borders, centers content, and bolds/darkens the header row', () => {
        const html = renderToStaticMarkup(<Markdown>{tableMarkdown}</Markdown>)
        expect(html).toContain('border-collapse:collapse')
        expect(html).toMatch(/<th[^>]*font-weight:600/)
        expect(html).toMatch(/<th[^>]*background-color:/)
        expect(html).toMatch(/<td[^>]*text-align:center/)
        expect(html).toMatch(/<td[^>]*vertical-align:middle/)
        expect(html).toMatch(/<td[^>]*word-break:break-word/)
    })

    it('keeps hoverable word spans inside styled table cells', () => {
        const html = renderToStaticMarkup(
            <WordHoverProvider enabled onOpenDetails={() => {}}>
                <Markdown renderText={renderHoverableText}>
                    {'| head | col |\n| --- | --- |\n| hello world | data |'}
                </Markdown>
            </WordHoverProvider>
        )
        expect(html).toMatch(/<td[^>]*>.*role="link"/)
    })
})

describe('hover cards + phonetics merge integration', () => {
    it('keeps hoverable word spans in markdown output when speech props are set', () => {
        const html = renderToStaticMarkup(
            <WordHoverProvider enabled onOpenDetails={() => {}}>
                <Markdown renderText={renderHoverableText} speechLang='en' speechText='hello world'>
                    {'hello world, this is a test paragraph'}
                </Markdown>
            </WordHoverProvider>
        )
        expect(html).toContain('role="link"')
        expect(html).toContain('hello')
    })

    it('keeps hoverable word spans in markdown output without speech props', () => {
        const html = renderToStaticMarkup(
            <WordHoverProvider enabled onOpenDetails={() => {}}>
                <Markdown renderText={renderHoverableText}>{'hello world'}</Markdown>
            </WordHoverProvider>
        )
        expect(html).toContain('role="link"')
    })

    it('keeps hoverable word spans inside example sentences', () => {
        const html = renderToStaticMarkup(
            <WordHoverProvider enabled onOpenDetails={() => {}}>
                <PhoneticText text='例句：How are you? (你好吗？)' lang='en' renderText={renderHoverableText} />
            </WordHoverProvider>
        )
        expect(html.match(/role="link"/g)?.length ?? 0).toBeGreaterThanOrEqual(3)
    })

    it('keeps hoverable word spans in plain-line PhoneticText output', () => {
        const html = renderToStaticMarkup(
            <WordHoverProvider enabled onOpenDetails={() => {}}>
                <PhoneticText text='hello · /həˈloʊ/ world' lang='en' renderText={renderHoverableText} />
            </WordHoverProvider>
        )
        expect(html).toContain('role="link"')
    })
})
