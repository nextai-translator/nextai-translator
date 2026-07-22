import ReactMarkdown from 'react-markdown'
import { CodeBlock } from './CodeBlock'
import { useTheme } from '../hooks/useTheme'
import { Children, createElement, HTMLAttributeAnchorTarget, HTMLAttributes, ReactNode, useMemo } from 'react'
import { LangCode } from '../lang'
import { TTSProvider } from '../tts/types'
import { PhoneticText } from './PhoneticText'

export interface IMarkdownProps {
    children: string
    linkTarget?: HTMLAttributeAnchorTarget
    renderText?: (text: string) => ReactNode
    speechLang?: LangCode
    speechText?: string
    ttsProvider?: TTSProvider
    ttsVoice?: string
    ttsRate?: number
    ttsVolume?: number
}

interface MarkdownElementProps extends HTMLAttributes<HTMLElement> {
    node?: unknown
}

export function Markdown({
    children,
    linkTarget,
    renderText,
    speechLang,
    speechText,
    ttsProvider,
    ttsVoice,
    ttsRate,
    ttsVolume,
}: IMarkdownProps) {
    const { theme } = useTheme()
    const renderedTextComponents = useMemo(() => {
        if (!renderText) return {}
        const renderChildren = (value: ReactNode) =>
            Children.map(value, (child) => (typeof child === 'string' ? renderText(child) : child))
        const withRenderedText = (tag: keyof JSX.IntrinsicElements) => {
            return function RenderedTextElement(componentProps: MarkdownElementProps) {
                const { children: elementChildren } = componentProps
                const props = { ...componentProps }
                // eslint-disable-next-line react/prop-types
                delete props.node
                delete props.children
                return createElement(tag, props, renderChildren(elementChildren as ReactNode))
            }
        }
        return {
            p: withRenderedText('p'),
            li: withRenderedText('li'),
            h1: withRenderedText('h1'),
            h2: withRenderedText('h2'),
            h3: withRenderedText('h3'),
            h4: withRenderedText('h4'),
            h5: withRenderedText('h5'),
            h6: withRenderedText('h6'),
            strong: withRenderedText('strong'),
            em: withRenderedText('em'),
            del: withRenderedText('del'),
            td: withRenderedText('td'),
            th: withRenderedText('th'),
        }
    }, [renderText])

    const renderPhonetics = (content: ReactNode) => {
        const renderChild = (child: string): ReactNode => {
            if (!speechLang) {
                return renderText ? renderText(child) : child
            }
            return (
                <PhoneticText
                    text={child}
                    fallbackText={speechText}
                    lang={speechLang}
                    provider={ttsProvider}
                    voice={ttsVoice}
                    rate={ttsRate}
                    volume={ttsVolume}
                    renderText={renderText}
                />
            )
        }
        return Children.map(content, (child) => (typeof child === 'string' ? renderChild(child) : child))
    }

    return (
        <ReactMarkdown
            components={{
                ...renderedTextComponents,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                p({ node, children, ...props }) {
                    return <p {...props}>{renderPhonetics(children)}</p>
                },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                li({ node, children, ...props }) {
                    return <li {...props}>{renderPhonetics(children)}</li>
                },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                a({ node, className, children, ...props }) {
                    const newProps = {
                        target: linkTarget,
                        ...props,
                    }
                    return <a {...newProps}>{children}</a>
                },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                code({ node, inline, className, children, ...props }) {
                    if (inline) {
                        return (
                            <code
                                {...props}
                                className={className}
                                style={{
                                    backgroundColor: theme.colors.backgroundSecondary,
                                    color: theme.colors.contentSecondary,
                                    padding: '0.2rem',
                                    borderRadius: '0.2rem',
                                }}
                            >
                                {children}
                            </code>
                        )
                    }
                    const match = /language-(\w+)/.exec(className || '')
                    let language = 'text'
                    if (match) {
                        language = match[1]
                    }
                    const code = (children as string[])[0]
                    return <CodeBlock code={code} language={language} />
                },
            }}
        >
            {children}
        </ReactMarkdown>
    )
}
