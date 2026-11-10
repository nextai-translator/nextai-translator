package gui

import (
	"strconv"
	"strings"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
)

// The action manager, drawn as the Tauri one: a list of the actions under
// a fixed header, each row showing its Update and Delete buttons on hover,
// and the action form in a modal.

type actionsState struct {
	draft    store.Action
	editing  int64 // the action draft was loaded from; -1 for a new one
	form     bool  // the action form is open
	picker   bool  // the form's icon picker is open
	deleting store.Action
	confirm  bool // the delete confirmation is open
	pinned   bool
	err      string
}

// actionDrag is an action being dragged to a new place in the list.
type actionDrag struct{ id int64 }

// OpenActions shows the action manager.
func (a *App) OpenActions() {
	if a.actionsWin != nil && !a.actionsWin.IsDestroyed() {
		a.actionsWin.Show()
		a.actionsWin.Focus()
		return
	}
	a.actionsWin = mygo.NewWindow(mygo.WindowOptions{
		Title:          T("Action Manager"),
		Content:        ui.View(a.actionsView),
		Width:          700,
		Height:         700,
		MinWidth:       660,
		MinHeight:      600,
		TitleBarStyle:  mygo.TitleBarHidden,
		TitleBarHeight: 30,
		StateKey:       "actions",
	})
}

// editAction opens the form on act, or on a new action when act is nil.
func (a *App) editAction(act *store.Action) {
	a.act.err, a.act.picker, a.act.form = "", false, true
	if act == nil {
		a.act.editing = -1
		a.act.draft = store.Action{Icon: "MdOutlineGrade", OutputRenderingFormat: "markdown"}
		return
	}
	a.act.editing, a.act.draft = act.ID, *act
}

func (a *App) actionsView(c *ui.Context) {
	p := pal(c)
	acts := a.Store.Actions()
	ui.Column(c).Fill().Background(p.bg).TextColor(p.text).Children(func() {
		ui.Scroll(c.Key("action-list")).Grow(1).Children(func() {
			ui.Column(c).Padding(124, 20, 34, 20).Children(func() {
				for i, act := range acts {
					a.actionRow(c, p, acts, i, act)
				}
			})
		})
	})
	a.actionsHeader(c, p)
	a.actionsPin(c, p)
	a.actionForm(c, p)
	a.deleteActionDialog(c, p)
}

func (a *App) actionsHeader(c *ui.Context, p palette) {
	bg := ui.RGBA(255, 255, 255, .65)
	if p.dark {
		bg = ui.RGBA(31, 31, 31, .65)
	}
	title := p.text
	if p.dark {
		title = p.secondary
	}
	ui.Row(c).Absolute().Top(0).Left(0).Right(0).Height(89).Padding(40, 24, 20, 24).Gap(12).
		AlignItems(ui.Start).Background(bg).BorderWidth(0, 0, 1, 0).BorderColor(p.line).DragWindow().Children(func() {
		ui.Row(c).Height(22.4).Margin(2.8, 0, 0, 0).Gap(8).AlignItems(ui.Center).Children(func() {
			ui.Image(c, logo).Size(16, 16)
			ui.Text(c, T("Action Manager")).FontSize(14).FontWeight(600).LineHeight(22.4 / 14).LetterSpacing(-.14).
				TextColor(title).SingleLine()
		})
		ui.Spacer(c)
		if miniButton(c, p, "create", nil, T("Create")).Clicked() {
			a.editAction(nil)
		}
	})
}

func (a *App) actionsPin(c *ui.Context, p palette) {
	windowPin(c, p, &a.act.pinned, a.actionsWin)
}

// miniButton is Base Web's mini primary button, with an optional 12px
// icon before its label.
func miniButton(c *ui.Context, p palette, key string, icon *ui.SVG, label string) ui.Element {
	b := ui.Row(c.Key(key)).Height(28).Padding(6, 8).Gap(12).Radius(4).AlignItems(ui.Center).
		Background(p.primaryBg).TextColor(p.primaryFg).Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton).Label(label)
	b.Children(func() {
		if icon != nil {
			ui.Icon(c, icon).Size(12, 12)
		}
		ui.Text(c, label).FontSize(12).FontWeight(500).LineHeight(16.0 / 12).SingleLine()
	})
	return b
}

