import { IconBaseProps } from 'react-icons'
import Logo from '@/common/assets/images/openrouter.svg?react'
import { createUseStyles } from 'react-jss'

const useStyles = createUseStyles({
    icon: {
        '& path': {
            fill: 'currentColor',
        },
    },
})

export function OpenRouterIcon(props: IconBaseProps) {
    const styles = useStyles()
    return <Logo className={styles.icon} width={props.size} height={props.size} />
}
