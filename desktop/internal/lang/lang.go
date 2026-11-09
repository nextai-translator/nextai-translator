// Package lang is the list of languages the translator knows and the
// detection of a text's language (src/common/lang).
package lang

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
	"unicode/utf8"
)

// Config describes one language.
type Config struct {
	Code       string
	Name       string // native name, used in prompts and menus
	NameEn     string
	Phonetic   string // transcription system; "" means the default
	NoPhonetic bool   // the language has no phonetic notation
	IsVariant  bool
	NotSource  bool
	NotTarget  bool
	RTL        bool
	RolePrompt string
	// CommandPrompt overrides "Please translate to <Name>".
	CommandPrompt func(src Config) string
}

// PhoneticNotation is the transcription system to ask for, or "" when the
// language has none.
func (c Config) PhoneticNotation() string {
	if c.NoPhonetic {
		return ""
	}
	if c.Phonetic == "" {
		return "transcription"
	}
	return c.Phonetic
}

// Role is the system prompt for translating into the language.
func (c Config) Role() string {
	if c.RolePrompt != "" {
		return c.RolePrompt
	}
	return "You are a professional translator."
}

// Command is the instruction for translating from src into the language.
func (c Config) Command(src Config) string {
	if c.CommandPrompt != nil {
		return c.CommandPrompt(src)
	}
	return "Please translate to " + c.Name
}

var byCode = func() map[string]Config {
	m := make(map[string]Config, len(configs))
	for _, c := range configs {
		m[c.Code] = c
	}
	return m
}()

// All returns every language, in display order.
func All() []Config { return append([]Config(nil), configs...) }

// Sources are the languages text can be translated from.
func Sources() []Config {
	var out []Config
	for _, c := range configs {
		if !c.NotSource {
			out = append(out, c)
		}
	}
	return out
}

// Targets are the languages text can be translated into.
func Targets() []Config {
	var out []Config
	for _, c := range configs {
		if !c.NotTarget {
			out = append(out, c)
		}
	}
	return out
}

// Get returns the language for code; an unknown code gives a config named
// "Unknown", as getLangConfig does.
func Get(code string) Config {
	if c, ok := byCode[code]; ok {
		return c
	}
	return Config{Code: code, Name: "Unknown", NameEn: "Unknown"}
}

// Known reports whether code is in the list.
func Known(code string) bool {
	_, ok := byCode[code]
	return ok
}

// Normalize returns code if it is known, else "en" (intoLangCode).
func Normalize(code string) string {
	if Known(code) {
		return code
	}
	return "en"
}

// IsChinese reports whether code is one of the Chinese target languages.
func IsChinese(code string) bool {
	switch code {
	case "zh-Hans", "zh-Hant", "lzh", "yue", "jdbhw", "xdbhw":
		return true
	}
	return false
}

// PickAutoTarget chooses the target language when the user has not picked
// one: never the source language itself.
func PickAutoTarget(source, defaultTarget, writingTarget string) string {
	if source == "zh-Hans" || source == "zh-Hant" {
		return "en"
	}
	if defaultTarget == "" {
		defaultTarget = "en"
	}
	if source != defaultTarget {
		return defaultTarget
	}
	if writingTarget == "" {
		writingTarget = "en"
	}
	if writingTarget != source {
		return writingTarget
	}
	return "en"
}

// IsTraditional reports whether a Chinese text uses more traditional than
// simplified characters.
func IsTraditional(s string) bool {
	var simp, trad int
	for _, r := range s {
		if strings.ContainsRune(simplified, r) {
			simp++
		} else if strings.ContainsRune(traditional, r) {
			trad++
		}
	}
	return trad > simp
}

func in(r rune, lo, hi rune) bool { return r >= lo && r <= hi }

func isVietnamese(r rune) bool {
	switch r {
	case 0x0103, 0x00E2, 0x00EA, 0x00F4, 0x01A1, 0x01B0:
		return true
	}
	return in(r, 0x1EA1, 0x1EFF)
}

