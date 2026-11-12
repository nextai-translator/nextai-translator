package gui

import (
	"context"
	"errors"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
)

// The updater is the Tauri app's UpdaterWindow: it checks the release feed,
// lists what is new and installs it with MyGo's updater, then relaunches.

type updaterState struct {
	checking    bool
	checked     bool // a check finished
	update      *mygo.Update
	err         string
	downloading bool
	progress    float64
}

// CheckForUpdates checks once in the background, and shows the updater when
// there is a new version and automatic checks are on; then again every ten
// minutes, quietly, as the Tauri app does.
func (a *App) CheckForUpdates() {
	if !mygo.Updater.Enabled() {
		return
	}
	go func() {
		first := true
		for {
			u, err := mygo.Updater.Check(context.Background())
			a.post(func() {
				if err != nil {
					log.Printf("check for updates: %v", err)
					return
				}
				if a.upd.downloading {
					return
				}
				had := a.upd.update != nil
				a.upd.update, a.upd.checked = u, true
				if a.OnUpdateFound != nil && had != (u != nil) {
					a.OnUpdateFound(u != nil)
				}
			})
			if first && err == nil && u != nil && a.Settings.Get().AutomaticCheckForUpdates {
				time.Sleep(3 * time.Second)
				a.post(a.OpenUpdater)
			}
			first = false
			time.Sleep(10 * time.Minute)
		}
	}()
}

// UpdateAvailable reports whether a check found a newer version.
func (a *App) UpdateAvailable() bool { return a.upd.update != nil }

// OpenUpdater shows the updater and checks for a new version.
func (a *App) OpenUpdater() {
	if a.updaterWin == nil || a.updaterWin.IsDestroyed() {
		a.updaterWin = mygo.NewWindow(mygo.WindowOptions{
			Title:          "NextAI Translator Updater",
			Content:        ui.View(a.updaterView),
			Width:          500,
			Height:         500,
			MinWidth:       200,
			MinHeight:      200,
			TitleBarStyle:  mygo.TitleBarHidden,
			TitleBarHeight: 90,
			SkipTaskbar:    true,
		})
	} else {
		a.updaterWin.Show()
		a.updaterWin.Focus()
	}
	if a.upd.downloading || a.upd.checking {
		return
	}
	if !mygo.Updater.Enabled() {
		a.upd.checking, a.upd.checked, a.upd.update, a.upd.err = false, true, nil, ""
		return
	}
	a.upd.checking, a.upd.err = true, ""
	go func() {
		u, err := mygo.Updater.Check(context.Background())
		a.post(func() {
			a.upd.checking, a.upd.checked = false, true
			if err != nil && !errors.Is(err, mygo.ErrUpdatesDisabled) {
				a.upd.err = err.Error()
				return
			}
			had := a.upd.update != nil
			a.upd.update = u
			if a.OnUpdateFound != nil && had != (u != nil) {
				a.OnUpdateFound(u != nil)
			}
		})
	}()
}

func (a *App) installUpdate() {
	u := a.upd.update
	if u == nil || a.upd.downloading {
		return
	}
	a.upd.downloading, a.upd.progress, a.upd.err = true, 0, ""
	go func() {
		err := u.Install(context.Background(), func(done, total int64) {
			if total <= 0 {
				return
			}
			p := float64(done) / float64(total)
			a.post(func() { a.upd.progress = min(p, 1) })
		})
		a.post(func() {
			a.upd.downloading = false
			if err != nil {
				a.upd.err = err.Error()
				return
			}
			a.upd.progress = 1
			mygo.App.Relaunch()
		})
	}()
}

var bulletRE = regexp.MustCompile(`^[-*]\s+`)

// updateItems splits release notes into their items: hard-wrapped lines
// continue the item above them.
func updateItems(body string) []string {
	var items []string
	for _, line := range strings.Split(body, "\n") {
		t := strings.TrimSpace(line)
		if t == "" {
			continue
		}
		if bulletRE.MatchString(t) || len(items) == 0 {
			items = append(items, bulletRE.ReplaceAllString(t, ""))
		} else {
			items[len(items)-1] += " " + t
		}
	}
	return items
}

