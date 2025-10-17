/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            changeLanguage: () => new Promise(() => {}),
        },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: {
        type: '3rdParty',
        init: () => {},
    },
}))

// Mock Dexie and dexie-react-hooks
vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: (querier: () => unknown) => {
        try {
            return querier()
        } catch {
            return []
        }
    },
}))

vi.mock('../common/internal-services/db', () => ({
    getLocalDB: () => ({
        recentActivity: {
            add: vi.fn(),
            clear: vi.fn(),
            count: vi.fn().mockResolvedValue(0),
            orderBy: vi.fn().mockReturnValue({
                reverse: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([]),
                    }),
                }),
                limit: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([]),
                }),
            }),
            bulkDelete: vi.fn(),
        },
    }),
}))

// Mock react-icons - return React elements
vi.mock('react-icons/ri', () => ({
    RiTranslate: () => React.createElement('span', null, 'RiTranslate'),
    RiQuillPenLine: () => React.createElement('span', null, 'RiQuillPenLine'),
    RiArticleLine: () => React.createElement('span', null, 'RiArticleLine'),
    RiSettings3Line: () => React.createElement('span', null, 'RiSettings3Line'),
    RiBookOpenLine: () => React.createElement('span', null, 'RiBookOpenLine'),
}))

// Mock LogoWithText component - return React element
vi.mock('../common/components/LogoWithText', () => ({
    default: () => React.createElement('div', null, 'LogoWithText'),
}))

// Mock useSettings hook
vi.mock('../common/hooks/useSettings', () => ({
    useSettings: () => ({
        settings: {
            showRecentActivity: true,
            defaultLandingPage: 'homepage',
        },
    }),
}))

// Mock useTheme hook
vi.mock('../common/hooks/useTheme', () => ({
    useTheme: () => ({
        theme: {
            colors: {
                backgroundPrimary: '#ffffff',
                backgroundSecondary: '#f5f5f5',
                backgroundTertiary: '#e0e0e0',
                contentPrimary: '#000000',
                contentSecondary: '#666666',
                primary: '#0066cc',
            },
            sizing: {
                scale300: '8px',
                scale400: '12px',
                scale600: '16px',
                scale800: '24px',
            },
            lighting: {
                shadow600: '0 2px 4px rgba(0,0,0,0.2)',
            },
            borders: {
                radius300: '4px',
            },
        },
        themeType: 'light',
    }),
}))

// Mock Jotai atoms
vi.mock('jotai', () => ({
    atom: (initialValue: unknown) => ({ init: initialValue }),
    useAtom: (atom: { init: unknown }) => [atom.init, vi.fn()],
}))

// Mock BaseUI components that might be causing issues
const Card = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('div', { ...props, ref, 'data-testid': 'mock-card' }, children)
)
Card.displayName = 'Card'

const Button = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('button', { ...props, ref }, children)
)
Button.displayName = 'Button'

const Input = React.forwardRef((props: any, ref: any) => React.createElement('input', { ...props, ref }))
Input.displayName = 'Input'

const Select = React.forwardRef((props: any, ref: any) => React.createElement('select', { ...props, ref }))
Select.displayName = 'Select'

const HeadingLarge = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('h1', { ...props, ref }, children)
)
HeadingLarge.displayName = 'HeadingLarge'

const HeadingXSmall = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('h4', { ...props, ref }, children)
)
HeadingXSmall.displayName = 'HeadingXSmall'

const ParagraphMedium = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('p', { ...props, ref }, children)
)
ParagraphMedium.displayName = 'ParagraphMedium'

const ParagraphSmall = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('p', { ...props, ref }, children)
)
ParagraphSmall.displayName = 'ParagraphSmall'

const LabelSmall = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('label', { ...props, ref }, children)
)
LabelSmall.displayName = 'LabelSmall'

vi.mock('baseui-sd/card', () => ({ Card }))
vi.mock('baseui-sd/button', () => ({
    Button,
    SIZE: { compact: 'compact', mini: 'mini' },
    KIND: { secondary: 'secondary', tertiary: 'tertiary', primary: 'primary' },
}))
vi.mock('baseui-sd/input', () => ({ Input }))
vi.mock('baseui-sd/select', () => ({ Select }))
vi.mock('baseui-sd/typography', () => ({
    HeadingLarge,
    HeadingXSmall,
    ParagraphMedium,
    ParagraphSmall,
    LabelSmall,
}))

vi.mock('baseui-sd', () => ({
    useStyletron: () => [
        () => 'mock-class',
        {
            colors: {
                backgroundPrimary: '#ffffff',
                backgroundSecondary: '#f5f5f5',
                backgroundTertiary: '#e0e0e0',
                contentPrimary: '#000000',
                contentSecondary: '#666666',
                primary: '#0066cc',
            },
            sizing: {
                scale200: '4px',
                scale300: '8px',
                scale400: '12px',
                scale600: '16px',
                scale800: '24px',
            },
            lighting: {
                shadow600: '0 2px 4px rgba(0,0,0,0.2)',
            },
            borders: {
                radius300: '4px',
            },
        },
    ],
}))
