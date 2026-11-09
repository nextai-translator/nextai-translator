// Package gui is the desktop app's interface, drawn with MyGo's native UI:
// the translator, its settings, the action manager and the history.
package gui

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
	"github.com/nextai-translator/nextai-translator/desktop/internal/i18n"
	"github.com/nextai-translator/nextai-translator/desktop/internal/lang"
	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
	"github.com/nextai-translator/nextai-translator/desktop/internal/translate"
)

// App holds the state of every window. Its fields change on the main
// thread only; goroutines go through post.
type App struct {
	Settings *settings.Store
	Store    *store.Store
	// Run translates; tests replace it.
	Run func(ctx context.Context, q translate.Query, s settings.Settings, client *http.Client, onText func(string)) (translate.Result, error)
	// Detect finds the source language; tests replace it.
	Detect func(ctx context.Context, client *http.Client, engine, text string) string
	// OnSettingsSaved runs after the settings window saves, as main
	// re-registers the hotkeys.
	OnSettingsSaved func(settings.Settings) map[string]error
	// onMain runs a function on the main thread; tests replace it.
	onMain func(func())

	translator, settingsWin, actionsWin, historyWin *mygo.Window

	ch   choices
	tr   translatorState
	set  settingsState
	act  actionsState
	hist historyState

	clientMu  sync.Mutex
	clientFor settings.Proxy
	client    *http.Client
}

type translatorState struct {
	input    string
	source   string // "" detects it
	target   string // "" picks it from the source
	actionID int64
	seg      int   // the action control's choice
	segFor   int64 // the action seg was taken from

	detected string // the source of the last run
	output   string
	err      string
	running  bool
	done     bool
	wordMode bool
	cancel   context.CancelFunc
	gen      int
	copied   bool
}

// New makes the app; Open* show its windows.
func New(st *settings.Store, data *store.Store) *App {
	a := &App{Settings: st, Store: data, Run: translate.Run, Detect: lang.Detect, onMain: mygo.RunOnMain, ch: choices{}}
	s := st.Get()
	i18n.Set(s.I18n)
	if act, ok := data.ActionByMode(s.DefaultTranslateMode); ok {
		a.tr.actionID = act.ID
	} else if acts := data.Actions(); len(acts) > 0 {
		a.tr.actionID = acts[0].ID
	}
	data.OnChange(func() { a.refresh(a.historyWin, a.actionsWin, a.translator) })
	return a
}

// post runs fn on the main thread and redraws the windows.
func (a *App) post(fn func()) {
	a.onMain(func() {
		fn()
		a.redraw()
	})
}

func (a *App) redraw() {
	for _, w := range []*mygo.Window{a.translator, a.settingsWin, a.actionsWin, a.historyWin} {
		if w != nil && !w.IsDestroyed() {
			w.Invalidate()
		}
	}
}

func (a *App) refresh(ws ...*mygo.Window) {
	for _, w := range ws {
		if w != nil && !w.IsDestroyed() {
			w.Update(func() {})
		}
	}
}

// httpClient is shared while the proxy stays the same.
func (a *App) httpClient(s settings.Settings) *http.Client {
	a.clientMu.Lock()
	defer a.clientMu.Unlock()
	if a.client == nil || a.clientFor != s.Proxy {
		a.client, a.clientFor = engine.NewHTTPClient(s), s.Proxy
	}
	return a.client
}

func (a *App) currentAction() store.Action {
	if act, ok := a.Store.Action(a.tr.actionID); ok {
		return act
	}
	acts := a.Store.Actions()
	if len(acts) == 0 {
		return store.Action{Mode: store.ModeTranslate, Name: "Translate"}
	}
	a.tr.actionID = acts[0].ID
	return acts[0]
}

// Translate runs the current action on the input, streaming the answer
// into the output; a run already going is stopped.
func (a *App) Translate() {
	text := a.tr.input
	if strings.TrimSpace(text) == "" {
		return
	}
	a.Stop()
	ctx, cancel := context.WithCancel(context.Background())
	a.tr.gen++
	gen := a.tr.gen
	a.tr.cancel = cancel
	a.tr.output, a.tr.err, a.tr.running, a.tr.done, a.tr.copied = "", "", true, false, false
	s := a.Settings.Get()
	action := a.currentAction()
	src, tgt := a.tr.source, a.tr.target
	client := a.httpClient(s)
	current := func() bool { return gen == a.tr.gen }
	go func() {
		defer cancel()
		if src == "" {
			src = a.Detect(ctx, client, s.LanguageDetection, text)
		}
		if tgt == "" {
			tgt = lang.PickAutoTarget(src, s.DefaultTargetLanguage, s.WritingTargetLanguage)
		}
		a.post(func() {
			if current() {
				a.tr.detected = src
			}
		})
		// Chunks come faster than frames: hand them over in batches.
		var mu sync.Mutex
		var pending strings.Builder
		flush := func() {
			mu.Lock()
			chunk := pending.String()
			pending.Reset()
			mu.Unlock()
			if chunk != "" {
				a.post(func() {
					if current() {
						a.tr.output += chunk
					}
				})
			}
		}
		stop := make(chan struct{})
		go func() {
			t := time.NewTicker(16 * time.Millisecond)
			defer t.Stop()
			for {
				select {
				case <-stop:
					return
				case <-t.C:
					flush()
				}
			}
		}()
		res, err := a.Run(ctx, translate.Query{Text: text, Source: src, Target: tgt, Action: action}, s, client, func(t string) {
			mu.Lock()
			pending.WriteString(t)
			mu.Unlock()
		})
		close(stop)
		flush()
		canceled := ctx.Err() != nil
		a.post(func() {
			if !current() {
				return
			}
			a.tr.running, a.tr.done, a.tr.wordMode = false, true, res.WordMode
			a.tr.cancel = nil
			if err != nil && !canceled {
				a.tr.err = err.Error()
				return
			}
			if err == nil && strings.TrimSpace(a.tr.output) != "" {
				_, _ = a.Store.RecordHistory(store.HistoryItem{
					Text: text, TranslatedText: a.tr.output, SourceLang: src, TargetLang: tgt,
					ActionID: action.ID, ActionName: action.Name, ActionMode: action.Mode,
					Provider: res.Provider, EngineModel: res.Model, WordMode: res.WordMode,
				})
			}
		})
	}()
}

