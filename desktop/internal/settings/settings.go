// Package settings holds the user's configuration. It reads and writes the
// same config.json the Tauri app used, so an upgrade keeps everything: keys
// this version does not know are kept as they were.
package settings

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"sync"
)

// ConfigDirName is the directory under the user config directory that the
// Tauri app used (its bundle identifier).
const ConfigDirName = "xyz.yetone.apps.openai-translator"

const legacyConfigDirName = "xyz.yetone.apps.nextai-translator"

// CustomModelID is the model value that means "use the custom model name".
const CustomModelID = "__custom__"

type BasicAuth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Proxy struct {
	Enabled   bool      `json:"enabled"`
	Protocol  string    `json:"protocol"` // HTTP or HTTPS
	Server    string    `json:"server"`
	Port      string    `json:"port"`
	BasicAuth BasicAuth `json:"basicAuth"`
	NoProxy   string    `json:"noProxy"`
}

type TTSVoice struct {
	Lang  string `json:"lang"`
	Voice string `json:"voice"`
}

type TTS struct {
	Voices   []TTSVoice `json:"voices,omitempty"`
	Provider string     `json:"provider,omitempty"`
	Volume   *float64   `json:"volume,omitempty"`
	Rate     *float64   `json:"rate,omitempty"`
}

// Settings mirrors ISettings in src/common/types.ts.
type Settings struct {
	AutomaticCheckForUpdates bool   `json:"automaticCheckForUpdates"`
	Provider                 string `json:"provider"`

	APIKeys      string `json:"apiKeys"`
	APIURL       string `json:"apiURL"`
	APIURLPath   string `json:"apiURLPath"`
	APIModel     string `json:"apiModel"`
	ChatGPTModel string `json:"chatgptModel"`
	// ChatGPTAccessToken is the desktop app's way into ChatGPT (Web): the
	// accessToken of chatgpt.com/api/auth/session, as the browser has no
	// cookies to lend it.
	ChatGPTAccessToken string `json:"chatgptAccessToken"`
	CustomModelName    string `json:"customModelName"`

	AzureAPIKeys    string `json:"azureAPIKeys"`
	AzureAPIURL     string `json:"azureAPIURL"`
	AzureAPIURLPath string `json:"azureAPIURLPath"`
	AzureAPIModel   string `json:"azureAPIModel"`
	AzMaxWords      int    `json:"azMaxWords"`

	MiniMaxGroupID  string `json:"miniMaxGroupID"`
	MiniMaxAPIKey   string `json:"miniMaxAPIKey"`
	MiniMaxAPIModel string `json:"miniMaxAPIModel"`

	GeminiAPIURL   string `json:"geminiAPIURL"`
	GeminiAPIKey   string `json:"geminiAPIKey"`
	GeminiAPIModel string `json:"geminiAPIModel"`

	MoonshotAPIKey   string `json:"moonshotAPIKey"`
	MoonshotAPIModel string `json:"moonshotAPIModel"`

	DeepSeekAPIKey   string `json:"deepSeekAPIKey"`
	DeepSeekAPIModel string `json:"deepSeekAPIModel"`

	OllamaAPIURL                string `json:"ollamaAPIURL"`
	OllamaAPIModel              string `json:"ollamaAPIModel"`
	OllamaCustomModelName       string `json:"ollamaCustomModelName"`
	OllamaModelLifetimeInMemory string `json:"ollamaModelLifetimeInMemory"`

	GroqAPIURL          string `json:"groqAPIURL"`
	GroqAPIURLPath      string `json:"groqAPIURLPath"`
	GroqAPIModel        string `json:"groqAPIModel"`
	GroqAPIKey          string `json:"groqAPIKey"`
	GroqCustomModelName string `json:"groqCustomModelName"`

	ClaudeAPIURL          string `json:"claudeAPIURL"`
	ClaudeAPIURLPath      string `json:"claudeAPIURLPath"`
	ClaudeAPIModel        string `json:"claudeAPIModel"`
	ClaudeAPIKey          string `json:"claudeAPIKey"`
	ClaudeCustomModelName string `json:"claudeCustomModelName"`
	ClaudeThinking        bool   `json:"claudeThinking"`
	ClaudeThinkingLevel   string `json:"claudeThinkingLevel"`

	KimiAccessToken     string `json:"kimiAccessToken"`
	KimiRefreshToken    string `json:"kimiRefreshToken"`
	ChatGLMAccessToken  string `json:"chatglmAccessToken"`
	ChatGLMRefreshToken string `json:"chatglmRefreshToken"`

	CohereAPIKey   string `json:"cohereAPIKey"`
	CohereAPIModel string `json:"cohereAPIModel"`

	CerebrasAPIKey   string `json:"cerebrasAPIKey"`
	CerebrasAPIModel string `json:"cerebrasAPIModel"`

	TeamoRouterAPIKey   string `json:"teamoRouterAPIKey"`
	TeamoRouterAPIModel string `json:"teamoRouterAPIModel"`

	OpenRouterAPIKey   string `json:"openRouterAPIKey"`
	OpenRouterAPIModel string `json:"openRouterAPIModel"`

	LiteLLMAPIURL   string `json:"liteLLMAPIURL"`
	LiteLLMAPIKey   string `json:"liteLLMAPIKey"`
	LiteLLMAPIModel string `json:"liteLLMAPIModel"`

	NoModelsAPISupport bool `json:"noModelsAPISupport"`
	ThinkingEnabled    bool `json:"thinkingEnabled"`

	AutoTranslate         bool   `json:"autoTranslate"`
	DefaultTranslateMode  string `json:"defaultTranslateMode"`
	DefaultTargetLanguage string `json:"defaultTargetLanguage"`
	WritingTargetLanguage string `json:"writingTargetLanguage"`
	LanguageDetection     string `json:"languageDetectionEngine"`

	Hotkey                string `json:"hotkey"`
	DisplayWindowHotkey   string `json:"displayWindowHotkey"`
	OCRHotkey             string `json:"ocrHotkey"`
	QuickTranslatorHotkey string `json:"quickTranslatorHotkey"`
	WritingHotkey         string `json:"writingHotkey"`
	WritingNewlineHotkey  string `json:"writingNewlineHotkey"`

	ThemeType string `json:"themeType"` // light, dark, followTheSystem
	I18n      string `json:"i18n"`
	TTS       TTS    `json:"tts"`

	AlwaysShowIcons                                 bool `json:"alwaysShowIcons"`
	SelectInputElementsText                         bool `json:"selectInputElementsText"`
	ReadSelectedWordsFromInputElementsText          bool `json:"readSelectedWordsFromInputElementsText"`
	RestorePreviousPosition                         bool `json:"restorePreviousPosition"`
	RunAtStartup                                    bool `json:"runAtStartup"`
	DisableCollectingStatistics                     bool `json:"disableCollectingStatistics"`
	AllowUsingClipboardWhenSelectedTextNotAvailable bool `json:"allowUsingClipboardWhenSelectedTextNotAvailable"`
	Pinned                                          bool `json:"pinned"`
	AutoCollect                                     bool `json:"autoCollect"`
	HideTheIconInTheDock                            bool `json:"hideTheIconInTheDock"`
	AutoHideWindowWhenOutOfFocus                    bool `json:"autoHideWindowWhenOutOfFocus"`
	EnableBackgroundBlur                            bool `json:"enableBackgroundBlur"`
	UseCompactLookup                                bool `json:"useCompactLookup"`

	Proxy Proxy `json:"proxy"`

	FontSize   float64 `json:"fontSize"`
	UIFontSize float64 `json:"uiFontSize"`
	IconSize   float64 `json:"iconSize"`
}

