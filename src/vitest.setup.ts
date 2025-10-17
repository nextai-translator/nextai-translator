import { vi } from 'vitest'
import '@testing-library/jest-dom'

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

// Mock react-icons
vi.mock('react-icons/ri', () => ({
    RiTranslate: () => 'RiTranslate',
    RiQuillPenLine: () => 'RiQuillPenLine',
    RiArticleLine: () => 'RiArticleLine',
    RiSettings3Line: () => 'RiSettings3Line',
    RiBookOpenLine: () => 'RiBookOpenLine',
}))

// Mock LogoWithText component
vi.mock('../common/components/LogoWithText', () => ({
    default: () => 'LogoWithText',
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
