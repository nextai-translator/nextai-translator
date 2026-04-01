import { IEngine } from './interfaces'
import { IconType } from 'react-icons'
import { Ollama } from './ollama'
import { OllamaIcon } from '@/common/components/icons/OllamaIcon'

export type Provider = 'Ollama'

export const engineIcons: Record<Provider, IconType> = {
    Ollama: OllamaIcon,
}

export const providerToEngine: Record<Provider, { new (): IEngine }> = {
    Ollama: Ollama,
}

export function getEngine(provider: Provider): IEngine {
    const cls = providerToEngine[provider]
    return new cls()
}
