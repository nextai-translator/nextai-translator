package gui

import (
	"context"
	"sort"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
	"github.com/nextai-translator/nextai-translator/desktop/internal/i18n"
	"github.com/nextai-translator/nextai-translator/desktop/internal/lang"
	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

type settingsState struct {
	draft  settings.Settings
	loaded bool
	tab    int

	models     []string
	modelsFor  string // provider the list is for
	modelsErr  string
	loading    bool
	hotkeyErrs map[string]error
	saved      bool
}

// OpenSettings shows the settings window.
func (a *App) OpenSettings() {
	if a.settingsWin == nil || a.settingsWin.IsDestroyed() {
		a.set = settingsState{draft: a.Settings.Get(), loaded: true}
	}
	a.openWindow(&a.settingsWin, T("Settings"), a.settingsView, 640, 680, "settings")
}

// field is one text setting of a provider.
type field struct {
	label  string
	value  *string
	secret bool
}

// providerFields lists what a provider needs, and where its model goes.
func providerFields(s *settings.Settings, p string) (fields []field, model, custom *string) {
	key := func(v *string) field { return field{"API Key", v, true} }
	url := func(v *string) field { return field{"API URL", v, false} }
	path := func(v *string) field { return field{"API URL Path", v, false} }
	switch p {
	case engine.OpenAI:
		return []field{key(&s.APIKeys), url(&s.APIURL), path(&s.APIURLPath)}, &s.APIModel, &s.CustomModelName
	case engine.Azure:
		return []field{key(&s.AzureAPIKeys), url(&s.AzureAPIURL), path(&s.AzureAPIURLPath)}, &s.AzureAPIModel, nil
	case engine.MiniMax:
		return []field{{"Group ID", &s.MiniMaxGroupID, false}, key(&s.MiniMaxAPIKey)}, &s.MiniMaxAPIModel, nil
	case engine.Gemini:
		return []field{key(&s.GeminiAPIKey), url(&s.GeminiAPIURL)}, &s.GeminiAPIModel, nil
	case engine.Moonshot:
		return []field{key(&s.MoonshotAPIKey)}, &s.MoonshotAPIModel, nil
	case engine.DeepSeek:
		return []field{key(&s.DeepSeekAPIKey)}, &s.DeepSeekAPIModel, nil
	case engine.Ollama:
		return []field{url(&s.OllamaAPIURL), {"Keep alive", &s.OllamaModelLifetimeInMemory, false}}, &s.OllamaAPIModel, &s.OllamaCustomModelName
	case engine.Groq:
		return []field{key(&s.GroqAPIKey), url(&s.GroqAPIURL), path(&s.GroqAPIURLPath)}, &s.GroqAPIModel, &s.GroqCustomModelName
	case engine.Claude:
		return []field{key(&s.ClaudeAPIKey), url(&s.ClaudeAPIURL), path(&s.ClaudeAPIURLPath)}, &s.ClaudeAPIModel, &s.ClaudeCustomModelName
	case engine.Cohere:
		return []field{key(&s.CohereAPIKey)}, &s.CohereAPIModel, nil
	case engine.Cerebras:
		return []field{key(&s.CerebrasAPIKey)}, &s.CerebrasAPIModel, nil
	case engine.TeamoRouter:
		return []field{key(&s.TeamoRouterAPIKey)}, &s.TeamoRouterAPIModel, nil
	case engine.OpenRouter:
		return []field{key(&s.OpenRouterAPIKey)}, &s.OpenRouterAPIModel, nil
	case engine.LiteLLM:
		return []field{url(&s.LiteLLMAPIURL), key(&s.LiteLLMAPIKey)}, &s.LiteLLMAPIModel, nil
	}
	return nil, nil, nil
}

func (a *App) settingsView(c *ui.Context) {
	th := c.Theme()
	d := &a.set.draft
	if c.Shortcut(ui.Cmd, ui.KeyS) {
		a.saveSettings()
	}
	ui.Column(c).Fill().Children(func() {
		ui.Box(c).Padding(12, 16, 0, 16).Children(func() {
			ui.Tabs(c, &a.set.tab, T("General"), T("Provider"), T("Hotkeys"), T("Proxy"))
		})
		ui.Scroll(c.Key("settings-body")).Grow(1).Children(func() {
			ui.Box(c).Padding(16).Children(func() {
				ui.Form(c, func() {
					switch a.set.tab {
					case 0:
						a.generalSettings(c, d)
					case 1:
						a.providerSettings(c, d)
					case 2:
						a.hotkeySettings(c, d)
					case 3:
						proxySettings(c, d)
					}
				})
			})
		})
		ui.Divider(c)
		ui.Row(c).Padding(12, 16).Gap(8).AlignItems(ui.Center).Children(func() {
			if a.set.saved {
				ui.Text(c, T("Saved")).TextColor(th.TextMuted)
			}
			ui.Spacer(c)
			if ui.Button(c, T("Cancel")).Clicked() {
				a.set.draft = a.Settings.Get()
				a.set.saved = false
				a.settingsWin.Close()
			}
			if ui.PrimaryButton(c, T("Save")).Clicked() {
				a.saveSettings()
			}
		})
	})
}

func (a *App) saveSettings() {
	if err := a.Settings.Save(a.set.draft); err != nil {
		a.set.saved = false
		if a.settingsWin != nil {
			a.settingsWin.Update(func() {})
		}
		return
	}
	s := a.Settings.Get()
	ApplyAppearance(s)
	if a.OnSettingsSaved != nil {
		a.set.hotkeyErrs = a.OnSettingsSaved(s)
	}
	a.set.saved = true
	a.redraw()
}

// ApplyAppearance follows the theme and language settings.
func ApplyAppearance(s settings.Settings) {
	i18n.Set(s.I18n)
	switch s.ThemeType {
	case "light":
		mygo.Theme.SetSource(mygo.ThemeLight)
	case "dark":
		mygo.Theme.SetSource(mygo.ThemeDark)
	default:
		mygo.Theme.SetSource(mygo.ThemeSystem)
	}
}

func (a *App) generalSettings(c *ui.Context, d *settings.Settings) {
	codes, names := make([]string, len(i18n.Locales)), make([]string, len(i18n.Locales))
	for i, l := range i18n.Locales {
		codes[i], names[i] = l.Code, l.Name
	}
	ui.Field(c, T("i18n"), func() { a.ch.choose(c, "i18n", &d.I18n, codes, names) })
	ui.Field(c, T("Theme"), func() {
		a.ch.choose(c, "theme", &d.ThemeType, []string{"followTheSystem", "light", "dark"},
			[]string{T("Follow the System"), T("Light"), T("Dark")})
	})
	tc, tn := langOptions(lang.Targets(), "")
	ui.Field(c, T("Default target language"), func() { a.ch.choose(c, "target", &d.DefaultTargetLanguage, tc[1:], tn[1:]) })
	modes := []string{"translate", "polishing", "summarize", "analyze", "explain-code"}
	ui.Field(c, T("Default translate mode"), func() {
		a.ch.choose(c, "mode", &d.DefaultTranslateMode, modes,
			[]string{T("Translate"), T("Polishing"), T("Summarize"), T("Analyze"), T("Explain Code")})
	})
	ui.Field(c, T("Language detection engine"), func() {
		a.ch.choose(c, "detect", &d.LanguageDetection, []string{"baidu", "google", "bing", "local"},
			[]string{"Baidu", "Google", "Bing", T("Local")})
	})
	ui.Field(c, T("Font size"), func() {
		ui.NumberInput(c, &d.FontSize, 10, 32, 1)
	})
	ui.Checkbox(c, &d.RestorePreviousPosition, T("Restore previous position"))
	ui.Checkbox(c, &d.AutoHideWindowWhenOutOfFocus, T("Auto hide window when out of focus"))
	ui.Checkbox(c, &d.RunAtStartup, T("Run at startup"))
	if mygoGOOS == "darwin" {
		ui.Checkbox(c, &d.HideTheIconInTheDock, T("Hide the icon in the Dock bar"))
	}
}

func (a *App) providerSettings(c *ui.Context, d *settings.Settings) {
	ui.Field(c, T("Default service provider"), func() {
		if a.ch.choose(c, "provider", &d.Provider, engine.Providers, engine.Providers) {
			a.set.models, a.set.modelsErr = nil, ""
		}
	})
	fields, model, custom := providerFields(d, d.Provider)
	for _, f := range fields {
		ui.Field(c, T(f.label), func() {
			in := ui.TextInput(c.Key(d.Provider+f.label), f.value)
			if f.secret {
				in.Password()
			}
		})
	}
	if model != nil {
		f := ui.Field(c, T("API Model"), func() {
			ui.Row(c).Gap(6).AlignItems(ui.Center).Children(func() {
				ui.Box(c).Grow(1).Children(func() {
					ui.Autocomplete(c.Key(d.Provider+"model"), model, a.set.modelsList(d.Provider)).Placeholder(T("Model"))
				})
				if a.set.loading {
					ui.Spinner(c)
				} else if iconButton(c, iconRefresh, T("Refresh model list")).Clicked() {
					a.loadModels()
				}
			})
		})
		if a.set.modelsErr != "" {
			f.Error(a.set.modelsErr)
		}
	}
	if custom != nil {
		ui.Field(c, T("Custom model name"), func() { ui.TextInput(c.Key(d.Provider+"custom"), custom) })
	}
	if d.Provider == engine.Claude {
		ui.Checkbox(c, &d.ClaudeThinking, T("Thinking"))
		if d.ClaudeThinking {
			ui.Field(c, T("Thinking level"), func() {
				a.ch.choose(c, "thinking", &d.ClaudeThinkingLevel, []string{"low", "medium", "high"},
					[]string{T("Low"), T("Medium"), T("High")})
			})
		}
	}
}

func (st *settingsState) modelsList(provider string) []string {
	if st.modelsFor != provider {
		return nil
	}
	return st.models
}

// loadModels asks the provider for its models with the keys typed so far.
func (a *App) loadModels() {
	d := a.set.draft
	a.set.loading, a.set.modelsErr = true, ""
	client := a.httpClient(d)
	go func() {
		var ids []string
		e, err := engine.New(d.Provider, d, client)
		if err == nil {
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			var models []engine.Model
			models, err = e.ListModels(ctx, "")
			cancel()
			for _, m := range models {
				ids = append(ids, m.ID)
			}
			sort.Strings(ids)
		}
		a.post(func() {
			a.set.loading = false
			if a.set.draft.Provider != d.Provider {
				return
			}
			a.set.models, a.set.modelsFor = ids, d.Provider
			if err != nil {
				a.set.modelsErr = err.Error()
			}
		})
	}()
}

func (a *App) hotkeySettings(c *ui.Context, d *settings.Settings) {
	row := func(label, name string, v *string) {
		f := ui.Field(c, label, func() { hotkeyRecorder(c, name, v) })
		if err := a.set.hotkeyErrs[name]; err != nil {
			f.Error(err.Error())
		}
	}
	row(T("Hotkey"), "hotkey", &d.Hotkey)
	row(T("Display window Hotkey"), "displayWindowHotkey", &d.DisplayWindowHotkey)
}

func proxySettings(c *ui.Context, d *settings.Settings) {
	ui.Checkbox(c, &d.Proxy.Enabled, T("Enabled"))
	if !d.Proxy.Enabled {
		return
	}
	ui.Field(c, T("Protocol"), func() { ui.Select(c.Key("proto"), &d.Proxy.Protocol, []string{"HTTP", "HTTPS"}) })
	ui.Field(c, T("Server"), func() { ui.TextInput(c.Key("server"), &d.Proxy.Server) })
	ui.Field(c, T("Port"), func() { ui.TextInput(c.Key("port"), &d.Proxy.Port) })
	ui.Field(c, T("Username"), func() { ui.TextInput(c.Key("user"), &d.Proxy.BasicAuth.Username) })
	ui.Field(c, T("Password"), func() { ui.TextInput(c.Key("pass"), &d.Proxy.BasicAuth.Password).Password() })
	ui.Field(c, T("No proxy"), func() { ui.TextInput(c.Key("noproxy"), &d.Proxy.NoProxy) })
}
