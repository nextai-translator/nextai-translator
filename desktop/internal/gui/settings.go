package gui

import (
	"context"
	_ "embed"
	"sort"
	"strings"
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
	base   settings.Settings // what draft started from
	loaded bool
	tab    int

	models     []string
	modelsFor  string // provider the list is for
	modelsErr  string
	loading    bool
	autoLoaded map[string]bool // providers whose models were asked for on their own
	hotkeyErrs map[string]error
	saved      bool
	saveErr    string

	reveal   map[string]bool // passwords shown
	fontText string          // the font size as typed
	coffee   bool            // the Buy me a coffee dialog
	pinned   bool
}

// OpenSettings shows the settings window.
func (a *App) OpenSettings() {
	if a.settingsWin != nil && !a.settingsWin.IsDestroyed() {
		a.settingsWin.Show()
		a.settingsWin.Focus()
		return
	}
	a.resetSettings()
	a.settingsWin = mygo.NewWindow(mygo.WindowOptions{
		Title:          T("Settings"),
		Content:        ui.View(a.settingsView),
		Width:          660,
		Height:         800,
		MinWidth:       560,
		MinHeight:      480,
		TitleBarStyle:  mygo.TitleBarHidden,
		TitleBarHeight: 30,
		StateKey:       "settings",
	})
}

// resetSettings starts the settings form from the saved settings.
func (a *App) resetSettings() {
	cur := a.Settings.Get()
	a.set = settingsState{draft: cur, base: cur, loaded: true}
}

// item kinds of a provider's settings.
const (
	itemText = iota
	itemSecret
	itemModel  // the model select
	itemCustom // the custom model name, shown when the model is custom
	itemCheck
)

// item is one setting of a provider, as the Tauri form lays it out.
type item struct {
	kind     int
	label    string
	value    *string
	check    *bool
	required bool
	cap      *caption
	hint     string // placeholder
}

func goTo(link, url, after string) *caption { return linked(T("Go to the"), link, url, T(after)) }

