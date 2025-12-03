import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProviderStatus } from '../components/ProviderStatus'
import { Provider } from '../engines'

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}))

// Mock useTheme hook
vi.mock('../hooks/useTheme', () => ({
    useTheme: () => ({
        theme: {
            colors: {
                backgroundPrimary: '#ffffff',
                backgroundSecondary: '#f5f5f5',
                backgroundTertiary: '#eeeeee',
                contentPrimary: '#000000',
                contentSecondary: '#666666',
                contentTertiary: '#999999',
                borderOpaque: '#dddddd',
                accent: '#007bff',
                warning: '#ff9800',
            },
        },
        themeType: 'light',
    }),
}))

// Mock the engine icons
vi.mock('../engines', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../engines')>()
    return {
        ...actual,
        engineIcons: {
            OpenAI: () => <svg data-testid='openai-icon' />,
            ChatGPT: () => <svg data-testid='chatgpt-icon' />,
            Azure: () => <svg data-testid='azure-icon' />,
            MiniMax: () => <svg data-testid='minimax-icon' />,
            Moonshot: () => <svg data-testid='moonshot-icon' />,
            Gemini: () => <svg data-testid='gemini-icon' />,
            Ollama: () => <svg data-testid='ollama-icon' />,
            Groq: () => <svg data-testid='groq-icon' />,
            Claude: () => <svg data-testid='claude-icon' />,
            Kimi: () => <svg data-testid='kimi-icon' />,
            ChatGLM: () => <svg data-testid='chatglm-icon' />,
            Cohere: () => <svg data-testid='cohere-icon' />,
            DeepSeek: () => <svg data-testid='deepseek-icon' />,
            Cerebras: () => <svg data-testid='cerebras-icon' />,
        },
    }
})

describe('ProviderStatus - AI Provider Status Display (REQ-6)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // Test Case 1: Render Homepage with OpenAI configured as provider
    describe('Test Case 1: OpenAI provider configured', () => {
        it('should display OpenAI provider name when OpenAI is configured', () => {
            render(<ProviderStatus provider='OpenAI' />)

            expect(screen.getByText('OpenAI')).toBeInTheDocument()
        })

        it('should display OpenAI icon when OpenAI is configured', () => {
            render(<ProviderStatus provider='OpenAI' />)

            expect(screen.getByTestId('provider-icon')).toBeInTheDocument()
        })

        it('should have provider status container', () => {
            render(<ProviderStatus provider='OpenAI' />)

            expect(screen.getByTestId('provider-status')).toBeInTheDocument()
        })
    })

    // Test Case 2: Render Homepage with no provider configured
    describe('Test Case 2: No provider configured', () => {
        it('should display warning message when no provider is configured', () => {
            render(<ProviderStatus provider={undefined} />)

            expect(screen.getByText('Configure AI Provider')).toBeInTheDocument()
        })

        it('should display warning icon when no provider is configured', () => {
            render(<ProviderStatus provider={undefined} />)

            expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
        })

        it('should have warning styling when no provider is configured', () => {
            render(<ProviderStatus provider={undefined} />)

            const container = screen.getByTestId('provider-status')
            expect(container).toHaveAttribute('data-warning', 'true')
        })

        it('should display prompt to configure provider when provider is empty string', () => {
            render(<ProviderStatus provider={'' as Provider} />)

            expect(screen.getByText('Configure AI Provider')).toBeInTheDocument()
        })
    })

    // Test Case 3: Render Homepage with Claude configured as provider
    describe('Test Case 3: Claude provider configured', () => {
        it('should display Claude provider name when Claude is configured', () => {
            render(<ProviderStatus provider='Claude' />)

            expect(screen.getByText('Claude')).toBeInTheDocument()
        })

        it('should display Claude icon when Claude is configured', () => {
            render(<ProviderStatus provider='Claude' />)

            expect(screen.getByTestId('provider-icon')).toBeInTheDocument()
        })

        it('should have provider status container with correct provider', () => {
            render(<ProviderStatus provider='Claude' />)

            const container = screen.getByTestId('provider-status')
            expect(container).toHaveAttribute('data-provider', 'Claude')
        })
    })

    // Additional tests for other providers
    describe('Other providers', () => {
        const otherProviders: Provider[] = ['Gemini', 'Azure', 'Groq', 'Ollama']

        otherProviders.forEach((provider) => {
            it(`should display ${provider} provider name when ${provider} is configured`, () => {
                render(<ProviderStatus provider={provider} />)

                expect(screen.getByText(provider)).toBeInTheDocument()
            })
        })
    })

    // Accessibility tests
    describe('Accessibility', () => {
        it('should have accessible label for provider status', () => {
            render(<ProviderStatus provider='OpenAI' />)

            const container = screen.getByTestId('provider-status')
            expect(container).toHaveAttribute('aria-label')
        })

        it('should have role status for provider display', () => {
            render(<ProviderStatus provider='OpenAI' />)

            const container = screen.getByTestId('provider-status')
            expect(container).toHaveAttribute('role', 'status')
        })
    })
})