// Defaults returns the settings of a fresh install, as getSettings fills
// them in src/common/utils.ts.
func Defaults() Settings {
	return Settings{
		AutomaticCheckForUpdates:    true,
		Provider:                    "OpenAI",
		APIURL:                      "https://api.openai.com",
		APIURLPath:                  "/v1/chat/completions",
		APIModel:                    "gpt-5-nano",
		AzMaxWords:                  1024,
		MiniMaxAPIModel:             "MiniMax-M3",
		GeminiAPIURL:                "https://generativelanguage.googleapis.com",
		OllamaAPIURL:                "http://127.0.0.1:11434",
		OllamaModelLifetimeInMemory: "5m",
		GroqAPIURL:                  "https://api.groq.com",
		GroqAPIURLPath:              "/openai/v1/chat/completions",
		ClaudeAPIURL:                "https://api.anthropic.com",
		ClaudeAPIURLPath:            "/v1/messages",
		ClaudeThinkingLevel:         "medium",
		LiteLLMAPIURL:               "http://localhost:4000",
		DefaultTranslateMode:        "translate",
		DefaultTargetLanguage:       "zh-Hans",
		WritingTargetLanguage:       "en",
		LanguageDetection:           "baidu",
		ThemeType:                   "followTheSystem",
		I18n:                        "en",
		HideTheIconInTheDock:        true,
		SelectInputElementsText:     true,
		Proxy: Proxy{
			Protocol: "HTTP",
			Server:   "127.0.0.1",
			Port:     "1080",
			NoProxy:  "localhost,127.0.0.1",
		},
		FontSize:   15,
		UIFontSize: 14,
		IconSize:   15,
	}
}

// Store loads and saves the settings file. Its methods are safe for
// concurrent use.
type Store struct {
	path string

	mu        sync.Mutex
	raw       map[string]json.RawMessage // everything in the file, unknown keys too
	cur       Settings
	listeners []func(Settings)
}