// providerItems lists what a provider needs, in the Tauri app's order.
func providerItems(s *settings.Settings, p string) []item {
	const keyCap = "to get your API Key."
	const keysCap = "to get your API Key. You can separate multiple API Keys with English commas to achieve quota doubling and load balancing."
	noNeed := plain(T("Generally, there is no need to modify this item."))
	key := func(label string, v *string, cap *caption) item {
		return item{kind: itemSecret, label: label, value: v, required: true, cap: cap}
	}
	model := func(v *string) item { return item{kind: itemModel, label: T("API Model"), value: v, required: true} }
	custom := func(v *string) item {
		return item{kind: itemCustom, label: T("Custom Model Name"), value: v, required: true}
	}
	url := func(v *string, cap *caption, hint string) item {
		return item{kind: itemText, label: T("API URL"), value: v, required: true, cap: cap, hint: hint}
	}
	path := func(v *string, cap *caption) item {
		return item{kind: itemText, label: T("API URL Path"), value: v, required: true, cap: cap}
	}
	tutorial := func(doc, after string) *caption {
		u := "https://github.com/nextai-translator/nextai-translator/blob/main/docs/" + doc
		if strings.Contains(strings.ToLower(s.I18n), "zh") {
			u += "-cn"
		}
		return goTo("Tutorial", u+".md", after)
	}
	switch p {
	case engine.OpenAI:
		return []item{
			key(T("API Key"), &s.APIKeys, goTo(T("OpenAI page"), "https://platform.openai.com/account/api-keys", keysCap)),
			{kind: itemCheck, label: T("No models API support"), check: &s.NoModelsAPISupport,
				cap: plain(T("Some providers claiming to be compatible with OpenAI's API do not actually support OpenAI's standard model API. Therefore, we have no choice but to offer this option. If you choose this option (and then need to click the save button), we will not attempt to dynamically fetch the latest model list from the model API, but will only use a fixed model list and custom models."))},
			model(&s.APIModel), custom(&s.CustomModelName),
			url(&s.APIURL, nil, "https://api.openai.com"), path(&s.APIURLPath, nil),
		}
	case engine.Azure:
		return []item{
			key(T("API Key"), &s.AzureAPIKeys, goTo(T("Azure OpenAI Service page"), "https://learn.microsoft.com/en-us/azure/cognitive-services/openai/chatgpt-quickstart?tabs=command-line&pivots=rest-api#retrieve-key-and-endpoint", keysCap)),
			model(&s.AzureAPIModel), url(&s.AzureAPIURL, nil, ""), path(&s.AzureAPIURLPath, nil),
		}
	case engine.MiniMax:
		return []item{
			{kind: itemText, label: "MiniMax Group ID", value: &s.MiniMaxGroupID, required: true,
				cap: goTo(T("MiniMax page"), "https://platform.minimaxi.com/user-center/basic-information/interface-key", "to get your Group ID.")},
			key("MiniMax API Key", &s.MiniMaxAPIKey, goTo(T("MiniMax page"), "https://platform.minimaxi.com/user-center/basic-information/interface-key", keyCap)),
			model(&s.MiniMaxAPIModel),
		}
	case engine.Gemini:
		return []item{
			url(&s.GeminiAPIURL, nil, ""),
			key("Gemini API Key", &s.GeminiAPIKey, goTo("Google AI Studio", "https://makersuite.google.com/app/apikey", keyCap)),
			model(&s.GeminiAPIModel),
		}
	case engine.Moonshot:
		return []item{key("Moonshot API Key", &s.MoonshotAPIKey, goTo("Moonshot Page", "https://www.moonshot.cn/", keyCap)), model(&s.MoonshotAPIModel)}
	case engine.DeepSeek:
		return []item{key("DeepSeek API Key", &s.DeepSeekAPIKey, goTo("DeepSeek Dashboard", "https://platform.deepseek.com/api_keys", keyCap)), model(&s.DeepSeekAPIModel)}
	case engine.Ollama:
		return []item{
			url(&s.OllamaAPIURL, noNeed, ""),
			{kind: itemText, label: T("The survival time of the Ollama model in memory"), value: &s.OllamaModelLifetimeInMemory, required: true},
			{kind: itemModel, label: T("API Model"), value: &s.OllamaAPIModel, required: true,
				cap: linked(T("Model needs to first use the `ollama pull` command to download locally, please view all models from this page:"), "Models", "https://ollama.com/library", "")},
			custom(&s.OllamaCustomModelName),
		}
	case engine.Groq:
		return []item{
			key("Groq API Key", &s.GroqAPIKey, goTo("GroqCloud", "https://console.groq.com/keys", keyCap)),
			model(&s.GroqAPIModel), custom(&s.GroqCustomModelName),
			url(&s.GroqAPIURL, noNeed, ""), path(&s.GroqAPIURLPath, noNeed),
		}
	case engine.Claude:
		items := []item{
			key("Claude API Key", &s.ClaudeAPIKey, goTo("Anthropic Console", "https://console.anthropic.com/settings/keys", keyCap)),
			model(&s.ClaudeAPIModel), custom(&s.ClaudeCustomModelName),
			{kind: itemCheck, label: T("Enable Extended Thinking"), check: &s.ClaudeThinking},
		}
		if s.ClaudeThinking {
			items = append(items, item{kind: itemModel, label: T("Thinking Level"), value: &s.ClaudeThinkingLevel})
		}
		return append(items, url(&s.ClaudeAPIURL, noNeed, ""), path(&s.ClaudeAPIURLPath, noNeed))
	case engine.Cohere:
		return []item{key("Cohere API Key", &s.CohereAPIKey, goTo("Cohere Dashboard", "https://dashboard.cohere.com/api-keys", keyCap)), model(&s.CohereAPIModel)}
	case engine.Cerebras:
		return []item{key("Cerebras API Key", &s.CerebrasAPIKey, goTo("Cerebras Page", "https://cloud.cerebras.ai/", keyCap)), model(&s.CerebrasAPIModel)}
	case engine.TeamoRouter:
		return []item{key("TeamoRouter API Key", &s.TeamoRouterAPIKey, goTo("TeamoRouter Page", "https://teamorouter.com/?utm_source=nextai_translator&utm_medium=referral&utm_campaign=ai_directory", keyCap)), model(&s.TeamoRouterAPIModel)}
	case engine.OpenRouter:
		return []item{key("OpenRouter API Key", &s.OpenRouterAPIKey, goTo("OpenRouter Page", "https://openrouter.ai/settings/keys", keyCap)), model(&s.OpenRouterAPIModel)}
	case engine.LiteLLM:
		k := key("LiteLLM API Key", &s.LiteLLMAPIKey, nil)
		k.required = false
		return []item{url(&s.LiteLLMAPIURL, nil, ""), k, model(&s.LiteLLMAPIModel)}
	case engine.Kimi:
		return []item{
			key("Kimi Refresh Token", &s.KimiRefreshToken, tutorial("kimi", "to get your refresh_token.")),
			key("Kimi Access Token", &s.KimiAccessToken, tutorial("kimi", "to get your access_token.")),
		}
	case engine.ChatGLM:
		return []item{
			key(T("ChatGLM")+" Refresh Token", &s.ChatGLMRefreshToken, tutorial("chatglm", "to get your refresh_token.")),
			key(T("ChatGLM")+" Token", &s.ChatGLMAccessToken, tutorial("chatglm", "to get your token.")),
		}
	case engine.ChatGPT:
		return []item{key("Access Token", &s.ChatGPTAccessToken, nil), model(&s.ChatGPTModel)}
	}
	return nil
}

