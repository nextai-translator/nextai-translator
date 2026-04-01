/* eslint-disable @typescript-eslint/no-unused-vars */

import { BackgroundEventNames } from './eventnames'
import { isDesktopApp } from '../utils'

export async function backgroundGetItem(key: string): Promise<string | null> {
    if (isDesktopApp()) {
        return null
    }
    const _ = key
    throw new Error('Background storage is not available in this build.')
}

export async function backgroundSetItem(key: string, value: string | null): Promise<void> {
    if (isDesktopApp()) {
        return
    }
    const _ = { key, value }
    throw new Error('Background storage is not available in this build.')
}

export async function backgroundRemoveItem(key: string): Promise<void> {
    if (isDesktopApp()) {
        return
    }
    const _ = key
    throw new Error('Background storage is not available in this build.')
}