// LocalDetect guesses the language from the characters alone.
func LocalDetect(text string) string {
	if utf8.RuneCountInString(text) > 200 {
		text = string([]rune(text)[:200])
	}
	order := []string{"en", "zh", "ko", "vi", "th", "hmn", "ja", "ru", "es", "fr", "de"}
	w := map[string]int{}
	for _, r := range text {
		if in(r, 0x4e00, 0x9fa5) {
			w["zh"]++
			w["ja"]++
		}
		if in(r, 0xAC00, 0xD7A3) {
			w["ko"]++
		}
		if isVietnamese(r) {
			w["vi"]++
		}
		if in(r, 0x0E01, 0x0E5B) {
			w["th"]++
		}
		if in(r, 0x16F0, 0x16F9) {
			w["hmn"]++
		}
		if in(r, 0x3040, 0x30ff) {
			w["ja"]++
		}
		if in(r, 0x0400, 0x04FF) {
			w["ru"]++
		}
		if strings.ContainsRune("áéíóúüñ", r) {
			w["es"]++
		}
		if strings.ContainsRune("àâçéèêëîïôûùüÿœæ", r) {
			w["fr"]++
		}
		if strings.ContainsRune("äöüß", r) {
			w["de"]++
		}
	}
	for _, word := range strings.Split(text, " ") {
		if strings.IndexFunc(word, func(r rune) bool { return r < 128 && (r|0x20 >= 'a' && r|0x20 <= 'z') }) >= 0 {
			w["en"]++
			w["es"]++
			w["fr"]++
			w["de"]++
		}
	}
	if w["zh"] > 0 && w["zh"] == w["ja"] {
		w["zh"]++
	}
	if w["en"] > 0 && w["en"] == w["es"] && w["en"] == w["fr"] && w["en"] == w["de"] {
		w["en"]++
	}
	best := order[0]
	for _, k := range order[1:] {
		if w[k] > w[best] {
			best = k
		}
	}
	switch {
	case w[best] == 0:
		return "en"
	case best == "zh":
		if IsTraditional(text) {
			return "zh-Hant"
		}
		return "zh-Hans"
	}
	return best
}

// Detect asks the remote engine ("baidu", "google", "bing") and falls back
// to LocalDetect when it fails or answers with an unknown language.
func Detect(ctx context.Context, client *http.Client, engine, text string) string {
	if utf8.RuneCountInString(text) > 1000 {
		text = string([]rune(text)[:1000])
	}
	if client == nil {
		client = http.DefaultClient
	}
	var remote func(context.Context, *http.Client, string) (string, error)
	switch engine {
	case "baidu":
		remote = baiduDetect
	case "google":
		remote = googleDetect
	case "bing":
		remote = bingDetect
	}
	if remote != nil {
		if code, err := remote(ctx, client, text); err == nil && Known(code) {
			return code
		}
	}
	return LocalDetect(text)
}

func doJSON(client *http.Client, req *http.Request, v any) error {
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return &url.Error{Op: req.Method, URL: req.URL.String(), Err: errStatus(resp.StatusCode)}
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(v)
}

type errStatus int

func (e errStatus) Error() string { return http.StatusText(int(e)) }

func baiduDetect(ctx context.Context, client *http.Client, text string) (string, error) {
	codes := map[string]string{
		"zh": "zh-Hans", "cht": "zh-Hant", "en": "en", "jp": "ja", "kor": "ko", "fra": "fr",
		"spa": "es", "ru": "ru", "de": "de", "it": "it", "tr": "tr", "pt": "pt", "vie": "vi",
		"id": "id", "th": "th", "ar": "ar", "hi": "hi", "per": "fa",
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://fanyi.baidu.com/langdetect?"+url.Values{"query": {text}}.Encode(), nil)
	if err != nil {
		return "", err
	}
	var out struct {
		Lan string `json:"lan"`
	}
	if err := doJSON(client, req, &out); err != nil {
		return "", err
	}
	return codes[out.Lan], nil
}

func googleDetect(ctx context.Context, client *http.Client, text string) (string, error) {
	codes := map[string]string{
		"zh-CN": "zh-Hans", "zh-TW": "zh-Hant", "ja": "ja", "en": "en", "ko": "ko", "fr": "fr",
		"es": "es", "ru": "ru", "de": "de", "it": "it", "tr": "tr", "pt": "pt", "vi": "vi",
		"id": "id", "th": "th", "ar": "ar", "hi": "hi", "mn": "mn", "fa": "fa",
	}
	q := url.Values{
		"client": {"gtx"}, "sl": {"auto"}, "tl": {"zh-CN"}, "hl": {"zh-CN"}, "ie": {"UTF-8"},
		"oe": {"UTF-8"}, "otf": {"1"}, "ssel": {"0"}, "tsel": {"0"}, "kc": {"7"}, "q": {text},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://translate.google.com/translate_a/single?dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&"+q.Encode(), nil)
	if err != nil {
		return "", err
	}
	var out []any
	if err := doJSON(client, req, &out); err != nil {
		return "", err
	}
	if len(out) > 2 {
		if s, ok := out[2].(string); ok {
			return codes[s], nil
		}
	}
	return "", nil
}

const edgeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.42"

func bingDetect(ctx context.Context, client *http.Client, text string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://edge.microsoft.com/translate/auth", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", edgeUA)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	token, err := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	resp.Body.Close()
	if err != nil || resp.StatusCode != http.StatusOK {
		return "", errStatus(resp.StatusCode)
	}
	body, _ := json.Marshal([]map[string]string{{"Text": text}})
	req, err = http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api-edge.cognitive.microsofttranslator.com/detect?api-version=3.0", strings.NewReader(string(body)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+string(token))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", edgeUA)
	var out []struct {
		Language string `json:"language"`
	}
	if err := doJSON(client, req, &out); err != nil {
		return "", err
	}
	if len(out) > 0 {
		// Bing answers zh-Hans/zh-Hant and plain ISO codes, which match ours.
		return out[0].Language, nil
	}
	return "", nil
}