// keepRenewedTokens keeps the tokens an engine renewed while the settings
// were open, unless the user typed new ones: the old refresh token would no
// longer work.
func keepRenewedTokens(draft *settings.Settings, base, cur settings.Settings) {
	for _, f := range []func(*settings.Settings) *string{
		func(s *settings.Settings) *string { return &s.KimiAccessToken },
		func(s *settings.Settings) *string { return &s.KimiRefreshToken },
		func(s *settings.Settings) *string { return &s.ChatGLMAccessToken },
		func(s *settings.Settings) *string { return &s.ChatGLMRefreshToken },
	} {
		if *f(draft) == *f(&base) {
			*f(draft) = *f(&cur)
		}
	}
}

//go:embed assets/beams.jpg
var beamsJPG []byte

//go:embed assets/wechat.jpg
var wechatJPG []byte

//go:embed assets/alipay.jpg
var alipayJPG []byte

func mustBitmap(data []byte) *ui.Bitmap {
	b, err := ui.DecodeBitmap(data)
	if err != nil {
		panic(err)
	}
	return b
}

var (
	beams  = mustBitmap(beamsJPG)
	wechat = mustBitmap(wechatJPG)
	alipay = mustBitmap(alipayJPG)
)

func appVersion() string {
	if v := mygo.App.Version(); v != "" {
		return v
	}
	return "0.1.0"
}

// The settings window is the Tauri one: a header over the beams with the
// tabs, the form, and a translucent bar with Save over the bottom.
func (a *App) settingsView(c *ui.Context) {
	p := pal(c)
	d := &a.set.draft
	if c.Shortcut(ui.Cmd, ui.KeyS) {
		a.saveSettings()
	}
	w, _ := c.Size()
	ui.Column(c).Fill().Background(p.bg).TextColor(p.text).Children(func() {
		a.settingsNav(c, p, w)
		ui.Scroll(c.Key("settings-body")).Grow(1).Children(func() {
			ui.Column(c).Padding(27.6, 25, 62, 25).Children(func() {
				switch a.set.tab {
				case 0:
					a.generalSettings(c, p, d)
				case 1:
					a.proxySettings(c, p, d)
				case 2:
					a.ttsSettings(c, p, d)
				case 3:
					a.writingSettings(c, p, d)
				case 4:
					a.hotkeySettings(c, p, d)
				}
			})
		})
		a.settingsFooter(c, p)
	})
	a.settingsPin(c, p)
	a.coffeeDialog(c, p)
}

