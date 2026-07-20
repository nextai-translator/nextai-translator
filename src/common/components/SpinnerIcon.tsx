import { IconBaseProps } from 'react-icons'
import { createUseStyles } from 'react-jss'

const useStyles = createUseStyles({
    'root': {
        animation: '$spin 1s linear infinite',
        display: 'block',
        transformBox: 'fill-box',
        transformOrigin: 'center',
        willChange: 'transform',
    },
    '@keyframes spin': {
        '0%': {
            transform: 'rotate(0deg)',
        },
        '100%': {
            transform: 'rotate(360deg)',
        },
    },
})

export interface ISpinnerIconProps extends IconBaseProps {}

export function SpinnerIcon({
    size = '1em',
    color,
    className,
    style,
    title,
    'aria-label': ariaLabel,
}: ISpinnerIconProps) {
    const styles = useStyles()
    return (
        <svg
            role='progressbar'
            viewBox='0 0 24 24'
            fill='none'
            aria-label={ariaLabel}
            className={`${styles.root}${className ? ` ${className}` : ''}`}
            style={{ color, height: size, width: size, ...style }}
        >
            {title && <title>{title}</title>}
            <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='2' opacity='0.16' />
            <circle
                cx='12'
                cy='12'
                r='9'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeDasharray='16 41'
            />
        </svg>
    )
}
