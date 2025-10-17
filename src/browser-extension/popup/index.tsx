import '../enable-dev-hmr'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Translator } from '../../common/components/Translator'
import { HomePage } from '../../common/components/HomePage'
import { Client as Styletron } from 'styletron-engine-atomic'
import '../../common/i18n.js'
import './index.css'
import { PREFIX } from '../../common/constants'
import { useTheme } from '../../common/hooks/useTheme'
import { useAtom } from 'jotai'
import { showHomepageAtom } from '../../common/store/homepage'
import { showSettingsAtom } from '../../common/store/setting'
import { useSettings } from '../../common/hooks/useSettings'
import { TranslateMode } from '../../common/translate'
import { getLocalDB } from '../../common/internal-services/db'

const engine = new Styletron({
    prefix: `${PREFIX}-styletron-`,
})

const root = createRoot(document.getElementById('root') as HTMLElement)

function App() {
    const { theme } = useTheme()
    const [showHomepage, setShowHomepage] = useAtom(showHomepageAtom)
    const [, setShowSettings] = useAtom(showSettingsAtom)
    const { settings } = useSettings()

    // Check if user wants homepage as default landing page
    const defaultLandingPage = settings?.defaultLandingPage || 'translator'

    // Initialize showHomepage based on settings (only on first render)
    const [initialized, setInitialized] = React.useState(false)
    React.useEffect(() => {
        if (!initialized && defaultLandingPage === 'homepage') {
            setShowHomepage(true)
            setInitialized(true)
        }
    }, [initialized, defaultLandingPage, setShowHomepage])

    const handleQuickAction = async (mode: TranslateMode, text: string, targetLang?: string) => {
        // Log activity to database
        try {
            const db = getLocalDB()
            await db.recentActivity.add({
                timestamp: Date.now(),
                mode,
                sourceText: text.substring(0, 500), // Limit text length
                targetText: '', // Will be filled after translation
                sourceLang: 'auto',
                targetLang: targetLang || 'en',
            })

            // Keep max 50 items
            const count = await db.recentActivity.count()
            if (count > 50) {
                const oldestItems = await db.recentActivity
                    .orderBy('timestamp')
                    .limit(count - 50)
                    .toArray()
                await db.recentActivity.bulkDelete(oldestItems.map((item) => item.id!))
            }
        } catch (error) {
            console.error('Failed to log activity:', error)
        }

        // Navigate to translator
        setShowHomepage(false)
        // TODO: Pass text and mode to translator
    }

    const handleNavigateToSettings = () => {
        setShowSettings(true)
    }

    const handleNavigateToVocabulary = () => {
        // TODO: Navigate to vocabulary
        console.log('Navigate to vocabulary')
    }

    const handleActivityClick = () => {
        // Navigate to translator with activity data
        setShowHomepage(false)
        // TODO: Pass activity data to translator
    }

    if (showHomepage) {
        return (
            <div
                style={{
                    position: 'relative',
                    height: '100%',
                    background: theme.colors.backgroundPrimary,
                }}
                data-testid='popup-container'
            >
                <HomePage
                    onQuickAction={handleQuickAction}
                    onNavigateToSettings={handleNavigateToSettings}
                    onNavigateToVocabulary={handleNavigateToVocabulary}
                    onActivityClick={handleActivityClick}
                />
            </div>
        )
    }

    return (
        <div
            style={{
                position: 'relative',
                height: '100%',
                background: theme.colors.backgroundPrimary,
            }}
            data-testid='popup-container'
        >
            <Translator showSettingsIcon defaultShowSettings engine={engine} autoFocus />
        </div>
    )
}

root.render(<App />)
