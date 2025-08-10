import { DoSpeakOptions, SpeakOptions } from './types'
import { getSettings } from '../utils'
import { speak as edgeSpeak } from './edge-tts'
import { LangCode } from '../lang'

export const defaultTTSProvider = 'EdgeTTS'

export const langCode2TTSLang: Partial<Record<LangCode, string>> = {
    'en': 'en-US',
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
    'yue': 'zh-HK',
    'lzh': 'zh-CN',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'es': 'es-ES',
    'it': 'it-IT',
    'ru': 'ru-RU',
    'pt': 'pt-PT',
    'nl': 'nl-NL',
    'pl': 'pl-PL',
    'ar': 'ar-001',
    'bg': 'bg-BG',
    'ca': 'ca-ES',
    'cs': 'cs-CZ',
    'da': 'da-DK',
    'el': 'el-GR',
    'fi': 'fi-FI',
    'he': 'he-IL',
    'hi': 'hi-IN',
    'hr': 'hr-HR',
    'id': 'id-ID',
    'vi': 'vi-VN',
    'sv': 'sv-SE',
}

export const ttsLangTestTextMap: Partial<Record<keyof typeof langCode2TTSLang, string>> = {
    'en': 'Hello, welcome to LinguaLearn',
    'zh-Hans': '你好，欢迎使用 LinguaLearn',
    'zh-Hant': '你好，歡迎使用 LinguaLearn',
    'yue': '你好，歡迎使用 LinguaLearn',
    'lzh': '你好，歡迎使用 LinguaLearn',
    'ja': 'こんにちは、LinguaLearn をご利用いただきありがとうございます',
    'ko': '안녕하세요, LinguaLearn 를 사용해 주셔서 감사합니다',
    'fr': "Bonjour, merci d'utiliser LinguaLearn",
    'de': 'Hallo, vielen Dank, dass Sie LinguaLearn verwenden',
    'es': 'Hola, gracias por usar LinguaLearn',
    'it': 'Ciao, grazie per aver utilizzato LinguaLearn',
    'ru': 'Здравствуйте, спасибо за использование LinguaLearn',
    'pt': 'Olá, obrigado por usar o LinguaLearn',
    'nl': 'Hallo, bedankt voor het gebruik van LinguaLearn',
    'pl': 'Cześć, dziękujemy za korzystanie z LinguaLearn',
    'ar': 'مرحبًا ، شكرًا لك على استخدام LinguaLearn',
    'bg': 'Здравейте, благодаря ви, че използвате LinguaLearn',
    'ca': 'Hola, gràcies per utilitzar LinguaLearn',
    'cs': 'Ahoj, děkujeme, že používáte LinguaLearn',
    'da': 'Hej, tak fordi du bruger LinguaLearn',
    'el': 'Γεια σας, ευχαριστούμε που χρησιμοποιείτε το LinguaLearn',
    'fi': 'Hei, kiitos, että käytät LinguaLearn',
    'he': 'שלום, תודה שהשתמשת ב- LinguaLearn',
    'hi': 'नमस्ते, LinguaLearn का उपयोग करने के लिए धन्यवाद',
    'hr': 'Bok, hvala što koristite LinguaLearn',
    'id': 'Halo, terima kasih telah menggunakan LinguaLearn',
    'vi': 'Xin chào, cảm ơn bạn đã sử dụng LinguaLearn',
    'sv': 'Hej, tack för att du använder LinguaLearn',
}

let supportVoices: SpeechSynthesisVoice[] = []
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
        supportVoices = speechSynthesis.getVoices()
    }
}

export async function speak({ text, lang, onFinish, signal }: SpeakOptions) {
    const settings = await getSettings()
    const voiceCfg = settings.tts?.voices?.find((item) => item.lang === lang)
    const rate = settings.tts?.rate
    const volume = settings.tts?.volume
    const provider = settings.tts?.provider ?? defaultTTSProvider

    return await doSpeak({
        provider,
        text,
        lang: lang ?? 'en',
        voice: voiceCfg?.voice,
        rate,
        volume,
        onFinish,
        signal,
    })
}

export async function doSpeak({
    provider,
    text,
    lang,
    voice,
    rate: rate_,
    volume,
    onFinish,
    signal,
    onStartSpeaking,
}: DoSpeakOptions) {
    const rate = (rate_ ?? 10) / 10

    if (provider === 'EdgeTTS') {
        return edgeSpeak({
            text,
            lang,
            onFinish,
            voice: voice,
            rate,
            volume: volume ?? 100,
            signal,
            onStartSpeaking,
        })
    }

    const ttsLang = langCode2TTSLang[lang] ?? 'en-US'

    const utterance = new SpeechSynthesisUtterance()
    if (onFinish) {
        utterance.addEventListener('end', onFinish, { once: true })
    }

    utterance.text = text
    utterance.lang = ttsLang
    utterance.rate = rate
    utterance.volume = volume ? volume / 100 : 1

    const defaultVoice = supportVoices.find((v) => v.lang === ttsLang) ?? null
    const settingsVoice = supportVoices.find((v) => v.voiceURI === voice)
    utterance.voice = settingsVoice ?? defaultVoice

    signal.addEventListener(
        'abort',
        () => {
            speechSynthesis.cancel()
        },
        { once: true }
    )

    onStartSpeaking?.()
    speechSynthesis.speak(utterance)
}
