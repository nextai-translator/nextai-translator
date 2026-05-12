import { create } from 'zustand'

interface ITranslatorState {
    externalOriginalText?: string
    translatedText?: string
    isTranslating?: boolean
}

export const useTranslatorStore = create<ITranslatorState>()(() => ({
    externalOriginalText: undefined,
    translatedText: undefined,
    isTranslating: undefined,
}))

export const setExternalOriginalText = (text: string) => useTranslatorStore.setState({ externalOriginalText: text })
export const setStoreTranslatedText = (text: string) => useTranslatorStore.setState({ translatedText: text })
export const setStoreIsTranslating = (isTranslating: boolean) => useTranslatorStore.setState({ isTranslating })
