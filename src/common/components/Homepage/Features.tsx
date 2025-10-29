/**
 * Features Section Component
 *
 * Highlights 3-6 key features with icons, descriptions, and optional learn more links.
 * Implements PRD Section 3.1.3
 *
 * Features:
 * - 3-6 feature cards with icons and descriptions
 * - SVG icons with consistent styling
 * - Brief descriptions (15-30 words each)
 * - Optional "Learn More" links
 * - Responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 * - Keyboard accessible
 */

import React from 'react'
import './Features.css'

export interface FeatureItem {
    id: string
    icon: React.ReactNode
    title: string
    description: string
    learnMoreUrl?: string
}

export interface FeaturesProps {
    /** Optional className for custom styling */
    className?: string
    /** Custom features to display (defaults to built-in features) */
    features?: FeatureItem[]
}

// Default feature items (PRD 3.1.3: 3-6 features)
const defaultFeatures: FeatureItem[] = [
    {
        id: 'instant-translation',
        icon: (
            <svg
                width='48'
                height='48'
                viewBox='0 0 48 48'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                aria-hidden='true'
                role='img'
            >
                <circle cx='24' cy='24' r='20' stroke='currentColor' strokeWidth='2' />
                <path
                    d='M15 24h18M24 15v18'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                />
            </svg>
        ),
        title: 'Instant Translation',
        description:
            'Translate text instantly with AI-powered accuracy. Supports over 100 languages with context-aware translations.',
        learnMoreUrl: '#instant-translation',
    },
    {
        id: 'cross-platform',
        icon: (
            <svg
                width='48'
                height='48'
                viewBox='0 0 48 48'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                aria-hidden='true'
                role='img'
            >
                <rect x='8' y='10' width='32' height='24' rx='2' stroke='currentColor' strokeWidth='2' />
                <path d='M8 28h32M18 34h12' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
            </svg>
        ),
        title: 'Cross-Platform Support',
        description:
            'Works seamlessly on browser extensions, desktop applications, and mobile devices. One account, everywhere.',
        learnMoreUrl: '#cross-platform',
    },
    {
        id: 'offline-mode',
        icon: (
            <svg
                width='48'
                height='48'
                viewBox='0 0 48 48'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                aria-hidden='true'
                role='img'
            >
                <path
                    d='M12 32c-4 0-8-3.2-8-8s4-8 8-8c0-6.4 5.6-12 12-12s12 5.6 12 12c4 0 8 3.2 8 8s-4 8-8 8'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                />
            </svg>
        ),
        title: 'Offline Mode',
        description:
            'Continue translating even without internet connection. Download language packs for offline access.',
        learnMoreUrl: '#offline-mode',
    },
    {
        id: 'privacy-first',
        icon: (
            <svg
                width='48'
                height='48'
                viewBox='0 0 48 48'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                aria-hidden='true'
                role='img'
            >
                <path
                    d='M24 4L10 10v10c0 8.4 5.8 16.2 14 18 8.2-1.8 14-9.6 14-18V10L24 4z'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinejoin='round'
                />
                <path d='M24 18v8M24 30h.02' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
            </svg>
        ),
        title: 'Privacy First',
        description: 'Your data stays secure with end-to-end encryption. We never store or share your translations.',
        learnMoreUrl: '#privacy',
    },
    {
        id: 'customizable',
        icon: (
            <svg
                width='48'
                height='48'
                viewBox='0 0 48 48'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                aria-hidden='true'
                role='img'
            >
                <circle cx='24' cy='10' r='4' stroke='currentColor' strokeWidth='2' />
                <circle cx='10' cy='38' r='4' stroke='currentColor' strokeWidth='2' />
                <circle cx='38' cy='38' r='4' stroke='currentColor' strokeWidth='2' />
                <path d='M24 14v8M14 34l8-8M34 34l-8-8' stroke='currentColor' strokeWidth='2' />
            </svg>
        ),
        title: 'Highly Customizable',
        description:
            'Customize translation engines, hotkeys, appearance, and behavior to match your workflow perfectly.',
        learnMoreUrl: '#customization',
    },
    {
        id: 'open-source',
        icon: (
            <svg
                width='48'
                height='48'
                viewBox='0 0 48 48'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                aria-hidden='true'
                role='img'
            >
                <path
                    d='M24 4L6 14v14c0 11 7 21 18 24 11-3 18-13 18-24V14L24 4z'
                    stroke='currentColor'
                    strokeWidth='2'
                />
                <path d='M18 24l4 4 8-8' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
            </svg>
        ),
        title: 'Open Source',
        description: 'Fully open-source and transparent. Contribute to development or audit the code yourself.',
        learnMoreUrl: 'https://github.com/openai-translator/openai-translator',
    },
]

/**
 * Features section component with responsive grid
 */
export const Features: React.FC<FeaturesProps> = ({ className, features = defaultFeatures }) => {
    // Handle learn more link click
    const handleLearnMoreClick = (event: React.MouseEvent<HTMLAnchorElement>, url: string) => {
        if (url.startsWith('#')) {
            event.preventDefault()
            const targetElement = document.getElementById(url.replace('#', ''))

            if (targetElement) {
                const headerOffset = 80
                const elementPosition = targetElement.getBoundingClientRect().top
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth',
                })
            }
        }
        // External links will open normally
    }

    return (
        <section id='features' className={`features ${className || ''}`} aria-labelledby='features-heading'>
            <div className='features-container'>
                {/* Section Heading - H2 for hierarchy (PRD 4.5) */}
                <div className='features-header'>
                    <h2 id='features-heading' className='features-heading'>
                        Powerful Features
                    </h2>
                    <p className='features-subheading'>
                        Everything you need for seamless translation across all your devices
                    </p>
                </div>

                {/* Features Grid - Responsive (PRD 4.4) */}
                <div className='features-grid' role='list'>
                    {features.map((feature) => (
                        <article key={feature.id} className='feature-card' role='listitem'>
                            {/* Feature Icon - SVG (PRD 5.3, 7.2) */}
                            <div className='feature-icon' aria-hidden='true'>
                                {feature.icon}
                            </div>

                            {/* Feature Title - H3 for hierarchy */}
                            <h3 className='feature-title'>{feature.title}</h3>

                            {/* Feature Description - PRD 7.1: 15-30 words */}
                            <p className='feature-description'>{feature.description}</p>

                            {/* Optional Learn More Link (PRD 3.1.3) */}
                            {feature.learnMoreUrl && (
                                <a
                                    href={feature.learnMoreUrl}
                                    className='feature-link'
                                    onClick={(e) => handleLearnMoreClick(e, feature.learnMoreUrl!)}
                                    aria-label={`Learn more about ${feature.title}`}
                                    rel={feature.learnMoreUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                                    target={feature.learnMoreUrl.startsWith('http') ? '_blank' : undefined}
                                >
                                    Learn More →
                                </a>
                            )}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
