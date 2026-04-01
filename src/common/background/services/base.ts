import { BackgroundEventNames } from '../eventnames'
import { isDesktopApp } from '../../utils'

export async function callMethod(
    eventType: keyof typeof BackgroundEventNames,
    methodName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _args: unknown[]
): Promise<unknown> {
    if (isDesktopApp()) {
        throw new Error('Background service bridge is not available in the desktop build.')
    }
    throw new Error(
        `Background service bridge is not available (eventType=${String(eventType)}, method=${methodName}).`
    )
}
