/**
 * Hero Section Component
 *
 * Main hero section with compelling headline, subheadline, visual element, and CTA.
 * Implements PRD Section 3.1.2
 *
 * Features:
 * - Compelling headline (5-10 words) communicating value proposition
 * - Supporting subheadline (10-20 words)
 * - Hero image/video element
 * - Primary call-to-action button
 * - Responsive layout (mobile, tablet, desktop)
 * - Semantic HTML with proper heading hierarchy
 */

import React from 'react'
import './Hero.css'

export interface HeroProps {
    /** Optional className for custom styling */
    className?: string
}

/**
 * Hero section component with semantic structure and accessibility
 */
export const Hero: React.FC<HeroProps> = ({ className }) => {
    // Handle CTA button click
    const handleCtaClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault()
        const targetElement = document.getElementById('signup')

        if (targetElement) {
            const headerOffset = 80
            const elementPosition = targetElement.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            })

            // Track analytics event (PRD 9.2)
            if (typeof window !== 'undefined' && (window as Window & { gtag?: (...args: unknown[]) => void }).gtag) {
                const gtag = (window as Window & { gtag: (...args: unknown[]) => void }).gtag
                gtag('event', 'cta_click', {
                    ctaLocation: 'hero',
                    ctaText: 'Get Started',
                })
            }
        }
    }

    return (
        <section id='home' className={`hero ${className || ''}`} role='region' aria-labelledby='hero-headline'>
            <div className='hero-container'>
                {/* Content Column */}
                <div className='hero-content'>
                    {/* Headline - H1 for proper hierarchy (PRD 4.5) */}
                    <h1 id='hero-headline' className='hero-headline'>
                        Translate Anywhere, Instantly
                    </h1>

                    {/* Subheadline - PRD 7.1: 10-20 words */}
                    <p className='hero-subheadline'>
                        AI-powered translation tool that works seamlessly across your browser, desktop, and mobile
                        devices.
                    </p>

                    {/* Primary CTA - PRD 3.1.2 */}
                    <div className='hero-actions'>
                        <a
                            href='#signup'
                            className='btn btn-primary btn-large'
                            onClick={handleCtaClick}
                            aria-label='Get started with OpenAI Translator'
                        >
                            Get Started
                        </a>
                        <a
                            href='#features'
                            className='btn btn-secondary btn-large'
                            onClick={(e) => {
                                e.preventDefault()
                                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                            }}
                            aria-label='Learn more about features'
                        >
                            Learn More
                        </a>
                    </div>
                </div>

                {/* Visual Element - Hero Image (PRD 3.1.2, PRD 7.2) */}
                <div className='hero-visual'>
                    <picture>
                        {/* WebP format with fallback (PRD 4.1) */}
                        <source srcSet='/hero-image.webp' type='image/webp' />
                        <source srcSet='/hero-image.png' type='image/png' />
                        <img
                            src='/hero-image.png'
                            alt='OpenAI Translator interface showing real-time translation across multiple platforms'
                            width='600'
                            height='450'
                            className='hero-image'
                            loading='eager'
                        />
                    </picture>

                    {/* Optional: Hero video support (PRD 7.3) */}
                    {/*
                    <video
                        className="hero-video"
                        autoPlay
                        muted
                        loop
                        playsInline
                        aria-label="Demonstration of translation features"
                        width="600"
                        height="450"
                    >
                        <source src="/hero-video.webm" type="video/webm" />
                        <source src="/hero-video.mp4" type="video/mp4" />
                        <track
                            kind="captions"
                            src="/hero-video-captions.vtt"
                            srcLang="en"
                            label="English captions"
                        />
                        Your browser does not support the video tag.
                    </video>
                    */}
                </div>
            </div>
        </section>
    )
}
