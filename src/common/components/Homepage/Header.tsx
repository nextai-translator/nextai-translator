/**
 * Header Component
 *
 * Primary navigation header with logo, navigation menu, mobile hamburger menu, and CTAs.
 * Implements PRD Section 3.1.1
 *
 * Features:
 * - Company logo/branding
 * - Primary navigation menu
 * - Mobile-responsive hamburger menu
 * - Call-to-action buttons
 * - Keyboard accessible (WCAG 2.1)
 * - Screen reader compatible
 */

import React, { useState, useEffect, useRef, useMemo } from 'react'
import './Header.css'

export interface HeaderProps {
    /** Optional className for custom styling */
    className?: string
}

/**
 * Header navigation component with accessibility support
 */
export const Header: React.FC<HeaderProps> = ({ className }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [activeSection, setActiveSection] = useState('')
    const mobileMenuRef = useRef<HTMLDivElement>(null)
    const hamburgerButtonRef = useRef<HTMLButtonElement>(null)

    // Navigation menu items (memoized to prevent re-creation on every render)
    const navItems = useMemo(
        () => [
            { id: 'home', label: 'Home', href: '#home' },
            { id: 'features', label: 'Features', href: '#features' },
            { id: 'about', label: 'About', href: '#about' },
            { id: 'contact', label: 'Contact', href: '#contact' },
        ],
        []
    )

    // Toggle mobile menu
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen)
    }

    // Close mobile menu
    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false)
        // Return focus to hamburger button (WCAG focus management)
        hamburgerButtonRef.current?.focus()
    }

    // Handle escape key to close mobile menu
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isMobileMenuOpen) {
                closeMobileMenu()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isMobileMenuOpen])

    // Handle click outside mobile menu to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target as Node) &&
                !hamburgerButtonRef.current?.contains(event.target as Node)
            ) {
                closeMobileMenu()
            }
        }

        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isMobileMenuOpen])

    // Focus trap for mobile menu (WCAG 2.4.3)
    useEffect(() => {
        if (isMobileMenuOpen && mobileMenuRef.current) {
            const focusableElements = mobileMenuRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )

            const firstElement = focusableElements[0]
            const lastElement = focusableElements[focusableElements.length - 1]

            const handleTabKey = (event: KeyboardEvent) => {
                if (event.key === 'Tab') {
                    if (event.shiftKey && document.activeElement === firstElement) {
                        event.preventDefault()
                        lastElement?.focus()
                    } else if (!event.shiftKey && document.activeElement === lastElement) {
                        event.preventDefault()
                        firstElement?.focus()
                    }
                }
            }

            document.addEventListener('keydown', handleTabKey)
            firstElement?.focus()

            return () => document.removeEventListener('keydown', handleTabKey)
        }
    }, [isMobileMenuOpen])

    // Track active section on scroll (PRD 3.2.1)
    useEffect(() => {
        const handleScroll = () => {
            const sections = navItems.map((item) => document.querySelector(item.href))
            const scrollPosition = window.scrollY + 100

            for (const section of sections) {
                if (section instanceof HTMLElement) {
                    const sectionTop = section.offsetTop
                    const sectionBottom = sectionTop + section.offsetHeight

                    if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                        setActiveSection(section.id)
                        break
                    }
                }
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [navItems])

    // Handle navigation link click with smooth scroll
    const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        event.preventDefault()
        const targetId = href.replace('#', '')
        const targetElement = document.getElementById(targetId)

        if (targetElement) {
            // Smooth scroll with offset for fixed header (PRD 3.2.1)
            const headerOffset = 80
            const elementPosition = targetElement.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            })

            // Update URL hash
            history.pushState(null, '', href)

            // Close mobile menu if open
            if (isMobileMenuOpen) {
                closeMobileMenu()
            }
        }
    }

    return (
        <header className={`header ${className || ''}`} role='banner'>
            <div className='header-container'>
                {/* Logo/Branding - PRD 3.1.1 */}
                <div className='header-logo'>
                    <a href='#home' aria-label='Homepage - OpenAI Translator'>
                        <img
                            src='/logo.svg'
                            alt='OpenAI Translator Logo'
                            width='40'
                            height='40'
                            className='logo-image'
                        />
                        <span className='logo-text'>OpenAI Translator</span>
                    </a>
                </div>

                {/* Primary Navigation Menu - Desktop (PRD 3.1.1) */}
                <nav className='header-nav' role='navigation' aria-label='Primary navigation'>
                    <ul className='nav-menu'>
                        {navItems.map((item) => (
                            <li key={item.id} className='nav-item'>
                                <a
                                    href={item.href}
                                    className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                                    aria-current={activeSection === item.id ? 'page' : undefined}
                                    onClick={(e) => handleNavClick(e, item.href)}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* CTA Buttons - PRD 3.1.1 */}
                <div className='header-actions'>
                    <a href='#contact' className='btn btn-secondary' onClick={(e) => handleNavClick(e, '#contact')}>
                        Contact Us
                    </a>
                    <a href='#signup' className='btn btn-primary' onClick={(e) => handleNavClick(e, '#signup')}>
                        Sign Up
                    </a>
                </div>

                {/* Mobile Hamburger Menu Button (PRD 3.1.1) */}
                <button
                    ref={hamburgerButtonRef}
                    className='hamburger-button'
                    aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isMobileMenuOpen}
                    aria-controls='mobile-menu'
                    onClick={toggleMobileMenu}
                >
                    <span className='hamburger-line'></span>
                    <span className='hamburger-line'></span>
                    <span className='hamburger-line'></span>
                </button>
            </div>

            {/* Mobile Navigation Menu - PRD 3.1.1 */}
            {isMobileMenuOpen && (
                <div
                    ref={mobileMenuRef}
                    id='mobile-menu'
                    className='mobile-menu'
                    role='navigation'
                    aria-label='Mobile navigation'
                >
                    <ul className='mobile-nav-menu'>
                        {navItems.map((item) => (
                            <li key={item.id} className='mobile-nav-item'>
                                <a
                                    href={item.href}
                                    className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                                    aria-current={activeSection === item.id ? 'page' : undefined}
                                    onClick={(e) => handleNavClick(e, item.href)}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                        <li className='mobile-nav-item mobile-cta'>
                            <a
                                href='#contact'
                                className='btn btn-secondary btn-block'
                                onClick={(e) => handleNavClick(e, '#contact')}
                            >
                                Contact Us
                            </a>
                        </li>
                        <li className='mobile-nav-item mobile-cta'>
                            <a
                                href='#signup'
                                className='btn btn-primary btn-block'
                                onClick={(e) => handleNavClick(e, '#signup')}
                            >
                                Sign Up
                            </a>
                        </li>
                    </ul>
                </div>
            )}
        </header>
    )
}
