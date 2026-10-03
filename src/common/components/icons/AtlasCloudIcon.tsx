import { IconBaseProps } from 'react-icons'

// Atlas Cloud publishes no vector brand asset, so this is a simple geometric
// mark (a cloud over twin peaks, echoing "Atlas") drawn inline rather than a
// reproduction of a trademark.
export function AtlasCloudIcon(props: IconBaseProps) {
    const size = props.size ?? '1em'
    return (
        <svg width={size} height={size} viewBox='0 0 24 24' fill='currentColor' role='img' aria-label='Atlas Cloud'>
            <path d='M7.5 9.5a4 4 0 0 1 7.8-1.2 3.2 3.2 0 0 1 .7 6.2H7.5a2.5 2.5 0 0 1 0-5Z' opacity='.45' />
            <path d='M2 21 8 11l3.6 6 2.4-3.6L22 21Z' />
        </svg>
    )
}
