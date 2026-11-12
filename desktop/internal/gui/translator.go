package gui

import (
	"slices"
	"strings"

	"github.com/egoist/mygo/ui"
	"github.com/egoist/mygo/ui/markdown"
	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
	"github.com/nextai-translator/nextai-translator/desktop/internal/i18n"
	"github.com/nextai-translator/nextai-translator/desktop/internal/lang"
	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
)

var T = i18n.T

// langOptions are the codes and names of a language select, auto first.
func langOptions(cfgs []lang.Config, auto string) (codes, names []string) {
	codes, names = []string{""}, []string{auto}
	for _, l := range cfgs {
		codes = append(codes, l.Code)
		names = append(names, l.Name)
	}
	return codes, names
}

// The translator lays itself out as the Tauri window does (Translator.tsx):
// a header with the logo, the languages and the actions, the editor, the
// answer under a status pill, and a footer.
func (a *App) translatorView(c *ui.Context) {
	p := pal(c)
	s := a.Settings.Get()
	if c.Shortcut(ui.Cmd, ui.KeyComma) {
		a.OpenSettings()
	}
	if c.Shortcut(0, ui.KeyEscape) {
		if a.tr.running {
			a.Stop()
		} else if a.translator != nil {
			a.translator.Hide()
		}
	}
	w, _ := c.Size()
	ui.Column(c).Fill().Background(p.bg).TextColor(p.text).Children(func() {
		a.header(c, p, w)
		ui.Scroll(c.Key("body")).Grow(1).Children(func() {
			ui.Column(c).Children(func() {
				a.editor(c, p, s)
				if a.tr.running || a.tr.done || a.tr.err != "" {
					a.answer(c, p, s, w)
				}
			})
		})
		a.footer(c, p, s)
	})
	a.pinButton(c, p)
}

