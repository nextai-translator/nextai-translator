package sys

import (
	"context"
	"errors"
	"strings"

	"github.com/egoist/mygo/audio"
)

// Voice is a voice the system speaks with.
type Voice struct {
	// ID is what Speak takes as voiceID.
	ID string
	// Name is the voice's name for people.
	Name string
	// Lang is the voice's language as BCP-47, such as "en-US" or "zh-CN".
	Lang string
}

// ErrSpeechUnavailable is returned where the system has no speech engine.
var ErrSpeechUnavailable = errors.New("sys: no text-to-speech engine on this system")

// speechLocales maps the app's language codes to the locales voices are
// chosen by, as langCode2TTSLang in src/common/tts/index.ts.
var speechLocales = map[string]string{
	"en":      "en-US",
	"zh-Hans": "zh-CN",
	"zh-Hant": "zh-TW",
	"yue":     "zh-HK",
	"lzh":     "zh-CN",
	"ja":      "ja-JP",
	"ko":      "ko-KR",
	"fr":      "fr-FR",
	"de":      "de-DE",
	"es":      "es-ES",
	"it":      "it-IT",
	"ru":      "ru-RU",
	"pt":      "pt-PT",
	"nl":      "nl-NL",
	"pl":      "pl-PL",
	"ar":      "ar-001",
	"bg":      "bg-BG",
	"ca":      "ca-ES",
	"cs":      "cs-CZ",
	"da":      "da-DK",
	"el":      "el-GR",
	"fi":      "fi-FI",
	"he":      "he-IL",
	"hi":      "hi-IN",
	"hr":      "hr-HR",
	"id":      "id-ID",
	"vi":      "vi-VN",
	"sv":      "sv-SE",
}

// TTSLocale returns the locale the app's language code lang is spoken in,
// en-US for languages it has none for.
func TTSLocale(lang string) string {
	if l, ok := speechLocales[lang]; ok {
		return l
	}
	return "en-US"
}

// Voices returns the voices installed on the system.
func Voices() ([]Voice, error) {
	return speechVoices()
}

// Speak says text and returns when it has been said, or when ctx is
// cancelled, which stops it at once and returns ctx's error. lang is the
// app's language code (en, zh-Hans, zh-Hant, yue, ja, ko, fr, …; see
// TTSLocale). voiceID is the ID of one of Voices; "" or a voice no longer
// installed picks the system's voice for the language. rate 1 is normal
// speed, from 0.1 to 2; volume is from 0 to 1.
func Speak(ctx context.Context, text, lang, voiceID string, rate, volume float64) error {
	if strings.TrimSpace(text) == "" {
		return nil
	}
	if rate <= 0 {
		rate = 1
	}
	rate = min(max(rate, 0.1), 2)
	volume = min(max(volume, 0), 1)
	if err := ctx.Err(); err != nil {
		return err
	}
	return speechSpeak(ctx, text, TTSLocale(lang), voiceID, rate, volume)
}

// speechLangMatch reports how well a voice's language suits locale: 2 for
// the same locale, 1 for the same language, 0 for none.
func speechLangMatch(voiceLang, locale string) int {
	v, l := strings.ToLower(strings.ReplaceAll(voiceLang, "_", "-")), strings.ToLower(locale)
	if v == l {
		return 2
	}
	if speechPrimary(v) == speechPrimary(l) {
		return 1
	}
	return 0
}

// speechPrimary returns a language tag's language, with Chinese's
// languages (cmn, yue) as zh.
func speechPrimary(tag string) string {
	p, _, _ := strings.Cut(strings.ToLower(tag), "-")
	switch p {
	case "cmn", "yue", "zho", "chi":
		return "zh"
	}
	return p
}

// speechPickVoice returns the voice of voices that best speaks locale:
// the one whose ID is voiceID, else the best of the locale's (rank
// orders those, higher first), else of its language. ok is false when
// none speaks it.
func speechPickVoice(voices []Voice, voiceID, locale string, rank func(Voice) int) (Voice, bool) {
	if voiceID != "" {
		for _, v := range voices {
			if v.ID == voiceID {
				return v, true
			}
		}
	}
	best, bestScore := Voice{}, -1<<31
	for _, v := range voices {
		m := speechLangMatch(v.Lang, locale)
		if m == 0 {
			continue
		}
		score := m * 1000
		if rank != nil {
			score += rank(v)
		}
		if score > bestScore {
			best, bestScore = v, score
		}
	}
	return best, bestScore > -1<<31
}

// speechPlay plays wav at speed (keeping its pitch) and volume, until it
// ends or ctx is cancelled.
func speechPlay(ctx context.Context, wav []byte, speed, volume float64) error {
	sound, err := audio.DecodeSound(wav)
	if err != nil {
		return err
	}
	p := sound.NewPlayer().SetVolume(volume)
	if speed != 1 {
		p.SetPreservesPitch(true).SetSpeed(speed)
	}
	done := make(chan struct{}, 1)
	off := p.OnEnd(func() {
		select {
		case done <- struct{}{}:
		default:
		}
	})
	defer off()
	p.Play()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		p.Stop()
		return ctx.Err()
	}
}
