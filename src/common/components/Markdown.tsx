import ReactMarkdown from 'react-markdown'
import { CodeBlock } from './CodeBlock'
import { useTheme } from '../hooks/useTheme'
import { Children, HTMLAttributeAnchorTarget, ReactNode } from 'react'
import { LangCode } from '../lang'
import { TTSProvider } from '../tts/types'
import { PhoneticText } from './PhoneticText'

export interface IMarkdownProps {
    children: string
    linkTarget?: HTMLAttributeAnchorTarget
    speechLang?: LangCode
    speechText?: string
    ttsProvider?: TTSProvider
    ttsVoice?: string
    ttsRate?: number
    ttsVolume?: number
}

export function Markdown({
    children,
    linkTarget,
    speechLang,
    speechText,
    ttsProvider,
    ttsVoice,
    ttsRate,
    ttsVolume,
}: IMarkdownProps) {
    const { theme } = useTheme()
    const renderPhonetics = (content: ReactNode) => {
        if (!speechLang) {
            return content
        }
        return Children.map(content, (child) =>
            typeof child === 'string' ? (
                <PhoneticText
                    text={child}
                    fallbackText={speechText}
                    lang={speechLang}
                    provider={ttsProvider}
                    voice={ttsVoice}
                    rate={ttsRate}
                    volume={ttsVolume}
                />
            ) : (
                child
            )
        )
    }

    return (
        <ReactMarkdown
            components={{
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