// disabledMiniButton is a mini button that takes no clicks.
func disabledMiniButton(c *ui.Context, p palette, key string, icon *ui.SVG, label string) {
	bg, fg := ui.RGB(243, 243, 243), ui.RGB(166, 166, 166)
	if p.dark {
		bg, fg = ui.RGB(41, 41, 41), ui.RGB(84, 84, 84)
	}
	ui.Row(c.Key(key)).Height(28).Padding(6, 8).Gap(12).Radius(4).AlignItems(ui.Center).
		Background(bg).TextColor(fg).Cursor(ui.CursorNotAllowed).Label(label).Children(func() {
		ui.Icon(c, icon).Size(12, 12)
		ui.Text(c, label).FontSize(12).FontWeight(500).LineHeight(16.0 / 12).SingleLine()
	})
}

func (a *App) actionRow(c *ui.Context, p palette, acts []store.Action, i int, act store.Action) {
	row := ui.Row(c.Key(act.ID)).Padding(16).Border(2, ui.RGBA(0, 0, 0, 0)).AlignItems(ui.Center).
		Drag(actionDrag{act.ID})
	if d, ok := ui.Drop[actionDrag](row); ok && d.id != act.ID {
		_ = a.Store.MoveAction(d.id, i)
	}
	hot := row.Hovered() || row.FocusWithin()
	if hot {
		row.BorderColor(p.text)
	}
	if over, ok := ui.DragOver[actionDrag](row); ok && over.id != act.ID {
		row.BorderColor(p.tertiary)
	}
	row.Children(func() {
		ui.Icon(c, iconGrab).Size(24, 24).Margin(0, 16, 0, 0).TextColor(ui.RGB(204, 204, 204))
		ui.Row(c).Grow(1).Basis(0).Gap(20).AlignItems(ui.Center).Children(func() {
			ui.Column(c).Grow(1).Basis(0).Gap(2).Children(func() { a.actionContent(c, p, act) })
			if !hot {
				return
			}
			ui.Row(c).Gap(10).Children(func() {
				if miniButton(c, p, "update", iconFiEdit, T("Update")).Clicked() {
					a.editAction(&act)
				}
				if act.Builtin() {
					disabledMiniButton(c, p, "delete", iconRiDeleteBin, T("Delete"))
				} else if miniButton(c, p, "delete", iconRiDeleteBin, T("Delete")).Clicked() {
					a.act.deleting, a.act.confirm = act, true
				}
			})
		})
	})
}

func (a *App) actionContent(c *ui.Context, p palette, act store.Action) {
	ui.Row(c).Height(26).Gap(10).AlignItems(ui.Center).Children(func() {
		ui.Icon(c, actionIcon(act.Icon)).Size(16, 16)
		ui.Text(c, actionLabel(act)).FontSize(16).LineHeight(24.0 / 16).SingleLine()
		if act.Builtin() {
			ui.Row(c).Height(26).Padding(1, 4).Radius(2).Background(p.pill).Children(func() {
				ui.Text(c, T("built-in")).FontSize(12).LineHeight(2).SingleLine()
			})
		}
	})
	ui.Column(c).Gap(3).TextColor(p.secondary).Children(func() {
		for _, s := range []string{act.RolePrompt, act.CommandPrompt} {
			if s == "" {
				ui.Column(c)
				continue
			}
			ui.Text(c, s).FontSize(12).LineHeight(1.5).Wrap()
		}
	})
	if act.Provider != "" {
		label := act.Provider
		if act.APIModel != "" {
			label += " / " + act.APIModel
		}
		ui.Row(c).Margin(2, 0, 0, 0).Padding(1, 6).Radius(6).Background(p.pill).AlignSelf(ui.Start).Children(func() {
			ui.Text(c, label).FontSize(11).TextColor(p.secondary).SingleLine()
		})
	}
	ui.Text(c, T("Created at")+" "+formatStamp(act.CreatedAt)).FontSize(12).LineHeight(2).TextColor(p.secondary).SingleLine()
}

// formatStamp spells a stamp in milliseconds as the Tauri app does.
func formatStamp(ms string) string {
	n, err := strconv.ParseInt(ms, 10, 64)
	if err != nil {
		return ms
	}
	return time.UnixMilli(n).Format("2006-01-02 15:04:05")
}