// DefaultPath is config.json in the Tauri app's config directory.
func DefaultPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	path := filepath.Join(dir, ConfigDirName, "config.json")
	// The app was renamed once; move the old directory over, as the Tauri
	// app did.
	if _, err := os.Stat(filepath.Dir(path)); errors.Is(err, fs.ErrNotExist) {
		old := filepath.Join(dir, legacyConfigDirName)
		if _, err := os.Stat(old); err == nil {
			_ = os.Rename(old, filepath.Dir(path))
		}
	}
	return path, nil
}

// Open reads the settings at path; a missing file gives the defaults.
func Open(path string) (*Store, error) {
	s := &Store{path: path, raw: map[string]json.RawMessage{}}
	data, err := os.ReadFile(path)
	switch {
	case errors.Is(err, fs.ErrNotExist):
	case err != nil:
		return nil, err
	default:
		if err := json.Unmarshal(data, &s.raw); err != nil {
			// Keep the broken file for the user, and start over.
			_ = os.Rename(path, path+".corrupted")
			s.raw = map[string]json.RawMessage{}
		}
	}
	s.cur = decode(s.raw)
	return s, nil
}

// decode fills the defaults in for keys the file lacks, or has as null.
func decode(raw map[string]json.RawMessage) Settings {
	st := Defaults()
	clean := make(map[string]json.RawMessage, len(raw))
	for k, v := range raw {
		if string(v) != "null" {
			clean[k] = v
		}
	}
	data, _ := json.Marshal(clean)
	_ = json.Unmarshal(data, &st)
	// Values the TS code also normalizes.
	if st.TTS.Provider == "EdgeTTS" {
		st.TTS.Provider = "LocalTTS"
	}
	if st.Provider == "Azure" {
		if st.AzureAPIKeys == "" {
			st.AzureAPIKeys = st.APIKeys
		}
		if st.AzureAPIURL == "" {
			st.AzureAPIURL = st.APIURL
		}
		if st.AzureAPIURLPath == "" {
			st.AzureAPIURLPath = st.APIURLPath
		}
		if st.AzureAPIModel == "" {
			st.AzureAPIModel = st.APIModel
		}
	}
	if _, ok := clean["enableBackgroundBlur"]; !ok {
		if v, ok := clean["enableMica"]; ok {
			_ = json.Unmarshal(v, &st.EnableBackgroundBlur)
		}
	}
	defaults := Defaults()
	for _, f := range []struct {
		v *string
		d string
	}{
		{&st.Provider, defaults.Provider}, {&st.APIURL, defaults.APIURL}, {&st.APIURLPath, defaults.APIURLPath},
		{&st.APIModel, defaults.APIModel}, {&st.DefaultTranslateMode, defaults.DefaultTranslateMode},
		{&st.DefaultTargetLanguage, defaults.DefaultTargetLanguage}, {&st.WritingTargetLanguage, defaults.WritingTargetLanguage},
		{&st.ThemeType, defaults.ThemeType}, {&st.I18n, defaults.I18n}, {&st.OllamaAPIURL, defaults.OllamaAPIURL},
		{&st.GroqAPIURL, defaults.GroqAPIURL}, {&st.GroqAPIURLPath, defaults.GroqAPIURLPath},
		{&st.ClaudeAPIURL, defaults.ClaudeAPIURL}, {&st.ClaudeAPIURLPath, defaults.ClaudeAPIURLPath},
		{&st.LiteLLMAPIURL, defaults.LiteLLMAPIURL}, {&st.MiniMaxAPIModel, defaults.MiniMaxAPIModel},
		{&st.LanguageDetection, defaults.LanguageDetection},
	} {
		if *f.v == "" {
			*f.v = f.d
		}
	}
	return st
}

// Get returns a copy of the current settings.
func (s *Store) Get() Settings {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.cur
}

// Path is the file the store reads and writes.
func (s *Store) Path() string { return s.path }

// OnChange calls fn, on the goroutine that saved, after every Save.
func (s *Store) OnChange(fn func(Settings)) {
	s.mu.Lock()
	s.listeners = append(s.listeners, fn)
	s.mu.Unlock()
}

// Save writes st, keeping the keys of the file this version does not know.
func (s *Store) Save(st Settings) error {
	data, err := json.Marshal(st)
	if err != nil {
		return err
	}
	var known map[string]json.RawMessage
	if err := json.Unmarshal(data, &known); err != nil {
		return err
	}
	s.mu.Lock()
	for k, v := range known {
		s.raw[k] = v
	}
	out, err := json.MarshalIndent(s.raw, "", "  ")
	if err == nil {
		err = writeFileAtomic(s.path, out)
	}
	if err == nil {
		s.cur = st
	}
	listeners := append([]func(Settings){}, s.listeners...)
	s.mu.Unlock()
	if err != nil {
		return err
	}
	for _, fn := range listeners {
		fn(st)
	}
	return nil
}

// Update changes the settings with fn and saves them.
func (s *Store) Update(fn func(*Settings)) error {
	st := s.Get()
	fn(&st)
	return s.Save(st)
}

func writeFileAtomic(path string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".config-*.json")
	if err != nil {
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	return os.Rename(tmp.Name(), path)
}