// Stop ends the run going, keeping what came so far.
func (a *App) Stop() {
	if a.tr.cancel != nil {
		a.tr.cancel()
		a.tr.cancel = nil
	}
	a.tr.gen++
	if a.tr.running {
		a.tr.running, a.tr.done = false, true
	}
}

// SetInput puts text in the translator and, unless auto translation is
// off, translates it.
func (a *App) SetInput(text string, translateNow bool) {
	a.Stop()
	a.tr.input = text
	a.tr.output, a.tr.err, a.tr.done, a.tr.detected = "", "", false, ""
	if translateNow && strings.TrimSpace(text) != "" {
		a.Translate()
	}
}

// Shown reports whether the translator is on screen.
func (a *App) Shown() bool { return a.translator != nil && a.translator.IsVisible() }

// ToggleTranslator shows the translator, or hides it when it shows.
func (a *App) ToggleTranslator() {
	if a.Shown() {
		a.translator.Hide()
		return
	}
	a.ShowTranslator(false)
}

// ShowTranslator brings the translator up, by the pointer unless it should
// keep its place.
func (a *App) ShowTranslator(byPointer bool) {
	s := a.Settings.Get()
	if a.translator == nil || a.translator.IsDestroyed() {
		a.translator = mygo.NewWindow(mygo.WindowOptions{
			Title:       "NextAI Translator",
			Content:     ui.View(a.translatorView),
			Width:       620,
			Height:      600,
			MinWidth:    420,
			MinHeight:   360,
			Hidden:      true,
			AlwaysOnTop: s.Pinned,
			StateKey:    "translator",
		})
		a.translator.OnClose(func(e *mygo.CloseEvent) {
			e.PreventDefault()
			a.Stop()
			a.translator.Hide()
		})
		a.translator.OnBlur(func() {
			if s := a.Settings.Get(); s.AutoHideWindowWhenOutOfFocus && !s.Pinned {
				a.translator.Hide()
			}
		})
	}
	if byPointer && !s.RestorePreviousPosition {
		a.placeByPointer(a.translator)
	}
	a.translator.Show()
	a.translator.Focus()
}

// placeByPointer puts w below and right of the pointer, inside its display.
func (a *App) placeByPointer(w *mygo.Window) {
	p := mygo.Screen.CursorScreenPoint()
	area := mygo.Screen.DisplayNearestPoint(p).WorkArea
	width, height := w.Size()
	x, y := p.X+8, p.Y+8
	if x+width > area.X+area.Width {
		x = area.X + area.Width - width
	}
	if y+height > area.Y+area.Height {
		y = area.Y + area.Height - height
	}
	x, y = max(x, area.X), max(y, area.Y)
	w.SetPosition(x, y)
}

// SetPinned keeps the translator above other windows.
func (a *App) SetPinned(on bool) {
	_ = a.Settings.Update(func(s *settings.Settings) { s.Pinned = on })
	if a.translator != nil {
		a.translator.SetAlwaysOnTop(on)
	}
}

// Pinned reports whether the translator stays on top.
func (a *App) Pinned() bool { return a.Settings.Get().Pinned }

func (a *App) openWindow(w **mygo.Window, title string, view func(c *ui.Context), width, height int, key string) {
	if *w != nil && !(*w).IsDestroyed() {
		(*w).Show()
		(*w).Focus()
		return
	}
	*w = mygo.NewWindow(mygo.WindowOptions{
		Title:     title,
		Content:   ui.View(view),
		Width:     width,
		Height:    height,
		MinWidth:  480,
		MinHeight: 360,
		StateKey:  key,
	})
}

// ShowNotice shows a message where the translation goes.
func (a *App) ShowNotice(msg string) {
	a.Stop()
	a.tr.output, a.tr.err = "", msg
}
