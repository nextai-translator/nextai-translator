import { GetStaticProps } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import Button from '@/components/common/Button'

interface FAQItem {
  question: string
  answer: string
}

interface FAQCategory {
  title: string
  questions: Record<string, FAQItem>
}

export default function FAQ() {
  const { t } = useTranslation('faq')
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('general')

  const categories: Record<string, FAQCategory> = {
    general: t('categories.general', { returnObjects: true }) as FAQCategory,
    setup: t('categories.setup', { returnObjects: true }) as FAQCategory,
    features: t('categories.features', { returnObjects: true }) as FAQCategory,
    troubleshooting: t('categories.troubleshooting', { returnObjects: true }) as FAQCategory,
    privacy: t('categories.privacy', { returnObjects: true }) as FAQCategory,
    support: t('categories.support', { returnObjects: true }) as FAQCategory,
  }

  const categoryList = [
    { id: 'general', icon: '❓', label: t('categories.general.title') },
    { id: 'setup', icon: '⚙️', label: t('categories.setup.title') },
    { id: 'features', icon: '✨', label: t('categories.features.title') },
    { id: 'troubleshooting', icon: '🔧', label: t('categories.troubleshooting.title') },
    { id: 'privacy', icon: '🔒', label: t('categories.privacy.title') },
    { id: 'support', icon: '💬', label: t('categories.support.title') },
  ]

  const toggleQuestion = (questionId: string) => {
    setOpenQuestion(openQuestion === questionId ? null : questionId)
  }

  const selectedCategoryData = categories[selectedCategory]

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

      {/* FAQ Content */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Category Navigation */}
            <aside className="lg:col-span-3 mb-8 lg:mb-0">
              <nav
                className="sticky top-8"
                aria-label="FAQ categories"
              >
                <ul className="space-y-2" role="list">
                  {categoryList.map((category) => (
                    <li key={category.id}>
                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                          selectedCategory === category.id
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                        }`}
                        aria-current={selectedCategory === category.id ? 'page' : undefined}
                      >
                        <span className="text-xl" aria-hidden="true">
                          {category.icon}
                        </span>
                        <span className="font-medium">{category.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* FAQ Items */}
            <div className="lg:col-span-9">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedCategoryData.title}
                </h2>
              </div>

              <div className="space-y-4">
                {Object.entries(selectedCategoryData.questions).map(([key, item]) => {
                  const questionId = `${selectedCategory}-${key}`
                  const isOpen = openQuestion === questionId

                  return (
                    <article
                      key={questionId}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleQuestion(questionId)}
                        className="w-full text-left px-6 py-4 flex items-start justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        aria-expanded={isOpen}
                        aria-controls={`answer-${questionId}`}
                      >
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                          {item.question}
                        </h3>
                        <span
                          className="flex-shrink-0 text-2xl text-primary-600 dark:text-primary-400 transform transition-transform"
                          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          aria-hidden="true"
                        >
                          ▼
                        </span>
                      </button>

                      <div
                        id={`answer-${questionId}`}
                        role="region"
                        aria-labelledby={questionId}
                        className={`overflow-hidden transition-all duration-300 ${
                          isOpen ? 'max-h-96' : 'max-h-0'
                        }`}
                      >
                        <div className="px-6 pb-4 text-gray-600 dark:text-gray-300">
                          {item.answer}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border-2 border-primary-200 dark:border-primary-800 bg-white dark:bg-gray-900 p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('stillHaveQuestions.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {t('stillHaveQuestions.description')}
            </p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
              <Button href="/support" variant="primary">
                {t('stillHaveQuestions.contact')}
              </Button>
              <Button
                href="https://github.com/nextai-translator/nextai-translator/discussions"
                variant="outline"
                external
              >
                {t('stillHaveQuestions.github')}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'faq'])),
    },
  }
}
