package gui

import (
	"github.com/egoist/mygo/ui"
	"github.com/egoist/mygo/ui/markdown"
	"github.com/nextai-translator/nextai-translator/desktop/internal/i18n"
	"github.com/nextai-translator/nextai-translator/desktop/internal/lang"
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

func (a *App) translatorView(c *ui.Context) {
	th := c.Theme()
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
	ui.Column(c).Fill().Padding(14).Gap(10).Children(func() {
		a.actionBar(c)
		ui.Row(c).Gap(6).AlignItems(ui.Center).Children(func() {
			auto := T("Auto")
			if a.tr.source == "" && a.tr.detected != "" {
				auto = T("Auto") + " · " + lang.Get(a.tr.detected).Name
			}
			codes, names := langOptions(lang.Sources(), auto)
			ui.Box(c).Grow(1).Children(func() {
				if a.ch.choose(c, "source", &a.tr.source, codes, names) {
					a.retranslate()
				}
			})
			if iconButton(c, iconSwap, T("Swap")).Disabled(a.tr.source == "" && a.tr.detected == "").Clicked() {
				a.swap()
			}
			codes, names = langOptions(lang.Targets(), T("Auto"))
			ui.Box(c).Grow(1).Children(func() {
				if a.ch.choose(c, "target", &a.tr.target, codes, names) {
					a.retranslate()
				}
			})
		})
		ui.TextArea(c.Key("input"), &a.tr.input).Lines(3, 10).AutoFocus().
			Placeholder(T("Please enter the text you want to translate here.")).
			FontSize(float32(s.FontSize)).
			OnTextKey(func(k ui.TextKey) bool {
				if k.Key == ui.KeyEnter && (k.Mods == 0 || k.Mods == ui.Cmd) {
					a.tr.input = k.Text()
					a.Translate()
					return true
				}
				return false
			})
		ui.Row(c).Gap(8).AlignItems(ui.Center).Children(func() {
			if a.tr.running {
				ui.Spinner(c)
				if ui.Button(c, "").Label(T("Stop")).Children(func() {
					ui.Icon(c, iconStop)
					ui.Text(c, T("Stop")).SingleLine()
				}).Clicked() {
					a.Stop()
				}
			} else if ui.PrimaryButton(c, T("Submit")).Disabled(a.tr.input == "").Clicked() {
				a.Translate()
			}
			ui.Spacer(c)
			if a.tr.output != "" && !a.tr.running {
				label := T("Copy to clipboard")
				if a.tr.copied {
					label = T("Copied to clipboard")
				}
				if iconButton(c, iconCopy, label).Clicked() {
					c.WriteClipboardThen(a.tr.output, func(err error) { a.tr.copied = err == nil })
				}
				if iconButton(c, iconRetry, T("Retry")).Clicked() {
					a.Translate()
				}
			}
		})
		ui.Scroll(c.Key("output")).Grow(1).Children(func() {
			ui.Column(c).Gap(8).Children(func() {
				if a.tr.err != "" {
					ui.Text(c, a.tr.err).TextColor(th.Danger).Selectable().Wrap()
				}
				if a.tr.output == "" {
					return
				}
				box := ui.Box(c).FontSize(float32(s.FontSize)).Selectable()
				box.Children(func() {
					if a.tr.running {
						markdown.Stream(c, a.tr.output, nil)
					} else {
						markdown.View(c, a.tr.output, nil)
					}
				})
			})
		})
		a.footer(c)
	})
}

// actionBar picks the action: a segmented control while they fit, else a
// select.
func (a *App) actionBar(c *ui.Context) {
	acts := a.Store.Actions()
	cur := a.currentAction()
	if len(acts) <= 5 {
		idx := 0
		labels := make([]string, len(acts))
		for i, act := range acts {
			labels[i] = actionLabel(act)
			if act.ID == cur.ID {
				idx = i
			}
		}
		// The control writes its choice into a.tr.seg between frames.
		if a.tr.segFor != cur.ID {
			a.tr.seg, a.tr.segFor = idx, cur.ID
		}
		ui.Segmented(c.Key("actions"), &a.tr.seg, labels...)
		if a.tr.seg != idx && a.tr.seg >= 0 && a.tr.seg < len(acts) {
			a.tr.actionID = acts[a.tr.seg].ID
			a.tr.segFor = a.tr.actionID
			a.retranslate()
		}
		return
	}
	ids, labels := make([]string, len(acts)), make([]string, len(acts))
	for i, act := range acts {
		ids[i], labels[i] = itoa(act.ID), actionLabel(act)
	}
	id := itoa(cur.ID)
	if a.ch.choose(c, "action", &id, ids, labels) {
		a.tr.actionID = atoi(id)
		a.retranslate()
	}
}

func actionLabel(act store.Action) string {
	if act.Builtin() {
		return T(act.Name)
	}
	return act.Name
}

func (a *App) footer(c *ui.Context) {
	ui.Row(c).Gap(4).AlignItems(ui.Center).Children(func() {
		if iconButton(c, iconSettings, T("Settings")).Clicked() {
			a.OpenSettings()
		}
		if iconButton(c, iconActions, T("Action Manager")).Clicked() {
			a.OpenActions()
		}
		if iconButton(c, iconHistory, T("History")).Clicked() {
			a.OpenHistory()
		}
		ui.Spacer(c)
		pin := iconButton(c, iconPin, T("Pin"))
		if a.Pinned() {
			pin.TextColor(c.Theme().Accent).Label(T("Unpin")).Tooltip(T("Unpin"))
		}
		if pin.Clicked() {
			a.SetPinned(!a.Pinned())
		}
	})
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