func (a *App) header(c *ui.Context, p palette, w float32) {
	acts := a.Store.Actions()
	cur := a.currentAction()
	// As many actions as the header has room for, the rest in the menu.
	n := int((w-32-131-284-10-105)/37) + 1
	n = min(max(n, 1), 7, len(acts))
	shown := append([]store.Action(nil), acts[:n]...)
	if !slices.ContainsFunc(shown, func(x store.Action) bool { return x.ID == cur.ID }) {
		shown[n-1] = cur
	}
	var hidden []store.Action
	for _, act := range acts {
		if !slices.ContainsFunc(shown, func(x store.Action) bool { return x.ID == act.ID }) {
			hidden = append(hidden, act)
		}
	}
	ui.Row(c).Padding(30, 16, 10, 16).AlignItems(ui.Center).Background(p.header).
		BorderWidth(0, 0, 1, 0).BorderColor(p.line).DragWindow().Children(func() {
		ui.Row(c).Gap(8).AlignItems(ui.Center).Children(func() {
			ui.Image(c, logo).Size(16, 16)
			ui.Text(c, "NextAI Translator").FontSize(12).FontWeight(600).LetterSpacing(.12).TextColor(p.body).SingleLine()
		})
		ui.Spacer(c)
		ui.Row(c).Padding(5, 10).Gap(10).AlignItems(ui.Center).Children(func() {
			auto := T("Auto")
			if a.tr.source == "" && a.tr.detected != "" {
				auto = lang.Get(a.tr.detected).Name
			}
			codes, names := langOptions(lang.Sources(), auto)
			if langSelect(c.Key("source"), p, &a.tr.source, codes, names) {
				a.retranslate()
			}
			swap := ghostButton(c, p, riTbArrowsExchange, T("Swap"), 24, 14, 8).TextColor(p.tertiary)
			if swap.Clicked() {
				a.swap()
			}
			codes, names = langOptions(lang.Targets(), T("Auto"))
			if langSelect(c.Key("target"), p, &a.tr.target, codes, names) {
				a.retranslate()
			}
		})
		ui.Row(c).Margin(0, 0, 0, 10).Gap(4).AlignItems(ui.Center).Children(func() {
			for _, act := range shown {
				if a.actionButton(c.Key(act.ID), p, act, act.ID == cur.ID).Clicked() && act.ID != cur.ID {
					a.tr.actionID = act.ID
					a.retranslate()
				}
			}
		})
		more := ghostButton(c, p, riGrMoreVertical, T("More"), 24, 14, 8).Margin(0, 0, 0, 5)
		if a.tr.menuOpen {
			more.Background(p.hover)
		}
		if more.Clicked() {
			a.tr.menuOpen = !a.tr.menuOpen
		}
		ui.PopoverBase(c, more, &a.tr.menuOpen, func(panel ui.Element) {
			panel.AttachTo(more, ui.AnchorBottomEnd, ui.AnchorTopEnd).Margin(14, 0, 0, 0).
				Background(p.menu).Radius(12).Padding(8, 0).MinWidth(150).
				Shadow(0, 4, 16, 0, ui.RGBA(0, 0, 0, .16)).Children(func() {
				item := func(icon *ui.SVG, label string, weight int) bool {
					it := ui.Row(c.Key(label)).Padding(10, 16).Gap(8).AlignItems(ui.Center).Cursor(ui.CursorPointer).TextColor(p.secondary)
					if it.Hovered() {
						it.Background(p.menuHover)
					}
					it.Children(func() {
						ui.Icon(c, icon).Size(13, 13)
						ui.Text(c, label).FontSize(14).FontWeight(weight).SingleLine()
					})
					return it.Clicked()
				}
				for _, act := range hidden {
					if item(actionIcon(act.Icon), actionLabel(act), 400) {
						a.tr.menuOpen = false
						a.tr.actionID = act.ID
						a.retranslate()
					}
				}
				if len(hidden) > 0 {
					ui.Box(c).Height(1).Margin(4, 12).Background(p.line)
				}
				if item(riGiPlatform, T("Action Manager"), 500) {
					a.tr.menuOpen = false
					a.OpenActions()
				}
			})
		})
	})
}

// actionButton shows an action: its icon and name while it is the one
// chosen, else only its icon.
func (a *App) actionButton(c *ui.Context, p palette, act store.Action, active bool) ui.Element {
	label := actionLabel(act)
	b := ui.Row(c).Height(27).Padding(6, 8).Gap(4).Radius(4).AlignItems(ui.Center).Cursor(ui.CursorPointer).Label(label)
	switch {
	case active:
		b.Background(p.primaryBg).TextColor(p.primaryFg)
		if b.Hovered() {
			b.Background(p.primaryBg.Mix(p.primaryFg, .2))
		}
	default:
		b.Background(p.secondaryBtn).TextColor(p.text).Tooltip(label)
		if b.Hovered() {
			b.Background(p.secondaryBtn.Mix(p.text, .05))
		}
	}
	b.Children(func() {
		ui.Icon(c, actionIcon(act.Icon)).Size(15, 15)
		if active {
			ui.Text(c, label).FontSize(12).FontWeight(500).SingleLine().MaxWidth(100)
		}
	})
	return b
}

