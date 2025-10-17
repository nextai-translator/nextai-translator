import { HomePage } from '@/common/components/HomePage'
import { useAtom } from 'jotai'
import { showSettingsAtom } from '@/common/store/setting'
import { showHomepageAtom } from '@/common/store/homepage'
import { TranslatorWindow } from './TranslatorWindow'
import { SettingsWindow } from './SettingsWindow'
import { TranslateMode } from '@/common/translate'
import { getLocalDB } from '@/common/internal-services/db'

export function HomeWindow() {
    const [showSettings, setShowSettings] = useAtom(showSettingsAtom)
    const [showHomepage, setShowHomepage] = useAtom(showHomepageAtom)

    // Show Settings if requested
    if (showSettings) {
        return <SettingsWindow />
    }

    // Show Translator if homepage is hidden
    if (!showHomepage) {
        return <TranslatorWindow />
    }

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

        // Navigate to translator with the action
        setShowHomepage(false)
        // TODO: Pass the text and mode to translator
    }

    const handleNavigateToSettings = () => {
        setShowSettings(true)
    }

    const handleNavigateToVocabulary = () => {
        // TODO: Navigate to vocabulary window
        console.log('Navigate to vocabulary')
    }

    const handleActivityClick = () => {
        // Navigate to translator with the activity data
        setShowHomepage(false)
        // TODO: Pass the activity data to translator
    }

    return (
        <HomePage
            onQuickAction={handleQuickAction}
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToVocabulary={handleNavigateToVocabulary}
            onActivityClick={handleActivityClick}
        />
    )
}
