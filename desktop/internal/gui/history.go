package gui

import (
	"strconv"
	"strings"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/lang"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
)

// The history window, drawn as the Tauri one: a fixed header with the
// title and the filters over a page of cards, each with its meta line, its
// buttons and the two texts, and Close and Clear history at the end.

type historyState struct {
	query     string
	action    string // the action ID to filter by; "" for all
	favorites bool
	confirm   bool // the clear confirmation is open
	pinned    bool
}

// OpenHistory shows the history window.
func (a *App) OpenHistory() {
	if a.historyWin != nil && !a.historyWin.IsDestroyed() {
		a.historyWin.Show()
		a.historyWin.Focus()
		return
	}
	a.historyWin = mygo.NewWindow(mygo.WindowOptions{
		Title:          T("History"),
		Content:        ui.View(a.historyView),
		Width:          760,
		Height:         720,
		MinWidth:       660,
		MinHeight:      600,
		TitleBarStyle:  mygo.TitleBarHidden,
		TitleBarHeight: 30,
		StateKey:       "history",
	})
}

func (a *App) historyView(c *ui.Context) {
	p := pal(c)
	acts := a.Store.Actions()
	q := store.HistoryQuery{Search: a.hist.query, FavoritesOnly: a.hist.favorites, Limit: 200}
	for _, act := range acts {
		if strconv.FormatInt(act.ID, 10) == a.hist.action {
			q.ActionID, q.ActionMode = act.ID, act.Mode
		}
	}
	items := a.Store.History(q)
	_, h := c.Size()
	ui.Column(c).Fill().Background(p.bg).TextColor(p.text).Children(func() {
		ui.Scroll(c.Key("history")).Grow(1).Children(func() {
			ui.Column(c).MinHeight(h).Padding(170, 32, 32, 32).Gap(16).Children(func() {
				ui.Column(c).Grow(1).Padding(0, 4, 0, 0).Gap(12).Children(func() {
					if len(items) == 0 {
						ui.Text(c, T("No History Yet")).Padding(48, 0).FontSize(14).LineHeight(1.6).LetterSpacing(-.14).
							TextColor(p.secondary).Opacity(.6).AlignSelf(ui.Stretch).TextAlign(ui.Center)
					}
					for _, it := range items {
						a.historyCard(c, p, acts, it)
					}
				})
				a.historyFooter(c, p, len(items) > 0)
			})
		})
	})
	a.historyHeader(c, p, len(items), acts)
	windowPin(c, p, &a.hist.pinned, a.historyWin)
	modal(c, p, "clear-history", &a.hist.confirm, T("Clear History"), func() {
		ui.Text(c, T("Clear All History?")).Margin(0, 0, 12, 0).FontSize(14).LineHeight(20.0 / 14).
			TextColor(p.secondary).Wrap()
		ui.Row(c).Gap(12).Children(func() {
			ui.Spacer(c)
			if textButton(c, p, "cancel", T("Cancel"), false).Clicked() {
				a.hist.confirm = false
			}
			ok := ui.Row(c.Key("ok")).Height(36).Padding(10, 12).Radius(8).AlignItems(ui.Center).
				Background(p.primaryBg).TextColor(p.primaryFg).Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton)
			ok.Children(func() { ui.Text(c, T("Ok")).FontSize(14).FontWeight(500).SingleLine() })
			if ok.Clicked() {
				_ = a.Store.ClearHistory()
				a.hist.confirm = false
			}
		})
	})
}

func (a *App) historyHeader(c *ui.Context, p palette, n int, acts []store.Action) {
	bg, line := ui.RGBA(255, 255, 255, .94), ui.RGBA(0, 0, 0, .08)
	if p.dark {
		bg, line = ui.RGBA(20, 20, 20, .92), ui.RGBA(226, 226, 226, .08)
	}
	ui.Column(c).Absolute().Top(0).Left(0).Right(0).Padding(40, 32, 20, 32).Gap(14).
		Background(bg).BorderWidth(0, 0, 1, 0).BorderColor(line).DragWindow().Children(func() {
		ui.Column(c).Gap(4).Children(func() {
			title := T("History")
			if n > 0 {
				title += " (" + strconv.Itoa(n) + ")"
			}
			ui.Text(c, title).FontSize(18).FontWeight(600).LineHeight(1.6).LetterSpacing(-.14).SingleLine()
			ui.Text(c, T("Browse, search, and restore translation entries.")).FontSize(12).LineHeight(1.6).
				LetterSpacing(-.14).TextColor(p.secondary).SingleLine()
		})
		ui.Row(c).Height(36).Gap(12).AlignItems(ui.Center).Children(func() {
			historySearch(c, p, &a.hist.query)
			values, labels := []string{""}, []string{T("All Actions")}
			for _, act := range acts {
				name := act.Name
				if act.Mode != "" {
					name = T(act.Name)
				}
				values, labels = append(values, strconv.FormatInt(act.ID, 10)), append(labels, name)
			}
			ui.Box(c).Width(220).Children(func() {
				formSelectLook(c, p, "action", &a.hist.action, values, labels, nil, selectLook{height: 36, fontSize: 14})
			})
			historyCheckbox(c, p, &a.hist.favorites, T("Favorites Only"))
		})
	})
}

