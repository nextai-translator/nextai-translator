import { IconBaseProps } from 'react-icons'
import logoSrc from '@/common/assets/images/api-route.png'

export function APIRouteIcon(props: IconBaseProps) {
    return <img src={logoSrc} alt='API Route' height={props.size} width={props.size} />
}
