package gui

import (
	"context"
	"errors"
	"log"
	"math"
	"strings"
	"sync/atomic"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
	"github.com/nextai-translator/nextai-translator/desktop/internal/sys"
	"github.com/nextai-translator/nextai-translator/desktop/internal/translate"
)

// The writing flow is the Tauri app's writing hotkey: the text of the input
// the user is typing in, in whatever app, is translated into the writing
// target language and typed back in its place, while a small HUD under the
// input says what is going on.

const (
	writingHUDWidth  = 220
	writingHUDHeight = 44
	writingHUDGap    = 8
)

type writingState struct {
	lang  string
	done  bool
	shown time.Time
}

// writingBusy keeps a second press of the hotkey from starting another run
// while one is still typing.
var writingBusy atomic.Bool

// StartWriting translates the focused input of the frontmost app into the
// writing target language, in place.
func (a *App) StartWriting() {
	s := a.Settings.Get()
	if s.WritingTargetLanguage == "" {
		a.ShowNotice(T("Please set the writing target language in the settings first"))
		a.ShowTranslator(false)
		return
	}
	if !writingBusy.CompareAndSwap(false, true) {
		return
	}
	action, ok := a.Store.ActionByMode(store.ModeTranslate)
	if !ok {
		writingBusy.Store(false)
		return
	}
	go func() {
		defer writingBusy.Store(false)
		// The caret first: reading the text may move the focus about.
		x, y, w, h, anchored := sys.CaretRect()
		text, replaceSelection := sys.SelectedTextAX()
		if !replaceSelection {
			var err error
			text, err = sys.FocusedText()
			if err != nil {
				a.post(func() { a.writingFailed(err) })
				return
			}
		}
		text = strings.TrimSpace(text)
		if text == "" {
			return
		}
		a.post(func() { a.showWritingHUD(s.WritingTargetLanguage, x, y, w, h, anchored) })

		client := a.httpClient(s)
		ctx := context.Background()
		src := a.Detect(ctx, client, s.LanguageDetection, text)
		// Typing goes through its own goroutine, chunk after chunk, so that a
		// slow app does not hold up the stream.
		chunks := make(chan string, 256)
		typed := make(chan error, 1)
		go func() {
			var first = true
			var err error
			for c := range chunks {
				if err != nil {
					continue
				}
				if first {
					first = false
					if !replaceSelection {
						if err = sys.SelectAll(); err != nil {
							continue
						}
						time.Sleep(50 * time.Millisecond)
					}
				}
				err = sys.TypeText(c, s.WritingNewlineHotkey)
			}
			typed <- err
		}()
		_, err := a.Run(ctx, translate.Query{Text: text, Source: src, Target: s.WritingTargetLanguage, Action: action, Writing: true}, s, client, func(t string) {
			chunks <- t
		})
		close(chunks)
		if terr := <-typed; err == nil {
			err = terr
		}
		a.post(func() {
			if err != nil {
				a.hideWritingHUD()
				a.writingFailed(err)
				return
			}
			a.finishWritingHUD()
		})
	}()
}

func (a *App) writingFailed(err error) {
	log.Printf("writing: %v", err)
	switch {
	case errors.Is(err, sys.ErrNoPermission):
		a.ShowNotice(T("Please grant accessibility permission to the app, then try again"))
	case errors.Is(err, sys.ErrInputUnsupported):
		a.ShowNotice(T("Writing is not supported on this system"))
	default:
		a.ShowNotice(err.Error())
	}
	a.ShowTranslator(false)
}

// showWritingHUD shows the indicator centred under the anchor, or under the
// pointer when the app did not say where its input is.
func (a *App) showWritingHUD(lang string, x, y, w, h float64, anchored bool) {
	a.wr = writingState{lang: lang, shown: time.Now()}
	if !anchored {
		p := mygo.Screen.CursorScreenPoint()
		x, y, w, h = float64(p.X), float64(p.Y), 1, 1
	}
	if a.writingWin == nil || a.writingWin.IsDestroyed() {
		a.writingWin = mygo.NewWindow(mygo.WindowOptions{
			Content:       ui.View(a.writingView),
			Width:         writingHUDWidth,
			Height:        writingHUDHeight,
			Frameless:     true,
			Panel:         true,
			Transparent:   true,
			Vibrancy:      mygo.VibrancyHUD,
			CornerRadius:  14,
			AlwaysOnTop:   true,
			SkipTaskbar:   true,
			DisableResize: true,
			Hidden:        true,
		})
		a.writingWin.SetIgnoreMouseEvents(true)
	}
	px := int(math.Round(x + w/2 - writingHUDWidth/2))
	py := int(math.Round(y + h + writingHUDGap))
	wa := mygo.Screen.DisplayNearestPoint(mygo.Point{X: px, Y: py}).WorkArea
	px = max(wa.X, min(px, wa.X+wa.Width-writingHUDWidth))
	py = max(wa.Y, min(py, wa.Y+wa.Height-writingHUDHeight))
	a.writingWin.SetPosition(px, py)
	a.writingWin.ShowInactive()
}

// finishWritingHUD says "Done", then hides the indicator, as the Tauri app
// does 700ms after finishing.
func (a *App) finishWritingHUD() {
	if a.writingWin == nil || a.writingWin.IsDestroyed() {
		return
	}
	a.wr.done = true
	shown := a.wr.shown
	time.AfterFunc(700*time.Millisecond, func() {
		a.post(func() {
			if a.wr.shown == shown {
				a.hideWritingHUD()
			}
		})
	})
}

func (a *App) hideWritingHUD() {
	if a.writingWin != nil && !a.writingWin.IsDestroyed() {
		a.writingWin.Hide()
	}
}

func (a *App) writingView(c *ui.Context) {
	text := ui.RGBA(255, 255, 255, .88)
	ui.Row(c).Fill().Padding(0, 14).Gap(9).AlignItems(ui.Center).TextColor(text).Children(func() {
		if a.wr.done {
			ui.Icon(c, riLuCheck).Size(13, 13).TextColor(ui.RGB(120, 220, 160))
			ui.Text(c, T("Done")).FontSize(12.5).FontWeight(500).SingleLine()
			return
		}
		ui.Icon(c, riLuPenLine).Size(13, 13)
		label := "Translating"
		if l := strings.TrimSpace(a.wr.lang); l != "" {
			label += " · " + l
		}
		ui.Text(c, label).FontSize(12.5).FontWeight(500).SingleLine()
		// Three dots that pulse one after another: 1.3s a cycle, 140ms apart.
		// Opacity only, so they stay calm under reduced motion too.
		t := time.Since(a.wr.shown).Seconds()
		ui.Row(c).Gap(3).AlignItems(ui.Center).Children(func() {
			for i := range 3 {
				phase := math.Mod(t-float64(i)*.14, 1.3) / 1.3
				if phase < 0 {
					phase += 1
				}
				o := .3 + .7*(.5-.5*math.Cos(2*math.Pi*phase))
				ui.Box(c.Key(i)).Size(3, 3).Radius(1.5).Background(text).Opacity(float32(o))
			}
		})
		c.AnimationFrame()
	})
}
