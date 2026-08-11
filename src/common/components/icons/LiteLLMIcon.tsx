import { IconBaseProps } from 'react-icons'

// LiteLLM's brand mark is the bullet-train emoji, so we render it directly and
// scale it to the requested icon size instead of shipping a separate asset.
export function LiteLLMIcon(props: IconBaseProps) {
    const size = props.size ?? '1em'
    return (
        <span
            role='img'
            aria-label='LiteLLM'
            style={{
                fontSize: size,
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {'\u{1F685}'}
        </span>
    )
}