func (a *App) updaterView(c *ui.Context) {
	p := pal(c)
	if c.Shortcut(0, ui.KeyEscape) && !a.upd.downloading {
		a.updaterWin.Hide()
		return
	}
	bar := ui.RGBA(255, 255, 255, .5)
	positive := ui.RGB(5, 148, 79)
	if p.dark {
		bar, positive = ui.RGBA(31, 31, 31, .5), ui.RGB(6, 193, 103)
	}
	ui.Column(c).Fill().Background(p.bg).TextColor(p.text).Children(func() {
		header := ui.Row(c).Height(90).Gap(10).Background(bar).BorderWidth(0, 0, 1, 0).BorderColor(p.line).DragWindow()
		if mygoGOOS == "darwin" {
			header.Center()
		} else {
			// The window's own buttons sit at the right of the header here.
			header.AlignItems(ui.Center).Padding(0, 120, 0, 20)
		}
		header.Children(func() {
			ui.Image(c, logo).Size(20, 20)
			ui.Text(c, "NextAI Translator "+T("Updater")).FontSize(20).FontWeight(700).SingleLine()
		})
		ui.Scroll(c.Key("body")).Grow(1).Children(func() {
			ui.Column(c).Padding(20, 20, 20, 20).Gap(10).AlignItems(ui.Center).Children(func() {
				switch u := a.upd.update; {
				case a.upd.checking || !a.upd.checked:
					ui.Column(c).Gap(10).AlignItems(ui.Center).Padding(40, 0).Children(func() {
						ui.Spinner(c).Size(24, 24)
						ui.Text(c, T("Checking for the latest version ...")).FontSize(16)
					})
				case u == nil:
					ui.Text(c, T("Congratulations! You are now using the latest version!")).FontSize(16).LineHeight(1.6).Wrap()
				default:
					ui.Column(c).Gap(16).Children(func() {
						ui.Row(c).Wrap().Children(func() {
							ui.Text(c, T("A new version is available!")+" ").FontSize(16).FontWeight(700).LineHeight(1.6)
							ui.Text(c, strings.ReplaceAll(T("The current version is {{0}}, and the latest version is"), "{{0}}", mygo.App.Version())+" ").
								FontSize(16).LineHeight(1.6).Wrap()
							ui.Text(c, u.Version).Margin(0, 0, 0, 4).FontSize(16).FontWeight(700).LineHeight(1.6).TextColor(positive)
							ui.Text(c, ".").FontSize(16).LineHeight(1.6)
						})
						ui.Text(c, T("The update content:")).FontSize(16).LineHeight(1.6)
					})
					ui.Column(c).Padding(0, 0, 0, 40).Children(func() {
						for i, item := range updateItems(u.Notes) {
							ui.Row(c.Key(i)).Gap(12).AlignItems(ui.Start).Children(func() {
								ui.Box(c).Size(6, 6).Margin(11, 0, 0, 0).Background(p.text)
								ui.Text(c, item).FontSize(16).LineHeight(1.8).Wrap().Grow(1)
							})
						}
					})
				}
				if a.upd.err != "" {
					ui.Text(c, a.upd.err).FontSize(13).TextColor(p.errText).Selectable().Wrap()
				}
			})
		})
		ui.Row(c).Padding(20).Gap(20).AlignItems(ui.Center).Background(bar).BorderWidth(1, 0, 0, 0).BorderColor(p.line).Children(func() {
			ui.Spacer(c)
			cancel := ui.Row(c.Key("close")).Height(36).Padding(10, 12).Gap(6).Radius(8).AlignItems(ui.Center).
				Background(p.secondaryBtn).Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton)
			cancel.Children(func() {
				ui.Icon(c, riIoIosCloseCircleOutline).Size(12, 12)
				ui.Text(c, T("Close")).FontSize(14).FontWeight(500).SingleLine()
			})
			if cancel.Clicked() {
				a.updaterWin.Hide()
			}
			if a.upd.update == nil {
				return
			}
			if a.upd.downloading {
				ui.Progress(c, a.upd.progress).Width(120).Height(4).Radius(2).TextColor(p.text)
				return
			}
			ok := ui.Row(c.Key("update")).Height(36).Padding(10, 12).Gap(6).Radius(8).AlignItems(ui.Center).
				Background(p.primaryBg).TextColor(p.primaryFg).Cursor(ui.CursorPointer).Focusable().Role(ui.RoleButton)
			ok.Children(func() {
				ui.Icon(c, riMdBrowserUpdated).Size(12, 12)
				ui.Text(c, T("Update")).FontSize(14).FontWeight(500).SingleLine()
			})
			if ok.Clicked() {
				a.installUpdate()
			}
		})
	})
}