func (a *App) settingsNav(c *ui.Context, p palette, w float32) {
	tabs := []struct {
		icon  *ui.SVG
		label string
	}{
		{riIoSettingsOutline, T("General")}, {riTbCloudNetwork, T("Proxy")}, {riRxSpeakerLoud, T("TTS")},
		{riPiTextbox, T("Writing")}, {riBsKeyboard, T("Shortcuts")},
	}
	ui.Column(c).Height(136.4).Clip().Children(func() {
		bw, bh := ui.ImageSize(beams)
		ui.Image(c, beams).Absolute().Top(0).Left((w-bw)/2).Size(bw, bh)
		ui.Row(c).ZIndex(1).Height(83.4).Padding(15, 25, 0, 25).Gap(10).AlignItems(ui.Center).DragWindow().Children(func() {
			ui.Image(c, logo).Size(22, 22)
			ui.Row(c).Gap(6).AlignItems(ui.Center).Children(func() {
				ui.Text(c, "NextAI Translator").FontSize(21).FontWeight(700).LetterSpacing(-.14).TextColor(ui.RGB(51, 51, 51)).SingleLine()
				ui.Link(c, appVersion(), "https://github.com/nextai-translator/nextai-translator/releases").
					FontSize(21).FontWeight(700).LetterSpacing(-.14).TextColor(ui.RGB(51, 51, 51)).Underline().Opacity(.8)
			})
			ui.Spacer(c)
			b := ui.Row(c.Key("coffee")).Height(28).Padding(6, 8).Radius(4).AlignItems(ui.Center).
				Background(p.secondaryBtn).Cursor(ui.CursorPointer)
			b.Children(func() {
				ui.Text(c, "❤️ "+T("Buy me a coffee")).FontSize(12).FontWeight(500).TextColor(p.text).SingleLine()
			})
			if b.Clicked() {
				a.set.coffee = true
			}
		})
		ui.Row(c).ZIndex(1).Height(48).Padding(0, 36).Children(func() {
			for i, t := range tabs {
				tab := ui.Row(c.Key(i)).Height(48).Basis(0).Grow(1).Gap(8).Center().Cursor(ui.CursorPointer).
					TextColor(ui.RGB(0, 0, 0)).Role(ui.RoleTab).AccessSelected(a.set.tab == i)
				if a.set.tab == i {
					tab.Background(ui.RGBA(255, 255, 255, .35))
				}
				tab.Children(func() {
					ui.Icon(c, t.icon).Size(14, 14)
					ui.Text(c, t.label).FontSize(14).FontWeight(500).SingleLine()
				})
				if tab.Clicked() {
					a.set.tab = i
				}
			}
		})
		bar, line := ui.RGB(226, 226, 226), ui.RGB(0, 0, 0)
		if p.dark {
			bar, line = ui.RGB(51, 51, 51), ui.RGB(226, 226, 226)
		}
		tabW := (w - 72) / float32(len(tabs))
		ui.Box(c).ZIndex(1).Height(5).Background(bar).Children(func() {
			ui.Box(c).Absolute().Top(0).Left(36+tabW*float32(a.set.tab)).Size(tabW, 5).Background(line)
		})
	})
}

func (a *App) settingsFooter(c *ui.Context, p palette) {
	bg := ui.RGBA(255, 255, 255, .65)
	if p.dark {
		bg = ui.RGBA(31, 31, 31, .65)
	}
	ui.Row(c).Absolute().Left(0).Right(0).Bottom(0).Height(42).Padding(0, 25).Gap(10).AlignItems(ui.Center).
		Background(bg).BorderWidth(1, 0, 0, 0).BorderColor(p.line).Children(func() {
		ui.Spacer(c)
		switch {
		case a.set.saveErr != "":
			ui.Text(c, a.set.saveErr).FontSize(12).TextColor(p.errText).SingleLine()
		case a.set.saved:
			ui.Text(c, T("Saved")).FontSize(12).TextColor(p.secondary)
		}
		b := ui.Row(c.Key("save")).Height(28).Padding(6, 8).Gap(12).Radius(4).AlignItems(ui.Center).
			Background(p.primaryBg).TextColor(p.primaryFg).Cursor(ui.CursorPointer).Role(ui.RoleButton).Label(T("Save"))
		b.Children(func() {
			ui.Icon(c, riIoIosSave).Size(12, 12)
			ui.Text(c, T("Save")).FontSize(12).FontWeight(500)
		})
		if b.Clicked() {
			a.saveSettings()
		}
	})
}

