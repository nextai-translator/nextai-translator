/**
 * Homepage Component
 *
 * Main homepage component that serves as the primary entry point for website visitors.
 * Implements PRD requirements from .something/prd.md
 *
 * Structure (PRD Section 3.1):
 * - Header/Navigation (3.1.1)
 * - Hero Section (3.1.2)
 * - Features/Services Section (3.1.3)
 * - Footer (3.1.5)
 *
 * Accessibility: WCAG 2.1 Level AA compliant (PRD Section 4.2)
 * Performance: Optimized for <3s page load (PRD Section 4.1)
 * Responsive: Mobile (320-767px), Tablet (768-1023px), Desktop (1024px+) (PRD Section 4.4)
 */

import React from 'react'
import { Header } from './Header'
import { Hero } from './Hero'
import { Features } from './Features'
import { Footer } from './Footer'
import './Homepage.css'

export interface HomepageProps {
    /** Optional className for custom styling */
    className?: string
}

/**
 * Homepage component with semantic HTML5 structure
 *
 * @param props - Homepage component props
 * @returns Homepage component
 */
export const Homepage: React.FC<HomepageProps> = ({ className }) => {
    return (
        <div className={`homepage ${className || ''}`} lang='en'>
            {/* Skip to content link for keyboard users (WCAG 2.4.1) */}
            <a href='#main-content' className='skip-link'>
                Skip to main content
            </a>

            {/* Header/Navigation - PRD 3.1.1 */}
            <Header />

            {/* Main content - Semantic HTML5 structure (PRD 4.2, 4.5) */}
            <main id='main-content' role='main'>
                {/* Hero Section - PRD 3.1.2 */}
                <Hero />

                {/* Features/Services Section - PRD 3.1.3 */}
                <Features />
            </main>

            {/* Footer - PRD 3.1.5 */}
            <Footer />
        </div>
    )
}

export default Homepage