// langSelect is the Tauri app's language select: 110 wide, its value and
// a caret on a gray field, opening a list of the languages.
func langSelect(c *ui.Context, p palette, value *string, codes, names []string) bool {
	name := names[0]
	for i, code := range codes {
		if code == *value {
			name = names[i]
		}
	}
	sel := ui.SelectBase(c, value)
	t := sel.Trigger.Row().Size(110, 32).Padding(0, 12).Gap(4).Radius(4).AlignItems(ui.Center).
		Background(p.control).Border(2, p.control).Cursor(ui.CursorPointer)
	if t.Focused() {
		t.BorderColor(p.focus)
	}
	t.Children(func() {
		ui.Text(c, name).FontSize(12).SingleLine().Grow(1)
		ui.Icon(c, iconCaret).Size(16, 16)
	})
	sel.Popup(func(panel ui.Element) {
		panel.Margin(1, 0, 0, 0).Background(p.menu).Radius(8).Clip().
			Shadow(0, 4, 16, 0, ui.RGBA(0, 0, 0, .16))
		ui.Scroll(c.Key("options")).MaxHeight(295).Width(110).Children(func() {
			ui.Column(c).Children(func() {
				for i, code := range codes {
					it := sel.Item(code).Padding(8, 16)
					col, weight := p.secondary, 400
					if code == *value {
						col, weight = p.text, 600
					}
					if it.Highlighted() || code == *value {
						it.Background(p.menuHover)
					}
					it.Children(func() {
						ui.Text(c, names[i]).FontSize(14).LineHeight(20.0 / 14).FontWeight(weight).TextColor(col).Wrap()
					})
				}
			})
		})
	})
	return t.Changed()
}

func (a *App) editor(c *ui.Context, p palette, s settings.Settings) {
	ui.Column(c).Padding(13, 18, 14, 18).Gap(4).Children(func() {
		ta := ui.TextAreaBase(c.Key("input"), &a.tr.input).AutoFocus().Label(T("Please enter the text you want to translate here.")).
			Height(212).Padding(4, 8).Radius(8).Border(2, p.control).TextColor(p.body).
			FontSize(float32(s.FontSize)).LineHeight(20.0 / float32(s.FontSize)).
			OnTextKey(func(k ui.TextKey) bool {
				if k.Key == ui.KeyEnter && (k.Mods == 0 || k.Mods == ui.Cmd) {
					a.tr.input = k.Text()
					a.Translate()
					return true
				}
				return false
			})
		// The words selected in the input, read aloud when the settings ask.
		selected := ""
		if i, j := ta.TextSelection(); i != j {
			r := []rune(a.tr.input)
			i, j = min(max(min(i, j), 0), len(r)), min(max(max(i, j), 0), len(r))
			selected = strings.TrimSpace(string(r[i:j]))
		}
		if !ta.Pressed() && selected != a.tr.selected {
			a.tr.selected = selected
			if selected != "" && s.ReadSelectedWordsFromInputElementsText {
				a.stopSpeaking()
				a.speak("input", selected, a.inputLang(), s)
			}
		}
		if ta.Focused() {
			ta.Background(p.input).BorderColor(p.focus)
		} else {
			ta.Background(p.control).BorderColor(p.control)
		}
		ui.Row(c).Height(27).Gap(4).AlignItems(ui.Center).TextColor(p.secondary).Children(func() {
			ui.Spacer(c)
			if a.tr.input == "" {
				return
			}
			if a.tr.running {
				if ghostButton(c, p, riRxStop, T("Stop"), 27, 15, 8).Clicked() {
					a.Stop()
				}
			} else if ghostButton(c, p, riRxReload, T("Retry"), 27, 15, 8).Clicked() {
				a.Translate()
			}
			spoken := a.tr.input
			if a.tr.selected != "" {
				spoken = a.tr.selected
			}
			a.speakerButton(c, p, "input", spoken, a.inputLang(), 15)
			if ghostButton(c.Key("copy-input"), p, riRxCopy, T("Copy to clipboard"), 27, 13, 8).Clicked() {
				c.WriteClipboardThen(a.tr.input, func(error) {})
			}
			if ghostButton(c, p, riRxEraser, T("Clear input"), 27, 15, 8).Clicked() {
				a.SetInput("", false)
			}
		})
	})
}

// actionWords are the pill's words while an action runs and once it is done.
var actionWords = map[string][2]string{
	store.ModeAnalyze:     {"Analyzing...", "Analyzed"},
	store.ModePolishing:   {"Polishing...", "Polished"},
	store.ModeTranslate:   {"Translating...", "Translated"},
	store.ModeSummarize:   {"Summarizing...", "Summarized"},
	store.ModeExplainCode: {"Explaining...", "Explained"},
}