// settingsPin keeps the settings window above the others.
func (a *App) settingsPin(c *ui.Context, p palette) {
	label, icon := T("Pin"), iconUnpinned
	if a.set.pinned {
		label, icon = T("Unpin"), iconPinned
	}
	b := ui.Row(c.Key("pin")).Absolute().Top(0).Right(c.TitleBar().Right).Size(30, 30).Center().
		Cursor(ui.CursorPointer).Label(label).Tooltip(label).TextColor(ui.RGB(0, 0, 0)) // over the beams in both themes
	if !a.set.pinned && !b.Hovered() {
		b.Opacity(.5)
	}
	b.Children(func() { ui.Icon(c, icon).Size(14, 14) })
	if b.Clicked() {
		a.set.pinned = !a.set.pinned
		if a.settingsWin != nil {
			a.settingsWin.SetAlwaysOnTop(a.set.pinned)
		}
	}
}

func (a *App) coffeeDialog(c *ui.Context, p palette) {
	_, h := c.Size()
	ui.DialogBase(c.Key("coffee-dialog"), &a.set.coffee, func(backdrop, panel ui.Element) {
		backdrop.Background(ui.RGBA(0, 0, 0, .5))
		panel.Background(p.menu).Radius(8).Shadow(0, 4, 16, 0, ui.RGBA(0, 0, 0, .16)).TextColor(p.text)
		ui.Scroll(c.Key("coffee-body")).MaxHeight(max(h-80, 200)).Children(func() {
			ui.Column(c).Padding(24).Gap(10).AlignItems(ui.Center).Children(func() {
				ui.Text(c, "❤️ "+T("Buy me a coffee")).FontSize(20).FontWeight(600)
				ui.Text(c, T("If you find this tool helpful, you can buy me a cup of coffee.")).FontSize(14)
				for _, img := range []*ui.Bitmap{wechat, alipay} {
					iw, ih := ui.ImageSize(img)
					ui.Image(c, img).Size(330, 330*ih/iw)
				}
			})
		})
	})
}

