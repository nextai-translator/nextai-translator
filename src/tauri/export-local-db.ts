import { getLocalDB } from '../common/internal-services/db'
import { commands } from './bindings'

// The native desktop app that replaces this one cannot read the webview's
// IndexedDB, so the actions and history are written next to config.json,
// where it imports them on its first launch.
export async function exportLocalDB(): Promise<void> {
    try {
        const db = getLocalDB()
        const [actions, history] = await Promise.all([db.action.toArray(), db.history.toArray()])
        const content = JSON.stringify({ version: 1, exportedAt: Date.now(), actions, history })
        const result = await commands.exportLocalDb(content)
        if (result.status === 'error') {
            console.error('export local db:', result.error)
        }
    } catch (e) {
        console.error('export local db:', e)
    }
}
