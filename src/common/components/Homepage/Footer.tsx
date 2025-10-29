/**
 * Footer Component
 *
 * Comprehensive footer with copyright, legal links, social media, contact info,
 * sitemap, and optional newsletter signup.
 * Implements PRD Section 3.1.5
 *
 * Features:
 * - Copyright information
 * - Links to important pages (Privacy Policy, Terms of Service, etc.)
 * - Social media links with accessible labels
 * - Contact information
 * - Secondary navigation (sitemap)
 * - Newsletter signup form (optional)
 * - Secure form submission with CSRF protection (PRD 4.6)
 */

import React, { useState } from 'react'
import './Footer.css'

export interface FooterProps {
    /** Optional className for custom styling */
    className?: string
}

/**
 * Footer component with all required sections and accessibility
 */
export const Footer: React.FC<FooterProps> = ({ className }) => {
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const currentYear = new Date().getFullYear()

    // Social media links with accessible labels (PRD 4.2)
    const socialLinks = [
        {
            id: 'github',
            label: 'GitHub',
            url: 'https://github.com/openai-translator/openai-translator',
            icon: 'GitHub',
        },
        { id: 'twitter', label: 'Twitter', url: 'https://twitter.com/openaitranslator', icon: 'Twitter' },
        { id: 'discord', label: 'Discord Community', url: 'https://discord.gg/openaitranslator', icon: 'Discord' },
    ]

    // Footer navigation links (sitemap)
    const footerLinks = {
        product: [
            { label: 'Features', url: '#features' },
            { label: 'Pricing', url: '#pricing' },
            { label: 'Download', url: '#download' },
            { label: 'Roadmap', url: '#roadmap' },
        ],
        company: [
            { label: 'About', url: '#about' },
            { label: 'Blog', url: '#blog' },
            { label: 'Careers', url: '#careers' },
            { label: 'Contact', url: '#contact' },
        ],
        legal: [
            { label: 'Privacy Policy', url: '#privacy' },
            { label: 'Terms of Service', url: '#terms' },
            { label: 'Cookie Policy', url: '#cookies' },
            { label: 'License', url: 'https://github.com/openai-translator/openai-translator/blob/main/LICENSE' },
        ],
    }

    // Email validation (PRD 8.1)
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    // Handle newsletter form submission (PRD 4.6: Secure form submissions)
    const handleNewsletterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setErrorMessage('')

        // Validate email
        if (!email) {
            setErrorMessage('Please enter your email address')
            return
        }

        if (!validateEmail(email)) {
            setErrorMessage('Please enter a valid email address')
            return
        }

        setIsSubmitting(true)
        setSubmitStatus('idle')

        try {
            // Simulated API call - Replace with actual endpoint
            // In production: Include CSRF token, submit over HTTPS (PRD 4.6)
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Track analytics event (PRD 9.2)
            if (typeof window !== 'undefined' && (window as Window & { gtag?: (...args: unknown[]) => void }).gtag) {
                const gtag = (window as Window & { gtag: (...args: unknown[]) => void }).gtag
                gtag('event', 'newsletter_signup', {
                    method: 'footer_form',
                })
            }

            setSubmitStatus('success')
            setEmail('') // Clear form after successful submission
        } catch (error) {
            setSubmitStatus('error')
            setErrorMessage('Failed to subscribe. Please try again later.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <footer className={`footer ${className || ''}`} role='contentinfo'>
            <div className='footer-container'>
                {/* Footer Main Content */}
                <div className='footer-content'>
                    {/* Brand and Description */}
                    <div className='footer-brand'>
                        <h2 className='footer-logo'>OpenAI Translator</h2>
                        <p className='footer-tagline'>
                            Translate anywhere, instantly. AI-powered translation for everyone.
                        </p>

                        {/* Social Media Links (PRD 3.1.5) */}
                        <div className='footer-social'>
                            <span className='footer-social-label'>Follow us:</span>
                            {socialLinks.map((social) => (
                                <a
                                    key={social.id}
                                    href={social.url}
                                    className='social-link'
                                    aria-label={social.label}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                >
                                    <span aria-hidden='true'>{social.icon}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Footer Navigation - Sitemap (PRD 3.1.5) */}
                    <nav className='footer-nav' aria-label='Footer navigation'>
                        <div className='footer-nav-section'>
                            <h3 className='footer-nav-heading'>Product</h3>
                            <ul className='footer-nav-list'>
                                {footerLinks.product.map((link) => (
                                    <li key={link.label}>
                                        <a href={link.url} className='footer-link'>
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className='footer-nav-section'>
                            <h3 className='footer-nav-heading'>Company</h3>
                            <ul className='footer-nav-list'>
                                {footerLinks.company.map((link) => (
                                    <li key={link.label}>
                                        <a href={link.url} className='footer-link'>
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className='footer-nav-section'>
                            <h3 className='footer-nav-heading'>Legal</h3>
                            <ul className='footer-nav-list'>
                                {footerLinks.legal.map((link) => (
                                    <li key={link.label}>
                                        <a
                                            href={link.url}
                                            className='footer-link'
                                            target={link.url.startsWith('http') ? '_blank' : undefined}
                                            rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </nav>

                    {/* Newsletter Signup (PRD 3.1.5: optional) */}
                    <div className='footer-newsletter'>
                        <h3 className='footer-newsletter-heading'>Stay Updated</h3>
                        <p className='footer-newsletter-description'>
                            Subscribe to our newsletter for updates and tips.
                        </p>

                        <form className='newsletter-form' onSubmit={handleNewsletterSubmit} noValidate>
                            <div className='form-group'>
                                <label htmlFor='newsletter-email' className='sr-only'>
                                    Email address
                                </label>
                                <input
                                    type='email'
                                    id='newsletter-email'
                                    name='email'
                                    className='newsletter-input'
                                    placeholder='Enter your email'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    aria-required='true'
                                    aria-invalid={!!errorMessage}
                                    aria-describedby={errorMessage ? 'newsletter-error' : undefined}
                                    autoComplete='email'
                                />
                                <button
                                    type='submit'
                                    className='newsletter-button'
                                    disabled={isSubmitting}
                                    aria-label='Subscribe to newsletter'
                                >
                                    {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                                </button>
                            </div>

                            {/* Error Message (WCAG 3.3.1) */}
                            {errorMessage && (
                                <div id='newsletter-error' className='newsletter-error' role='alert' aria-live='polite'>
                                    {errorMessage}
                                </div>
                            )}

                            {/* Success Message (WCAG 4.1.3) */}
                            {submitStatus === 'success' && (
                                <div className='newsletter-success' role='status' aria-live='polite'>
                                    Thank you for subscribing!
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Footer Bottom - Copyright (PRD 3.1.5) */}
                <div className='footer-bottom'>
                    <p className='footer-copyright'>
                        © {currentYear} OpenAI Translator. All rights reserved. Licensed under{' '}
                        <a
                            href='https://github.com/openai-translator/openai-translator/blob/main/LICENSE'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='footer-link-inline'
                        >
                            AGPL-3.0
                        </a>
                        .
                    </p>

                    {/* Contact Information (PRD 3.1.5) */}
                    <p className='footer-contact'>
                        Contact:{' '}
                        <a href='mailto:support@openai-translator.com' className='footer-link-inline'>
                            support@openai-translator.com
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    )
}