// modal is Base Web's default modal: 500 wide, 16 from the window's edges
// at most, its content scrolling, with a close button at its corner.
func modal(c *ui.Context, p palette, key string, open *bool, title string, body func()) {
	_, h := c.Size()
	bg, closeCol := p.bg, p.text
	if p.dark {
		closeCol = p.tertiary
	}
	ui.DialogBase(c.Key(key), open, func(backdrop, panel ui.Element) {
		// The page scrolls under the backdrop, the card 16 from its top
		// and bottom, as the browser draws Base Web's modal.
		backdrop.Background(ui.RGBA(0, 0, 0, .5))
		panel.Width(532).Height(h).TextColor(p.text)
		ui.Scroll(c.Key("body")).Height(h).Children(func() {
			ui.Column(c).Margin(16).Background(bg).Radius(16).Children(func() {
				ui.Text(c, title).Margin(32, 32, 16, 24).FontSize(20).FontWeight(700).LineHeight(1.4).LetterSpacing(-.14).Wrap()
				ui.Column(c).Margin(0, 24, 20, 24).Children(body)
				b := ui.Row(c.Key("close")).Absolute().Top(12).Right(12).Size(24, 24).Center().
					Cursor(ui.CursorPointer).TextColor(closeCol).Label(T("Close"))
				b.Children(func() { ui.Icon(c, iconModalClose).Size(24, 24) })
				if b.Clicked() {
					*open = false
				}
			})
		})
	})
}

func (a *App) actionForm(c *ui.Context, p palette) {
	title := T("Create sth", T("Action"))
	if a.act.editing > 0 {
		title = T("Update sth", T("Action"))
	}
	key := "action-form" + itoa(a.act.editing)
	modal(c, p, key, &a.act.form, title, func() {
		d := &a.act.draft
		if !d.Builtin() {
			formItem(c, p, T("Name"), true, nil, func() { formInput(c, p, "name", &d.Name, false, nil, "") })
			formItem(c, p, T("Icon"), true, nil, func() { a.iconPicker(c, p, &d.Icon) })
			formItem(c, p, T("Role Prompt")+" (Optional)", false, nil, func() {
				formTextAreaHeight(c, p, "role", &d.RolePrompt, 96)
				promptCaption(c, p, []string{
					T("Role prompt indicates what role the action represents."),
					T("Role prompt example: You are a translator."),
				}, false)
			})
			formItem(c, p, T("Command Prompt"), true, nil, func() {
				formTextAreaHeight(c, p, "command", &d.CommandPrompt, 96)
				promptCaption(c, p, []string{
					T("Command prompt indicates what command should be issued to the role represented by the action when the action is executed."),
					T("Command prompt example: Please translate the following text from ${sourceLang} to ${targetLang}."),
				}, true)
			})
			formItem(c, p, T("Output rendering format"), false, nil, func() {
				formSelectLook(c, p, "format", &d.OutputRenderingFormat, []string{"text", "markdown", "latex"},
					[]string{"Text", "Markdown", "LaTeX"}, nil, selectLook{height: 48, fontSize: 16, clearable: true})
			})
		}
		formItem(c, p, T("Action Provider")+" (Optional)", false, nil, func() {
			formSelectLook(c, p, "provider", &d.Provider, engine.Providers, providerLabels(),
				func(v string) { providerIcon(c, p, v) }, selectLook{height: 36, fontSize: 16, placeholder: T("Select..."), clearable: true})
		})
		if d.Provider != "" {
			formItem(c, p, T("Action Model")+" (Optional)", false, nil, func() {
				formInput(c, p, "model", &d.APIModel, false, nil, "e.g. claude-sonnet-4-20250514")
			})
		}
		if a.act.err != "" {
			ui.Text(c, a.act.err).Margin(0, 0, 12, 0).FontSize(14).TextColor(p.errText).Wrap()
		}
		ui.Row(c).Children(func() {
			ui.Spacer(c)
			b := ui.Row(c.Key("submit")).Height(36).Padding(10, 12).Radius(8).AlignItems(ui.Center).
				Background(p.primaryBg).TextColor(p.primaryFg).Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton)
			b.Children(func() {
				ui.Text(c, T("Submit")).FontSize(14).FontWeight(500).LineHeight(16.0 / 14).SingleLine()
			})
			if b.Clicked() {
				a.saveAction()
			}
		})
	})
}

// promptCaption is the help under a prompt: its lines, then its
// placeholders, each in a square-bulleted list.
func promptCaption(c *ui.Context, p palette, lines []string, withText bool) {
	green := ui.RGB(3, 112, 60)
	if p.dark {
		green = ui.RGB(4, 136, 72)
	}
	holders := [][2]string{
		{"${sourceLang}", T("represents the source language")},
		{"${targetLang}", T("represents the target language")},
	}
	if withText {
		holders = append(holders, [2]string{"${text}", T("represents the original text, which is usually not needed inside the prompt because it is automatically injected")})
	}
	ui.Column(c).Margin(8, 0, 0, 0).TextColor(p.secondary).Children(func() {
		for _, l := range append(lines, T("Placeholders")+":") {
			// A word joiner keeps "${" together as the browser does.
			ui.Text(c, strings.ReplaceAll(l, "${", "$\u2060{")).FontSize(12).LineHeight(1.8).Wrap()
		}
		ui.Column(c).Margin(10, 0, 0, 0).Children(func() {
			for _, h := range holders {
				ui.Row(c).AlignItems(ui.Start).Children(func() {
					ui.Row(c).Width(20).Height(21.6).AlignItems(ui.Center).Children(func() {
						ui.Column(c).Margin(0, 0, 0, 5).Size(4.5, 4.5).Background(p.secondary)
					})
					ui.RichText(c).Grow(1).Basis(0).FontSize(12).LineHeight(1.8).Wrap().Children(func() {
						ui.Text(c, h[0]).TextColor(green)
						ui.Text(c, " "+h[1])
					})
				})
			}
		})
	})
}