func (a *App) status() (string, string) {
	act := a.currentAction()
	words, ok := actionWords[act.Mode]
	if !ok {
		words = actionWords[store.ModeTranslate]
	}
	switch {
	case a.tr.running:
		return T(words[0]), "✍️"
	case a.tr.err != "":
		return T("Error"), "😢"
	case a.tr.stopped:
		return T("Stopped"), "⏹️"
	}
	return T(words[1]), "👍"
}

func (a *App) answer(c *ui.Context, p palette, s settings.Settings, w float32) {
	ui.Column(c).Padding(16, 18, 18, 18).BorderWidth(1, 0, 0, 0).BorderColor(p.line).Children(func() {
		word, emoji := a.status()
		ui.Row(c).Absolute().Top(-12).Left(0).Width(w).Justify(ui.Center).Children(func() {
			ui.Row(c).Padding(4, 16).Gap(6).Radius(12).Background(p.pill).AlignItems(ui.Center).Children(func() {
				ui.Text(c, word).FontSize(10).FontWeight(500).LetterSpacing(.3).LineHeight(1.6).TextColor(p.secondary).SingleLine()
				ui.Text(c, emoji).FontSize(12).LineHeight(1).SingleLine()
			})
		})
		if a.tr.err != "" {
			ui.Row(c).Margin(7.5, 0).Padding(10, 14).Gap(8).Radius(10).Background(p.errBg).AlignItems(ui.Center).Children(func() {
				ui.Text(c, a.tr.err).FontSize(13).TextColor(p.errText).Selectable().Wrap().Grow(1)
				if ghostButton(c.Key("err-retry"), p, riRxReload, T("Retry"), 27, 15, 8).TextColor(p.errText).Clicked() {
					a.Translate()
				}
			})
		}
		if a.tr.output != "" {
			fs := float32(s.FontSize)
			th := markdown.DefaultTheme(c.Theme())
			// 24 DIP lines and half an em between paragraphs, as on the web.
			th.FontSize, th.LineHeight, th.BlockSpacing, th.Text = fs, 24/(fs*1.2), .5, p.body
			o := &markdown.Options{Theme: th}
			ui.Box(c).Padding(fs/2, 0).Selectable().Children(func() {
				if a.tr.running {
					markdown.Stream(c, a.tr.output, o)
				} else {
					markdown.View(c, a.tr.output, o)
				}
			})
		}
		if a.tr.output != "" && !a.tr.running {
			ui.Row(c).Margin(4, 0, 0, 0).Height(27).Gap(4).AlignItems(ui.Center).TextColor(p.secondary).Children(func() {
				ui.Spacer(c)
				if ghostButton(c.Key("out-retry"), p, riRxReload, T("Retry"), 27, 15, 8).Clicked() {
					a.Translate()
				}
				a.speakerButton(c, p, "output", a.tr.output, a.outputLang(s), 15)
				label := T("Copy to clipboard")
				if a.tr.copied {
					label = T("Copied to clipboard")
				}
				if ghostButton(c.Key("out-copy"), p, riRxCopy, label, 27, 13, 8).Clicked() {
					c.WriteClipboardThen(a.tr.output, func(err error) { a.tr.copied = err == nil })
				}
			})
		}
	})
}