// historySearch is Base Web's compact clearable input.
func historySearch(c *ui.Context, p palette, value *string) {
	row := ui.Row(c.Key("search")).Grow(1).Basis(0).Height(36).Padding(0, 14, 0, 0).AlignItems(ui.Center)
	fieldBox(row, p, row.FocusWithin()).Children(func() {
		ui.TextInputBase(c.Key("in"), value).Grow(1).Padding(6, 14).FontSize(14).LineHeight(20.0 / 14).LetterSpacing(-.14).
			TextColor(p.text).Placeholder(T("Search History")).PlaceholderColor(p.tertiary).AutoFocus()
		if *value != "" {
			b := ui.Row(c.Key("clear")).Size(16, 16).Center().Cursor(ui.CursorPointer).Label(T("Clear")).TextColor(p.tertiary)
			b.Children(func() { ui.Icon(c, riIoCloseCircle).Size(16, 16) })
			if b.Clicked() {
				*value = ""
			}
		}
	})
}

// historyCheckbox is Base Web's check box with its 16px label.
func historyCheckbox(c *ui.Context, p palette, value *bool, label string) {
	boxBg := p.bg
	if p.dark {
		boxBg = ui.RGB(0, 0, 0)
	}
	ui.CheckboxBase(c.Key("favorites"), value).Height(24).AlignItems(ui.Start).Cursor(ui.CursorPointer).Children(func() {
		box := ui.Row(c).Size(20, 20).Margin(2).Center()
		if *value {
			box.Background(p.primaryBg).TextColor(p.primaryFg).Children(func() { ui.Icon(c, iconCheck).Size(14, 14) })
		} else {
			box.Border(3, p.tertiary).Background(boxBg)
		}
		ui.Text(c, label).Padding(0, 0, 0, 8).FontSize(16).FontWeight(500).LineHeight(1.5).LetterSpacing(-.14).SingleLine()
	})
}

func (a *App) historyCard(c *ui.Context, p palette, acts []store.Action, h store.HistoryItem) {
	bg, line := ui.RGBA(246, 246, 246, .9), ui.RGB(226, 226, 226)
	if p.dark {
		bg, line = ui.RGBA(23, 23, 23, .85), ui.RGB(51, 51, 51)
	}
	card := ui.Column(c.Key(h.ID)).Padding(14, 18).Gap(10).Radius(14).Border(1, line).Background(bg).
		Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton)
	if card.Hovered() {
		card.Translate(0, -1).Shadow(0, 4, 12, 0, ui.RGBA(0, 0, 0, .08))
	}
	card.Children(func() {
		ui.Row(c).Height(28).Gap(8).AlignItems(ui.Center).TextColor(p.secondary).Children(func() {
			meta := time.UnixMilli(h.UpdatedAt).Format("Jan 2, 2006 at 3:04 PM")
			if name := historyActionName(acts, h); name != "" {
				meta += " · " + name
			}
			ui.Text(c, meta).FontSize(12).LineHeight(1.6).LetterSpacing(-.14).SingleLine()
			ui.Spacer(c)
			ui.Row(c).Gap(8).AlignItems(ui.Center).Children(func() {
				star, tip := riLuStarOff, T("Add to favorites")
				if h.Favorite {
					star, tip = riLuStar, T("Remove from favorites")
				}
				if historyButton(c, p, "fav", star, tip, false).Clicked() {
					_ = a.Store.SetFavorite(h.ID, !h.Favorite)
				}
				if historyButton(c, p, "restore", riMdReplay, T("Restore"), true).Clicked() {
					a.loadHistory(h)
				}
				if historyButton(c, p, "copy", riRxCopy, T("Copy to clipboard"), false).Clicked() {
					c.WriteClipboardThen(h.TranslatedText, func(err error) {
						if err != nil {
							c.Toast(T("Copy failed"))
							return
						}
						c.Toast(T("Copy to clipboard"))
					})
				}
				if historyButton(c, p, "delete", riRxTrash, T("Delete"), false).Clicked() {
					_ = a.Store.DeleteHistory(h.ID)
				}
			})
		})
		historyText(c, p, T("Original Text"), h.Text)
		ui.Box(c).Height(1).Radius(1).Background(line).Opacity(.4)
		historyText(c, p, T("Translation"), h.TranslatedText)
	})
	if card.Clicked() {
		a.loadHistory(h)
	}
}

// historyActionName is the name of the action an entry was made with, as
// the action list shows it.
func historyActionName(acts []store.Action, h store.HistoryItem) string {
	for _, act := range acts {
		if act.ID == h.ActionID || h.ActionID == 0 && act.Mode != "" && act.Mode == h.ActionMode {
			if act.Mode != "" {
				return T(act.Name)
			}
			return act.Name
		}
	}
	return ""
}

func historyText(c *ui.Context, p palette, label, text string) {
	ui.Column(c).Gap(4).Children(func() {
		ui.Text(c, strings.ToUpper(label)).FontSize(10).FontWeight(600).LineHeight(1.6).LetterSpacing(1).
			TextColor(p.tertiary).Opacity(.7).SingleLine()
		ui.Text(c, text).FontSize(14).LineHeight(1.6).LetterSpacing(-.14).TextColor(p.text).Wrap()
	})
}