// iconPicker is the form's icon: a mini button showing it, opening a grid
// of the icons to pick from.
func (a *App) iconPicker(c *ui.Context, p palette, value *string) {
	b := ui.Row(c.Key("icon")).Size(32, 28).Radius(4).Center().AlignSelf(ui.Start).
		Background(p.primaryBg).TextColor(p.primaryFg).Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton).Label(T("Icon"))
	b.Children(func() { ui.Icon(c, actionIcon(*value)).Size(16, 16) })
	if b.Clicked() {
		a.act.picker = !a.act.picker
	}
	if !a.act.picker {
		return
	}
	ui.Row(c).Padding(20, 5).Gap(4).Wrap().Children(func() {
		for _, name := range actionIconNames {
			ib := ui.Row(c.Key(name)).Size(32, 32).Radius(4).Center().Cursor(ui.CursorPointer).Label(name).Tooltip(name)
			if ib.Hovered() || name == *value {
				ib.Background(p.hover)
			}
			ib.Children(func() { ui.Icon(c, actionIcon(name)).Size(16, 16) })
			if ib.Clicked() {
				*value, a.act.picker = name, false
			}
		}
	})
}

func (a *App) deleteActionDialog(c *ui.Context, p palette) {
	modal(c, p, "delete-action", &a.act.confirm, T("Delete sth", T("Action")), func() {
		ui.Text(c, T("Are you sure to delete sth?", T("Action")+" "+a.act.deleting.Name)).
			Margin(0, 0, 12, 0).FontSize(14).LineHeight(20.0 / 14).TextColor(p.secondary).Wrap()
		ui.Row(c).Gap(12).Children(func() {
			ui.Spacer(c)
			cancel := ui.Row(c.Key("cancel")).Height(36).Padding(10, 12).Radius(8).AlignItems(ui.Center).
				Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton)
			if cancel.Hovered() {
				cancel.Background(p.secondaryBtn)
			}
			cancel.Children(func() { ui.Text(c, T("Cancel")).FontSize(14).FontWeight(500).SingleLine() })
			if cancel.Clicked() {
				a.act.confirm = false
			}
			ok := ui.Row(c.Key("ok")).Height(36).Padding(10, 12).Radius(8).AlignItems(ui.Center).
				Background(p.primaryBg).TextColor(p.primaryFg).Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton)
			ok.Children(func() { ui.Text(c, T("Ok")).FontSize(14).FontWeight(500).SingleLine() })
			if ok.Clicked() {
				_ = a.Store.DeleteAction(a.act.deleting.ID)
				a.act.confirm = false
			}
		})
	})
}

func (a *App) saveAction() {
	d := a.act.draft
	if !d.Builtin() && (strings.TrimSpace(d.Name) == "" || strings.TrimSpace(d.CommandPrompt) == "") {
		a.act.err = T("Name") + ", " + T("Command Prompt") + ": " + T("Required")
		return
	}
	var err error
	if a.act.editing < 0 {
		_, err = a.Store.CreateAction(d)
	} else {
		_, err = a.Store.UpdateAction(d)
	}
	if err != nil {
		a.act.err = err.Error()
		return
	}
	a.act.form, a.act.err = false, ""
}

var (
	// Base Web's Grab, the list's drag handle.
	iconGrab = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect fill="currentColor" x="4" y="8" width="16" height="2" rx="1"/><rect fill="currentColor" x="4" y="14" width="16" height="2" rx="1"/></svg>`)
	// The modal's close button.
	iconModalClose  = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M7 7l10 10M17 7 7 17"/></svg>`)
	iconFiEdit      = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`)
	iconRiDeleteBin = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M17 6h5v2h-2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8H2V6h5V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3Zm1 2H6v12h12V8Zm-9 3h2v6H9v-6Zm4 0h2v6h-2v-6ZM9 4v2h6V4H9Z"/></svg>`)
)