func (a *App) saveSettings() {
	keepRenewedTokens(&a.set.draft, a.set.base, a.Settings.Get())
	if err := a.Settings.Save(a.set.draft); err != nil {
		a.set.saved, a.set.saveErr = false, err.Error()
		a.redraw()
		return
	}
	s := a.Settings.Get()
	a.set.draft, a.set.base = s, s
	ApplyAppearance(s)
	if a.OnSettingsSaved != nil {
		a.set.hotkeyErrs = a.OnSettingsSaved(s)
	}
	a.set.saved, a.set.saveErr = true, ""
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

func (a *App) generalSettings(c *ui.Context, p palette, d *settings.Settings) {
	codes, names := make([]string, len(i18n.Locales)), make([]string, len(i18n.Locales))
	for i, l := range i18n.Locales {
		codes[i], names[i] = l.Code, l.Name
	}
	formItem(c, p, T("i18n"), false, nil, func() { formSelect(c, p, "i18n", &d.I18n, codes, names, nil, false) })
	var provCap *caption
	if d.Provider == engine.Ollama {
		provCap = linked(T("Go to the"), "Ollama Homepage", "https://github.com/ollama/ollama#ollama", T("to learn how to install and setup."))
	}
	formItem(c, p, T("Default service provider"), true, provCap, func() {
		if formSelect(c, p, "provider", &d.Provider, engine.Providers, providerLabels(),
			func(v string) { providerIcon(c, p, v) }, false) {
			a.set.models, a.set.modelsErr = nil, ""
		}
	})
	a.providerSettings(c, p, d)
	formItem(c, p, T("Enable Thinking"), false,
		plain(T("Disable thinking for faster translations. Reasoning models think by default, which significantly slows down simple tasks.")),
		func() { formCheckbox(c, p, "thinking", &d.ThinkingEnabled) })
	modes := []string{"translate", "polishing", "summarize", "analyze", "explain-code"}
	formItem(c, p, T("Default Action"), false, nil, func() {
		formSelect(c, p, "mode", &d.DefaultTranslateMode, modes,
			[]string{T("Translate"), T("Polishing"), T("Summarize"), T("Analyze"), T("Explain Code")}, nil, false)
	})
	tc, tn := langOptions(lang.Targets(), "")
	formItem(c, p, T("Default target language"), false, nil, func() {
		formSelect(c, p, "target", &d.DefaultTargetLanguage, tc[1:], tn[1:], nil, false)
	})
	formItem(c, p, T("Language detection engine"), false, nil, func() {
		formSelect(c, p, "detect", &d.LanguageDetection, []string{"baidu", "google", "bing", "local"},
			[]string{"Baidu", "Google", "Bing", T("Local")}, nil, false)
	})
	formItem(c, p, T("Theme"), false, nil, func() {
		formSelect(c, p, "theme", &d.ThemeType, []string{"followTheSystem", "light", "dark"},
			[]string{T("Follow the System"), T("Light"), T("Dark")}, nil, false)
	})
	formItem(c, p, T("Font size"), false, plain(T("Controls the font size of the input box and the translation text.")), func() {
		formNumber(c, p, "font", &d.FontSize, 10, 32, &a.set.fontText)
	})
	formItem(c, p, T("Fixed Position"), false, nil, func() { formCheckbox(c, p, "fixed", &d.RestorePreviousPosition) })
	formItem(c, p, T("Run at startup"), false, nil, func() { formCheckbox(c, p, "startup", &d.RunAtStartup) })
	if mygoGOOS == "darwin" {
		formItem(c, p, T("Hide the icon in the Dock bar"), false, nil, func() { formCheckbox(c, p, "dock", &d.HideTheIconInTheDock) })
	}
	formItem(c, p, T("Auto hide window when out of focus"), false, nil, func() {
		formCheckbox(c, p, "autohide", &d.AutoHideWindowWhenOutOfFocus)
	})
	formItem(c, p, T("Automatic check for updates"), false, nil, func() {
		formCheckbox(c, p, "updates", &d.AutomaticCheckForUpdates)
	})
}

func (a *App) providerSettings(c *ui.Context, p palette, d *settings.Settings) {
	items := providerItems(d, d.Provider)
	var model *string
	for _, it := range items {
		if it.kind == itemModel && it.label == T("API Model") {
			model = it.value
		}
	}
	a.autoLoadModels(d, items)
	if a.set.reveal == nil {
		a.set.reveal = map[string]bool{}
	}
	for _, it := range items {
		key := d.Provider + it.label
		var cap = it.cap
		switch it.kind {
		case itemCustom:
			if model == nil || *model != settings.CustomModelID {
				continue
			}
		case itemModel:
			if it.label != T("API Model") {
				formItem(c, p, it.label, it.required, cap, func() {
					formSelect(c, p, key, it.value, []string{"low", "medium", "high"},
						[]string{T("Low"), T("Medium"), T("High")}, nil, false)
				})
				continue
			}
			if a.set.modelsErr != "" && a.set.modelsFor == d.Provider {
				cap = plain(a.set.modelsErr)
			}
		}
		formItem(c, p, it.label, it.required, cap, func() {
			switch it.kind {
			case itemText, itemCustom:
				formInput(c, p, key, it.value, false, nil, it.hint)
			case itemSecret:
				reveal := a.set.reveal[key]
				formInput(c, p, key, it.value, true, &reveal, "")
				a.set.reveal[key] = reveal
			case itemCheck:
				formCheckbox(c, p, key, it.check)
			case itemModel:
				a.modelSelect(c, p, key, d, it.value, hasCustom(items))
			}
		})
	}
}

func hasCustom(items []item) bool {
	for _, it := range items {
		if it.kind == itemCustom {
			return true
		}
	}
	return false
}

// modelSelect is the model select and its refresh button.
func (a *App) modelSelect(c *ui.Context, p palette, key string, d *settings.Settings, value *string, custom bool) {
	values := append([]string(nil), a.set.modelsList(d.Provider)...)
	if *value != "" && *value != settings.CustomModelID && !contains(values, *value) {
		values = append([]string{*value}, values...)
	}
	labels := append([]string(nil), values...)
	if custom {
		values, labels = append(values, settings.CustomModelID), append(labels, T("Custom"))
	}
	ui.Row(c).Gap(4).AlignItems(ui.Center).Children(func() {
		ui.Column(c).Grow(1).Children(func() {
			formSelect(c, p, key, value, values, labels, nil, true)
		})
		b := ui.Row(c.Key(key+"refresh")).Size(40, 36).Center().Radius(8).Background(p.control).
			Cursor(ui.CursorPointer).TextColor(p.text).Label(T("Refresh model list")).Tooltip(T("Refresh model list"))
		b.Children(func() {
			if a.set.loading {
				ui.Spinner(c).Size(14, 14)
			} else {
				ui.Icon(c, riIoRefreshSharp).Size(16, 16)
			}
		})
		if b.Clicked() && !a.set.loading {
			a.loadModels()
		}
	})
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

// autoLoadModels asks once for a provider's models when it has what it
// needs to answer: its keys.
func (a *App) autoLoadModels(d *settings.Settings, items []item) {
	if a.set.loading || a.set.modelsFor == d.Provider || a.set.autoLoaded[d.Provider] {
		return
	}
	if d.Provider == engine.OpenAI && d.NoModelsAPISupport {
		return
	}
	hasModel := false
	for _, it := range items {
		if it.kind == itemSecret && it.required && strings.TrimSpace(*it.value) == "" {
			return
		}
		hasModel = hasModel || it.kind == itemModel
	}
	if !hasModel {
		return
	}
	if a.set.autoLoaded == nil {
		a.set.autoLoaded = map[string]bool{}
	}
	a.set.autoLoaded[d.Provider] = true
	a.loadModels()
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

func (a *App) hotkeySettings(c *ui.Context, p palette, d *settings.Settings) {
	a.hotkeyItem(c, p, T("Hotkey"), "hotkey", &d.Hotkey, "")
	a.hotkeyItem(c, p, T("Display window Hotkey"), "displayWindowHotkey", &d.DisplayWindowHotkey, "")
	if mygoGOOS != "linux" {
		a.hotkeyItem(c, p, T("OCR Hotkey"), "ocrHotkey", &d.OCRHotkey, "")
	}
	a.hotkeyItem(c, p, T("Quick Translator Hotkey"), "quickTranslatorHotkey", &d.QuickTranslatorHotkey,
		T("Open a non-activating panel that auto-detects the word or sentence you are reading."))
}

// hotkeyItem is a form item with the hotkey recorder, its hint, an
// optional caption, and the error registering it gave.
func (a *App) hotkeyItem(c *ui.Context, p palette, label, name string, v *string, caption string) {
	ui.Column(c.Key(name)).Margin(0, 0, 16, 0).Children(func() {
		ui.Row(c).Height(24.4).AlignItems(ui.Center).Children(func() {
			ui.Text(c, label).FontSize(16.8).FontWeight(600).TextColor(p.text).SingleLine()
		})
		recording := false
		ui.Column(c).Margin(8, 0, 0, 0).Children(func() { recording = hotkeyRecorder(c, p, name, v) })
		hint := T("Click above to set hotkeys.")
		if recording {
			hint = T("Please press the hotkey you want to set.")
		}
		ui.Text(c, hint).Margin(4, 0, 0, 0).FontSize(11).TextColor(p.tertiary)
		if caption != "" {
			captionText(c, p, plain(caption), 8)
		}
		if err := a.set.hotkeyErrs[name]; err != nil {
			ui.Text(c, err.Error()).FontSize(12).LineHeight(20.0 / 12).TextColor(p.errText).Wrap()
		}
	})
}

func (a *App) proxySettings(c *ui.Context, p palette, d *settings.Settings) {
	if a.set.reveal == nil {
		a.set.reveal = map[string]bool{}
	}
	formItem(c, p, T("Enabled"), false, nil, func() { formCheckbox(c, p, "proxy-on", &d.Proxy.Enabled) })
	formItem(c, p, T("Protocol"), false, nil, func() {
		formSelect(c, p, "proto", &d.Proxy.Protocol, []string{"HTTP", "HTTPS"}, []string{"HTTP", "HTTPS"}, nil, false)
	})
	formItem(c, p, T("Server"), false, nil, func() { formInput(c, p, "server", &d.Proxy.Server, false, nil, "") })
	formItem(c, p, T("Port"), false, nil, func() { formPort(c, p, "port", &d.Proxy.Port) })
	formItem(c, p, T("Username"), false, nil, func() {
		formInput(c, p, "user", &d.Proxy.BasicAuth.Username, false, nil, "")
	})
	formItem(c, p, T("Password"), false, nil, func() {
		reveal := a.set.reveal["proxy-pass"]
		formInput(c, p, "pass", &d.Proxy.BasicAuth.Password, true, &reveal, "")
		a.set.reveal["proxy-pass"] = reveal
	})
	formItem(c, p, T("No proxy"), false, nil, func() { formTextArea(c, p, "noproxy", &d.Proxy.NoProxy) })
}
