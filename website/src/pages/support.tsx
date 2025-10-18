import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState, FormEvent } from 'react'
import Layout from '@/components/layout/Layout'
import Button from '@/components/common/Button'

export default function Support() {
  const { t } = useTranslation('support')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    message: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const supportOptions = [
    {
      icon: '📚',
      title: t('options.documentation.title'),
      description: t('options.documentation.description'),
      cta: t('options.documentation.cta'),
      href: '/docs',
    },
    {
      icon: '❓',
      title: t('options.faq.title'),
      description: t('options.faq.description'),
      cta: t('options.faq.cta'),
      href: '/docs/faq',
    },
    {
      icon: '💬',
      title: t('options.github.title'),
      description: t('options.github.description'),
      cta: t('options.github.cta'),
      href: 'https://github.com/nextai-translator/nextai-translator/discussions',
      external: true,
    },
    {
      icon: '🐛',
      title: t('options.issues.title'),
      description: t('options.issues.description'),
      cta: t('options.issues.cta'),
      href: 'https://github.com/nextai-translator/nextai-translator/issues',
      external: true,
    },
  ]

  const communityLinks = [
    {
      icon: '💻',
      title: t('community.github.title'),
      description: t('community.github.description'),
      link: t('community.github.link'),
      href: 'https://github.com/nextai-translator/nextai-translator',
    },
    {
      icon: '💬',
      title: t('community.discussions.title'),
      description: t('community.discussions.description'),
      link: t('community.discussions.link'),
      href: 'https://github.com/nextai-translator/nextai-translator/discussions',
    },
    {
      icon: '🎮',
      title: t('community.discord.title'),
      description: t('community.discord.description'),
      link: t('community.discord.link'),
      href: '#',
      comingSoon: true,
    },
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('contact.form.name.required')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('contact.form.email.required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('contact.form.email.invalid')
    }

    if (!formData.subject.trim()) {
      newErrors.subject = t('contact.form.subject.required')
    }

    if (!formData.category) {
      newErrors.category = t('contact.form.category.required')
    }

    if (!formData.message.trim()) {
      newErrors.message = t('contact.form.message.required')
    } else if (formData.message.trim().length < 20) {
      newErrors.message = t('contact.form.message.minLength')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    // Simulate form submission
    try {
      // In a real application, you would send the data to your API here
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setSubmitStatus('success')
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: '',
        message: '',
      })
      setErrors({})
    } catch (error) {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <Layout title={t('title')} description={t('description')}>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              {t('hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Support Options */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('options.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {supportOptions.map((option, index) => (
              <article
                key={index}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-4" aria-hidden="true">
                  {option.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {option.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{option.description}</p>
                <Button
                  href={option.href}
                  variant="outline"
                  className="w-full"
                  external={option.external}
                >
                  {option.cta}
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('contact.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('contact.description')}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8"
            noValidate
          >
            {/* Name */}
            <div className="mb-6">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('contact.form.name.label')}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('contact.form.name.placeholder')}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-primary-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('contact.form.email.label')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('contact.form.email.placeholder')}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-primary-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="mb-6">
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('contact.form.category.label')}
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.category
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-primary-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                aria-invalid={errors.category ? 'true' : 'false'}
                aria-describedby={errors.category ? 'category-error' : undefined}
              >
                <option value="">Select a category</option>
                <option value="general">{t('contact.form.category.options.general')}</option>
                <option value="bug">{t('contact.form.category.options.bug')}</option>
                <option value="feature">{t('contact.form.category.options.feature')}</option>
                <option value="installation">
                  {t('contact.form.category.options.installation')}
                </option>
                <option value="api">{t('contact.form.category.options.api')}</option>
                <option value="other">{t('contact.form.category.options.other')}</option>
              </select>
              {errors.category && (
                <p id="category-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.category}
                </p>
              )}
            </div>

            {/* Subject */}
            <div className="mb-6">
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('contact.form.subject.label')}
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder={t('contact.form.subject.placeholder')}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.subject
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-primary-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                aria-invalid={errors.subject ? 'true' : 'false'}
                aria-describedby={errors.subject ? 'subject-error' : undefined}
              />
              {errors.subject && (
                <p id="subject-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.subject}
                </p>
              )}
            </div>

            {/* Message */}
            <div className="mb-6">
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t('contact.form.message.label')}
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                placeholder={t('contact.form.message.placeholder')}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.message
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700 focus:ring-primary-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 resize-y`}
                aria-invalid={errors.message ? 'true' : 'false'}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
              {errors.message && (
                <p id="message-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {}}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? t('contact.form.submitting') : t('contact.form.submit')}
            </Button>

            {/* Success Message */}
            {submitStatus === 'success' && (
              <div
                className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                role="status"
                aria-live="polite"
              >
                {t('contact.form.success')}
              </div>
            )}

            {/* Error Message */}
            {submitStatus === 'error' && (
              <div
                className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                role="alert"
                aria-live="assertive"
              >
                {t('contact.form.error')}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Community */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('community.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('community.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {communityLinks.map((link, index) => (
              <article
                key={index}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center"
              >
                <div className="text-5xl mb-4" aria-hidden="true">
                  {link.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {link.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{link.description}</p>
                {link.comingSoon ? (
                  <div className="text-gray-500 dark:text-gray-400 font-medium">
                    {t('community.discord.comingSoon')}
                  </div>
                ) : (
                  <Button href={link.href} variant="primary" className="w-full" external>
                    {link.link}
                  </Button>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t('emergency.title')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{t('emergency.description')}</p>
            <a
              href={`mailto:${t('emergency.email')}`}
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              {t('emergency.email')}
            </a>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'support'])),
    },
  }
}
