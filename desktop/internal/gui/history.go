package gui

import (
	"time"

	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/lang"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
)

type historyState struct {
	query     string
	favorites bool
	list      ui.ListState
	confirm   bool
}

// OpenHistory shows the history window.
func (a *App) OpenHistory() {
	a.openWindow(&a.historyWin, T("History"), a.historyView, 640, 640, "history")
}

func (a *App) historyView(c *ui.Context) {
	th := c.Theme()
	items := a.Store.History(store.HistoryQuery{Search: a.hist.query, FavoritesOnly: a.hist.favorites})
	ui.Column(c).Fill().Children(func() {
		ui.Row(c).Padding(12, 16).Gap(8).AlignItems(ui.Center).Children(func() {
			ui.Box(c).Grow(1).Children(func() { ui.SearchField(c, &a.hist.query) })
			ui.Checkbox(c, &a.hist.favorites, T("Favorites"))
			if iconButton(c, iconTrash, T("Clear history")).Clicked() {
				a.hist.confirm = true
			}
		})
		ui.Divider(c)
		if len(items) == 0 {
			ui.Column(c).Grow(1).AlignItems(ui.Center).Justify(ui.Center).Children(func() {
				ui.Text(c, T("No history")).TextColor(th.TextMuted)
			})
		} else {
			ui.List(c.Key("history"), &a.hist.list, len(items), func(i int) {
				a.historyRow(c, items[i])
			}).Grow(1).ItemKey(func(i int) any { return items[i].ID })
		}
	})
	if ui.AlertDialog(c, &a.hist.confirm, T("Clear history"), T("Are you sure to clear the history?"), T("Cancel"), T("Clear history")) == 1 {
		_ = a.Store.ClearHistory()
	}
}

func (a *App) historyRow(c *ui.Context, h store.HistoryItem) {
	th := c.Theme()
	row := ui.Column(c).Padding(10, 16).Gap(4)
	row.Children(func() {
		ui.Row(c).Gap(6).AlignItems(ui.Center).Children(func() {
			meta := h.ActionName
			if h.SourceLang != "" || h.TargetLang != "" {
				meta += " · " + lang.Get(h.SourceLang).Name + " → " + lang.Get(h.TargetLang).Name
			}
			ui.Text(c, meta).TextColor(th.TextMuted).FontSize(th.FontSize - 1).SingleLine()
			ui.Spacer(c)
			ui.Text(c, time.UnixMilli(h.UpdatedAt).Format("2006-01-02 15:04")).TextColor(th.TextMuted).FontSize(th.FontSize - 1)
			star := iconButton(c, iconStar, T("Favorite"))
			if h.Favorite {
				star = iconButton(c.Key("fav"), iconStarFull, T("Unfavorite")).TextColor(th.Warning)
			}
			if star.Clicked() {
				_ = a.Store.SetFavorite(h.ID, !h.Favorite)
			}
			if iconButton(c, iconTrash, T("Delete")).Clicked() {
				_ = a.Store.DeleteHistory(h.ID)
			}
		})
		open := ui.ButtonBase(c).Justify(ui.Start).Children(func() {
			ui.Column(c).Gap(2).Children(func() {
				ui.Text(c, h.Text).MaxLines(2).Ellipsis("…")
				ui.Text(c, h.TranslatedText).TextColor(th.TextMuted).MaxLines(3).Ellipsis("…")
			})
		})
		if open.Clicked() {
			a.loadHistory(h)
		}
	})
	ui.Divider(c)
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
