package gui

import (
	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
)

type actionsState struct {
	selected int64
	draft    store.Action
	editing  int64 // the action draft was loaded from; -1 for a new one
	confirm  bool
	err      string
}

// OpenActions shows the action manager.
func (a *App) OpenActions() {
	a.openWindow(&a.actionsWin, T("Action Manager"), a.actionsView, 760, 560, "actions")
}

func (a *App) selectAction(act store.Action) {
	a.act.selected, a.act.editing, a.act.draft, a.act.err = act.ID, act.ID, act, ""
}

func (a *App) actionsView(c *ui.Context) {
	th := c.Theme()
	acts := a.Store.Actions()
	if a.act.editing == 0 && len(acts) > 0 {
		a.selectAction(acts[0])
	}
	ui.Row(c).Fill().AlignItems(ui.Stretch).Children(func() {
		ui.Column(c).Width(220).Background(th.Surface).Children(func() {
			ui.Scroll(c.Key("action-list")).Grow(1).Children(func() {
				ui.Column(c).Padding(8).Gap(2).Children(func() {
					for _, act := range acts {
						act := act
						row := ui.ButtonBase(c.Key(act.ID)).Justify(ui.Start).Padding(6, 10).Radius(th.Radius)
						if act.ID == a.act.selected {
							row.Background(th.Accent).TextColor(th.AccentText)
						}
						row.Children(func() { ui.Text(c, actionLabel(act)).SingleLine() })
						if row.Clicked() {
							a.selectAction(act)
						}
					}
				})
			})
			ui.Row(c).Padding(8).Gap(4).Children(func() {
				if iconButton(c, iconPlus, T("Create")).Clicked() {
					a.act.selected, a.act.editing, a.act.err = 0, -1, ""
					a.act.draft = store.Action{Name: T("New action"), RolePrompt: "", CommandPrompt: "${text}", OutputRenderingFormat: "markdown"}
				}
				ui.Spacer(c)
				idx := -1
				for i, act := range acts {
					if act.ID == a.act.selected {
						idx = i
					}
				}
				if iconButton(c, iconUp, T("Move up")).Disabled(idx <= 0).Clicked() {
					_ = a.Store.MoveAction(a.act.selected, idx-1)
				}
				if iconButton(c, iconDown, T("Move down")).Disabled(idx < 0 || idx >= len(acts)-1).Clicked() {
					_ = a.Store.MoveAction(a.act.selected, idx+1)
				}
			})
		})
		ui.Divider(c)
		ui.Scroll(c.Key("action-editor")).Grow(1).Children(func() {
			ui.Column(c).Padding(16).Gap(12).Children(func() { a.actionEditor(c) })
		})
	})
}

func (a *App) actionEditor(c *ui.Context) {
	th := c.Theme()
	d := &a.act.draft
	builtin := d.Builtin()
	key := itoa(a.act.editing)
	ui.Form(c, func() {
		ui.Field(c, T("Name"), func() { ui.TextInput(c.Key("name"+key), &d.Name).ReadOnly(builtin) })
		if !builtin {
			ui.Field(c, T("Role prompt"), func() {
				ui.TextArea(c.Key("role"+key), &d.RolePrompt).Lines(3, 8)
			}).Description("${sourceLang} ${targetLang} ${text}")
			ui.Field(c, T("Command prompt"), func() {
				ui.TextArea(c.Key("cmd"+key), &d.CommandPrompt).Lines(3, 8)
			})
			ui.Field(c, T("Output rendering format"), func() {
				a.ch.choose(c, "format"+key, &d.OutputRenderingFormat, []string{"text", "markdown", "latex"}, []string{"Text", "Markdown", "LaTeX"})
			})
		}
		providers := append([]string{""}, engine.Providers...)
		labels := append([]string{T("Default")}, providerLabels()...)
		ui.Field(c, T("Service provider"), func() { a.ch.choose(c, "prov"+key, &d.Provider, providers, labels) })
		if d.Provider != "" {
			ui.Field(c, T("API Model"), func() { ui.TextInput(c.Key("model"+key), &d.APIModel).Placeholder(T("Default")) })
		}
	})
	if a.act.err != "" {
		ui.Text(c, a.act.err).TextColor(th.Danger)
	}
	ui.Row(c).Gap(8).Children(func() {
		if !builtin && a.act.editing > 0 {
			if ui.Button(c, "").Label(T("Delete")).Children(func() {
				ui.Icon(c, iconTrash)
				ui.Text(c, T("Delete")).SingleLine()
			}).TextColor(th.Danger).Clicked() {
				a.act.confirm = true
			}
		}
		ui.Spacer(c)
		if ui.PrimaryButton(c, T("Save")).Disabled(d.Name == "").Clicked() {
			a.saveAction()
		}
	})
	if ui.AlertDialog(c, &a.act.confirm, T("Delete"), T("Are you sure to delete this action?"), T("Cancel"), T("Delete")) == 1 {
		_ = a.Store.DeleteAction(a.act.editing)
		a.act.editing, a.act.selected = 0, 0
	}
}

func (a *App) saveAction() {
	var (
		saved store.Action
		err   error
	)
	if a.act.editing < 0 {
		saved, err = a.Store.CreateAction(a.act.draft)
	} else {
		saved, err = a.Store.UpdateAction(a.act.draft)
	}
	if err != nil {
		a.act.err = err.Error()
		return
	}
	a.selectAction(saved)
}
