import { backgroundFetch } from './background/fetch'
import { tauriFetch } from './polyfills/tauri'
import { isDesktopApp } from './utils'

export function getUniversalFetch() {
    return isDesktopApp() ? tauriFetch : backgroundFetch
}
