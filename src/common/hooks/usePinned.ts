import { useCallback, useEffect } from 'react'
import { useGlobalState } from './global'

export function usePinned() {
    const [pinned, setPinned_] = useGlobalState('pinned')

    useEffect(() => {
        // In the minimal desktop build, pin state is managed locally in the renderer.
        // (No tray/window sync events.)
        return
    }, [setPinned_])

    const setPinned = useCallback(
        (cb: (p: boolean) => boolean) => {
            setPinned_((prev) => {
                const next = cb(prev)
                return next
            })
        },
        [setPinned_]
    )

    return { pinned, setPinned }
}