// historyButton is Base Web's mini icon button: tertiary, or secondary with
// its grey fill.
func historyButton(c *ui.Context, p palette, key string, icon *ui.SVG, tip string, secondary bool) ui.Element {
	b := ui.Row(c.Key(key)).Size(28, 28).Radius(4).Center().TextColor(p.text).Cursor(ui.CursorPointer).
		Focusable().Role(ui.RoleButton).Label(tip).Tooltip(tip)
	hover := p.secondaryBtn
	if secondary {
		b.Background(p.secondaryBtn)
		hover = ui.RGB(226, 226, 226)
		if p.dark {
			hover = ui.RGB(75, 75, 75)
		}
	}
	if b.Hovered() {
		b.Background(hover)
	}
	b.Children(func() { ui.Icon(c, icon).Size(16, 16) })
	return b
}

// textButton is Base Web's compact tertiary or secondary button.
func textButton(c *ui.Context, p palette, key, label string, secondary bool) ui.Element {
	b := ui.Row(c.Key(key)).Height(36).Padding(10, 12).Radius(8).AlignItems(ui.Center).TextColor(p.text).
		Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton)
	if secondary || b.Hovered() {
		b.Background(p.secondaryBtn)
	}
	b.Children(func() {
		ui.Text(c, label).FontSize(14).FontWeight(500).LineHeight(16.0 / 14).LetterSpacing(-.14).SingleLine()
	})
	return b
}

func (a *App) historyFooter(c *ui.Context, p palette, has bool) {
	bg, line := ui.RGBA(255, 255, 255, .94), ui.RGBA(0, 0, 0, .08)
	if p.dark {
		bg, line = ui.RGBA(20, 20, 20, .92), ui.RGBA(226, 226, 226, .08)
	}
	ui.Row(c).Padding(12, 0).Gap(8).AlignItems(ui.Center).Background(bg).BorderWidth(1, 0, 0, 0).BorderColor(line).
		Children(func() {
			ui.Spacer(c)
			if textButton(c, p, "close", T("Close"), false).Clicked() && a.historyWin != nil {
				a.historyWin.Close()
			}
			if !has {
				fg, fill := ui.RGB(175, 175, 175), ui.RGB(246, 246, 246)
				if p.dark {
					fg, fill = ui.RGB(84, 84, 84), ui.RGB(41, 41, 41)
				}
				ui.Row(c.Key("clear")).Height(36).Padding(10, 12).Radius(8).AlignItems(ui.Center).Background(fill).
					TextColor(fg).Cursor(ui.CursorNotAllowed).Children(func() {
					ui.Text(c, T("Clear History")).FontSize(14).FontWeight(500).LineHeight(16.0 / 14).LetterSpacing(-.14).SingleLine()
				})
				return
			}
			if textButton(c, p, "clear", T("Clear History"), true).Clicked() {
				a.hist.confirm = true
			}
		})
}

// windowPin is the pin at the top right of a window without a title bar,
// which keeps the window above the others.
func windowPin(c *ui.Context, p palette, pinned *bool, win *mygo.Window) {
	label, icon := T("Pin"), iconUnpinned
	if *pinned {
		label, icon = T("Unpin"), iconPinned
	}
	b := ui.Row(c.Key("pin")).Absolute().Top(0).Right(c.TitleBar().Right).Size(30, 30).Center().
		Cursor(ui.CursorPointer).Label(label).Tooltip(label).TextColor(p.secondary)
	if !*pinned && !b.Hovered() {
		b.Opacity(.5)
	}
	b.Children(func() { ui.Icon(c, icon).Size(14, 14) })
	if b.Clicked() {
		*pinned = !*pinned
		if win != nil {
			win.SetAlwaysOnTop(*pinned)
		}
	}
}

// loadHistory puts an entry back in the translator.
func (a *App) loadHistory(h store.HistoryItem) {
	a.Stop()
	a.tr.input, a.tr.output, a.tr.err = h.Text, h.TranslatedText, ""
	a.tr.detected, a.tr.done, a.tr.wordMode = h.SourceLang, true, h.WordMode
	if lang.Known(h.TargetLang) {
		a.tr.target = h.TargetLang
	}
	if act, ok := a.Store.Action(h.ActionID); ok {
		a.tr.actionID = act.ID
	} else if act, ok := a.Store.ActionByMode(h.ActionMode); ok {
		a.tr.actionID = act.ID
	}
	a.ShowTranslator(false)
}

var (
	riMdReplay = svg(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="currentColor" stroke-width="0"><path fill="none" d="M0 0h24v24H0z"></path><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"></path></svg>`)
	riRxTrash  = svg(`<svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="0"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H5H10H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H11V12C11 12.5523 10.5523 13 10 13H5C4.44772 13 4 12.5523 4 12V4L3.5 4C3.22386 4 3 3.77614 3 3.5ZM5 4H10V12H5V4Z" fill="currentColor"></path></svg>`)
)
