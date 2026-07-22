import { IconBaseProps } from 'react-icons'

export interface ISpinnerIconProps extends IconBaseProps {}

// The arc is rotated with SMIL (animateTransform) around the explicit user-unit
// center (12,12) instead of a CSS transform: WKWebView miscomputes the CSS
// transform reference box on svg roots (both fill-box and the default), which
// made the spinner orbit around an off-center origin instead of spinning.
export function SpinnerIcon({
    size = '1em',
    color,
    className,
    style,
    title,
    'aria-label': ariaLabel,
}: ISpinnerIconProps) {
    return (
        <svg
            role='progressbar'
            viewBox='0 0 24 24'
            fill='none'
            aria-label={ariaLabel}
            className={className}
            style={{ color, display: 'block', height: size, width: size, ...style }}
        >
            {title && <title>{title}</title>}
            <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='2' opacity='0.16' />
            <g>
                <circle
                    cx='12'
                    cy='12'
                    r='9'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeDasharray='16 41'
                />
                <animateTransform
                    attributeName='transform'
                    type='rotate'
                    from='0 12 12'
                    to='360 12 12'
                    dur='1s'
                    repeatCount='indefinite'
                />
            </g>
        </svg>
    )
}