func (a *App) footer(c *ui.Context, p palette, s settings.Settings) {
	ui.Row(c).Height(42).Padding(0, 14).Gap(10).AlignItems(ui.Center).Background(p.bg).
		BorderWidth(1, 0, 0, 0).BorderColor(p.line).Children(func() {
		if footerButton(c, p, riIoSettingsOutline, T("Settings")).Clicked() {
			a.OpenSettings()
		}
		provider, model := a.poweredBy(s)
		ui.Row(c).Gap(4).AlignItems(ui.Center).TextColor(p.faint).Children(func() {
			ui.Text(c, "Powered by").FontSize(8).SingleLine()
			ui.Row(c).Gap(2).AlignItems(ui.Center).Children(func() {
				if ic := poweredIcon(provider); ic != nil {
					ui.Icon(c, ic).Size(10, 10)
				}
				ui.Text(c, provider).FontSize(8).SingleLine()
			})
			if model != "" {
				ui.Text(c, model).FontSize(8).SingleLine()
			}
		})
		ui.Spacer(c)
		if footerButton(c, p, riMdHistory, T("History")).Clicked() {
			a.OpenHistory()
		}
	})
}

// footerButton is Base Web's mini tertiary button holding an icon.
func footerButton(c *ui.Context, p palette, icon *ui.SVG, label string) ui.Element {
	b := ui.Row(c.Key(label)).Size(31, 27).Center().Radius(8).Cursor(ui.CursorPointer).Label(label).Tooltip(label)
	if b.Hovered() {
		b.Background(p.hover)
	}
	b.Children(func() { ui.Icon(c, icon).Size(15, 15) })
	return b
}

// poweredBy names the provider and model the current action uses.
func (a *App) poweredBy(s settings.Settings) (string, string) {
	act := a.currentAction()
	provider := s.Provider
	if act.Provider != "" {
		provider = act.Provider
	}
	if provider == "" {
		provider = engine.OpenAI
	}
	model := act.APIModel
	if model == "" {
		if e, err := engine.New(provider, s, nil); err == nil {
			model = e.Model()
		}
	}
	return provider, model
}

func poweredIcon(provider string) *ui.SVG {
	switch provider {
	case engine.OpenAI, engine.ChatGPT, engine.Azure:
		return riRiOpenaiFill
	}
	return nil
}

// pinButton is the title bar's pin at the window's top right.
func (a *App) pinButton(c *ui.Context, p palette) {
	label, icon := T("Pin"), iconUnpinned
	if a.Pinned() {
		label, icon = T("Unpin"), iconPinned
	}
	b := ui.Row(c.Key("pin")).Absolute().Top(0).Right(c.TitleBar().Right).Size(30, 30).Center().Radius(8).
		Cursor(ui.CursorPointer).Label(label).Tooltip(label).TextColor(p.text)
	if !a.Pinned() && !b.Hovered() {
		b.Opacity(.5)
	}
	b.Children(func() { ui.Icon(c, icon).Size(14, 14) })
	if b.Clicked() {
		a.SetPinned(!a.Pinned())
	}
}

func actionLabel(act store.Action) string {
	if act.Builtin() {
		return T(act.Name)
	}
	return act.Name
}

// retranslate runs again after the action or a language changed, when
// there is something translated to replace.
func (a *App) retranslate() {
	if a.tr.done || a.tr.running {
		a.Translate()
	}
}

// swap exchanges the languages, and the text with its translation.
func (a *App) swap() {
	src := a.tr.source
	if src == "" {
		src = a.tr.detected
	}
	tgt := a.tr.target
	if tgt == "" {
		tgt = lang.PickAutoTarget(src, a.Settings.Get().DefaultTargetLanguage, a.Settings.Get().WritingTargetLanguage)
	}
	a.tr.source, a.tr.target = tgt, src
	if a.tr.output != "" && !a.tr.running && !a.tr.wordMode {
		a.tr.input = a.tr.output
		a.Translate()
	}
}

// outputLang is the language the translation is in.
func (a *App) outputLang(s settings.Settings) string {
	if a.tr.target != "" {
		return a.tr.target
	}
	if s.DefaultTargetLanguage != "" {
		return s.DefaultTargetLanguage
	}
	return "en"
}

// inputLang is the language of the input, as chosen or detected.
func (a *App) inputLang() string {
	if a.tr.source != "" {
		return a.tr.source
	}
	return a.tr.detected
}
