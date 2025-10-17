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
vi.mock('baseui-sd/card', () => ({
    Card: ({ children, ...props }: any) =>
        React.createElement('div', { ...props, 'data-testid': 'mock-card' }, children),
}))

vi.mock('baseui-sd/button', () => ({
    Button: ({ children, ...props }: any) => React.createElement('button', props, children),
    SIZE: { compact: 'compact', mini: 'mini' },
    KIND: { secondary: 'secondary', tertiary: 'tertiary' },
}))

vi.mock('baseui-sd/input', () => ({
    Input: (props: any) => React.createElement('input', props),
}))

vi.mock('baseui-sd/select', () => ({
    Select: (props: any) => React.createElement('select', props),
}))

vi.mock('baseui-sd/typography', () => ({
    HeadingLarge: ({ children, ...props }: any) => React.createElement('h1', props, children),
    HeadingXSmall: ({ children, ...props }: any) => React.createElement('h4', props, children),
    ParagraphMedium: ({ children, ...props }: any) => React.createElement('p', props, children),
    ParagraphSmall: ({ children, ...props }: any) => React.createElement('p', props, children),
    LabelSmall: ({ children, ...props }: any) => React.createElement('label', props, children),
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
