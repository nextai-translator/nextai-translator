package gui

import (
	"context"
	"net/http"
	"path/filepath"
	"testing"
	"time"

	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
	"github.com/nextai-translator/nextai-translator/desktop/internal/translate"
)

// newApp makes an App whose main-thread work queues up for the test to run.
func newApp(t *testing.T) (*App, chan func()) {
	t.Helper()
	dir := t.TempDir()
	st, err := settings.Open(filepath.Join(dir, "settings.json"))
	if err != nil {
		t.Fatal(err)
	}
	data, err := store.Open(filepath.Join(dir, "data.json"))
	if err != nil {
		t.Fatal(err)
	}
	a := New(st, data)
	main := make(chan func(), 64)
	a.onMain = func(fn func()) { main <- fn }
	a.Detect = func(context.Context, *http.Client, string, string) string { return "en" }
	return a, main
}

// settle runs main-thread work until the translation ends.
func settle(t *testing.T, a *App, main chan func()) {
	t.Helper()
	deadline := time.After(5 * time.Second)
	for a.tr.running {
		select {
		case fn := <-main:
			fn()
		case <-deadline:
			t.Fatal("translation never finished")
		}
	}
}

func TestTranslateStreamsAndRecords(t *testing.T) {
	a, main := newApp(t)
	var got translate.Query
	a.Run = func(_ context.Context, q translate.Query, _ settings.Settings, _ *http.Client, onText func(string)) (translate.Result, error) {
		got = q
		onText("Bon")
		onText("jour")
		return translate.Result{Provider: "OpenAI", Model: "m"}, nil
	}
	tt := ui.NewTester(a.translatorView, 620, 600)
	a.SetInput("Hello", true)
	tt.Frame()
	settle(t, a, main)
	tt.Frame()
	if got.Text != "Hello" || got.Source != "en" || got.Target == "" || got.Target == "en" {
		t.Fatalf("query %+v", got)
	}
	if !tt.HasText("Bonjour") {
		t.Fatalf("output not shown: %q", tt.Texts())
	}
	h := a.Store.History(store.HistoryQuery{})
	if len(h) != 1 || h[0].TranslatedText != "Bonjour" || h[0].SourceLang != "en" {
		t.Fatalf("history %+v", h)
	}

	ht := ui.NewTester(a.historyView, 600, 500)
	ht.Frame()
	if !ht.HasText("Bonjour") {
		t.Fatalf("history view: %q", ht.Texts())
	}
}

func TestTranslateShowsError(t *testing.T) {
	a, main := newApp(t)
	a.Run = func(context.Context, translate.Query, settings.Settings, *http.Client, func(string)) (translate.Result, error) {
		return translate.Result{}, context.DeadlineExceeded
	}
	tt := ui.NewTester(a.translatorView, 620, 600)
	a.SetInput("Hello", true)
	settle(t, a, main)
	tt.Frame()
	if !tt.HasText(context.DeadlineExceeded.Error()) {
		t.Fatalf("error not shown: %q", tt.Texts())
	}
	if len(a.Store.History(store.HistoryQuery{})) != 0 {
		t.Fatal("failed run recorded")
	}
}

func TestStaleRunDropped(t *testing.T) {
	a, main := newApp(t)
	release := make(chan struct{})
	a.Run = func(ctx context.Context, q translate.Query, _ settings.Settings, _ *http.Client, onText func(string)) (translate.Result, error) {
		if q.Text == "first" {
			<-release
			onText("stale")
			return translate.Result{}, nil
		}
		onText("fresh")
		return translate.Result{}, nil
	}
	a.SetInput("first", true)
	a.SetInput("second", true)
	close(release)
	settle(t, a, main)
	// Let the first run's late posts arrive too.
	for {
		select {
		case fn := <-main:
			fn()
			continue
		case <-time.After(200 * time.Millisecond):
		}
		break
	}
	if a.tr.output != "fresh" {
		t.Fatalf("output %q", a.tr.output)
	}
}

func TestSettingsAndActionsRender(t *testing.T) {
	a, _ := newApp(t)
	a.set.draft, a.set.loaded = a.Settings.Get(), true
	st := ui.NewTester(a.settingsView, 640, 620)
	st.Frame()
	if !st.HasText(T("Save")) {
		t.Fatalf("settings: %q", st.Texts())
	}
	at := ui.NewTester(a.actionsView, 760, 560)
	at.Frame()
	if len(at.Texts()) == 0 {
		t.Fatal("actions view empty")
	}
}
