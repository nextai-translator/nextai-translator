import React, { useState } from 'react'
import { useStyletron } from 'baseui-sd'
import { Card } from 'baseui-sd/card'
import { Button, SIZE, KIND } from 'baseui-sd/button'
import { Input } from 'baseui-sd/input'
import { Select } from 'baseui-sd/select'
import { HeadingXSmall, ParagraphSmall } from 'baseui-sd/typography'
import { useTranslation } from 'react-i18next'
import { TranslateMode } from '../translate'
import { supportLanguages } from '../lang'

export interface QuickActionCardProps {
    type: TranslateMode
    icon?: React.ReactNode
    onAction: (text: string, targetLang?: string) => void
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({ type, icon, onAction }) => {
    const [css, theme] = useStyletron()
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState(false)
    const [text, setText] = useState('')
    const [targetLang, setTargetLang] = useState([{ id: 'en', label: 'English' }])

    const getTitleKey = () => {
        switch (type) {
            case 'translate':
                return 'Translate'
            case 'polishing':
                return 'Polishing'
            case 'summarize':
                return 'Summarize'
            default:
                return 'Action'
        }
    }

    const getDescriptionKey = () => {
        switch (type) {
            case 'translate':
                return 'homepage.quickActions.translate.description'
            case 'polishing':
                return 'homepage.quickActions.polish.description'
            case 'summarize':
                return 'homepage.quickActions.summarize.description'
            default:
                return ''
        }
    }

    const handleCardClick = () => {
        if (!expanded) {
            setExpanded(true)
        }
    }

    const handleSubmit = () => {
        if (text.trim()) {
            const lang = type === 'translate' ? targetLang[0]?.id : undefined
            onAction(text, lang)
            setText('')
            setExpanded(false)
        }
    }

    const languageOptions = supportLanguages.map((lang) => ({
        id: lang.code,
        label: lang.name,
    }))

    return (
        <Card
            overrides={{
                Root: {
                    style: {
                        'width': '100%',
                        'cursor': expanded ? 'default' : 'pointer',
                        'transition': 'all 0.3s ease',
                        ':hover': {
                            boxShadow: theme.lighting.shadow600,
                        },
                    },
                },
            }}
            onClick={handleCardClick}
        >
            <div
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.sizing.scale400,
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.sizing.scale300,
                    })}
                >
                    {icon && (
                        <div
                            className={css({
                                fontSize: '24px',
                                display: 'flex',
                                alignItems: 'center',
                            })}
                        >
                            {icon}
                        </div>
                    )}
                    <HeadingXSmall margin={0}>{t(getTitleKey())}</HeadingXSmall>
                </div>

                {!expanded && (
                    <ParagraphSmall margin={0} color={theme.colors.contentSecondary}>
                        {t(getDescriptionKey())}
                    </ParagraphSmall>
                )}

                {expanded && (
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: theme.sizing.scale400,
                        })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Input
                            value={text}
                            onChange={(e) => setText((e.target as HTMLInputElement).value)}
                            placeholder={t('homepage.quickActions.inputPlaceholder')}
                            overrides={{
                                Root: {
                                    style: {
                                        width: '100%',
                                    },
                                },
                                Input: {
                                    style: {
                                        minHeight: '80px',
                                    },
                                    props: {
                                        as: 'textarea',
                                    },
                                },
                            }}
                        />

                        {type === 'translate' && (
                            <Select
                                options={languageOptions}
                                value={targetLang}
                                placeholder={t('homepage.quickActions.selectLanguage')}
                                onChange={(params) => setTargetLang(params.value as typeof targetLang)}
                                overrides={{
                                    Root: {
                                        style: {
                                            width: '100%',
                                        },
                                    },
                                }}
                            />
                        )}

                        <div
                            className={css({
                                display: 'flex',
                                gap: theme.sizing.scale300,
                                justifyContent: 'flex-end',
                            })}
                        >
                            <Button size={SIZE.compact} kind={KIND.secondary} onClick={() => setExpanded(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button size={SIZE.compact} onClick={handleSubmit} disabled={!text.trim()}>
                                {t('Submit')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
