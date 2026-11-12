// NextAI Translator's desktop app, on MyGo's native UI.
package main

import (
	_ "embed"
	"errors"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/egoist/mygo"
	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
	"github.com/nextai-translator/nextai-translator/desktop/internal/gui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/i18n"
	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
	"github.com/nextai-translator/nextai-translator/desktop/internal/sys"
)

//go:embed resources/tray.png
var trayIcon []byte

func main() {
	if !mygo.App.RequestSingleInstanceLock() {
		return // the running app shows its window
	}
	mygo.App.WhenReady(start)
	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
}

func start() {
	path, err := settings.DefaultPath()
	if err != nil {
		log.Fatal(err)
	}
	cfg, err := settings.Open(path)
	if err != nil {
		log.Fatal(err)
	}
	data, err := store.Open(filepath.Join(filepath.Dir(path), "desktop-data.json"))
	if err != nil {
		log.Fatal(err)
	}
	if _, err := data.ImportTauri(filepath.Join(filepath.Dir(path), store.TauriExportFile)); err != nil {
		log.Printf("import the Tauri app's data: %v", err)
	}
	engine.SaveTokens = func(fn func(*settings.Settings)) {
		if err := cfg.Update(fn); err != nil {
			log.Printf("save tokens: %v", err)
		}
	}
	s := cfg.Get()
	gui.ApplyAppearance(s)
	applyDock(s)
	app := gui.New(cfg, data)

	var hotkeys sys.Hotkeys
	actions := map[string]func(){
		"hotkey":                func() { translateSelection(app) },
		"displayWindowHotkey":   app.ToggleTranslator,
		"ocrHotkey":             app.StartOCR,
		"quickTranslatorHotkey": app.ShowQuickTranslator,
		"writingHotkey":         app.StartWriting,
	}
	bind := func(s settings.Settings) map[string]error {
		keys := map[string]string{
			"hotkey":                s.Hotkey,
			"displayWindowHotkey":   s.DisplayWindowHotkey,
			"quickTranslatorHotkey": s.QuickTranslatorHotkey,
			"writingHotkey":         s.WritingHotkey,
		}
		if runtime.GOOS != "linux" {
			keys["ocrHotkey"] = s.OCRHotkey
		}
		return hotkeys.Set(keys, actions)
	}
	for name, err := range bind(s) {
		log.Printf("hotkey %s: %v", name, err)
	}
	startup := s.RunAtStartup
	migrateLoginItem(s.RunAtStartup)
	app.OnSettingsSaved = func(s settings.Settings) map[string]error {
		applyDock(s)
		if s.RunAtStartup != startup {
			if err := mygo.App.SetOpenAtLogin(s.RunAtStartup); err == nil {
				startup = s.RunAtStartup
			}
		}
		makeTray(app)
		return bind(s)
	}

	app.OnUpdateFound = func(bool) { makeTray(app) }
	makeTray(app)
	app.CheckForUpdates()
	if _, err := sys.ServeIPC(func(text string) {
		mygo.RunOnMain(func() {
			app.SetInput(text, true)
			app.ShowTranslator(true)
		})
	}); err != nil {
		log.Printf("ipc: %v", err)
	}
	mygo.App.OnSecondInstance(func([]string, string) { app.ShowTranslator(false) })
	mygo.App.OnWindowAllClosed(func() {}) // the tray keeps the app running
	mygo.App.OnActivate(func(visible bool) {
		if !visible {
			app.ShowTranslator(false)
		}
	})
	if !mygo.App.WasOpenedAtLogin() {
		app.ShowTranslator(false)
	}
}

func applyDock(s settings.Settings) {
	if runtime.GOOS != "darwin" {
		return
	}
	if s.HideTheIconInTheDock {
		mygo.App.SetActivationPolicy(mygo.ActivationPolicyAccessory)
	} else {
		mygo.App.SetActivationPolicy(mygo.ActivationPolicyRegular)
	}
}

var tray *mygo.Tray

// makeTray builds the tray icon's menu, again whenever its labels change.
func makeTray(app *gui.App) {
	T := i18n.T
	pin := T("Pin")
	if app.Pinned() {
		pin = T("Unpin")
	}
	update := T("Check for Updates...")
	if app.UpdateAvailable() {
		update = "💡 " + T("New version available!")
	}
	items := []*mygo.MenuItem{
		{Label: update, Click: func(*mygo.MenuItem, *mygo.Window) { app.OpenUpdater() }},
	}
	if runtime.GOOS != "linux" {
		items = append(items, &mygo.MenuItem{Label: "OCR", Click: func(*mygo.MenuItem, *mygo.Window) { app.StartOCR() }})
	}
	menu := mygo.NewMenu(append(items, []*mygo.MenuItem{
		{Label: T("Show"), Click: func(*mygo.MenuItem, *mygo.Window) { app.ShowTranslator(false) }},
		{Label: T("Hide"), Click: func(*mygo.MenuItem, *mygo.Window) {
			if app.Shown() {
				app.ToggleTranslator()
			}
		}},
		{Label: pin, Click: func(*mygo.MenuItem, *mygo.Window) {
			app.SetPinned(!app.Pinned())
			makeTray(app)
		}},
		mygo.Separator(),
		{Label: T("Settings"), Click: func(*mygo.MenuItem, *mygo.Window) { app.OpenSettings() }},
		{Label: T("Action Manager"), Click: func(*mygo.MenuItem, *mygo.Window) { app.OpenActions() }},
		{Label: T("History"), Click: func(*mygo.MenuItem, *mygo.Window) { app.OpenHistory() }},
		mygo.Separator(),
		{Label: T("Quit"), Role: mygo.RoleQuit},
	}...))
	if tray != nil {
		tray.SetMenu(menu)
		return
	}
	t, err := mygo.NewTray(mygo.TrayOptions{ID: "main", Icon: trayIcon, ToolTip: "NextAI Translator", Menu: menu})
	if err != nil {
		log.Printf("tray: %v", err)
		return
	}
	tray = t
}

// translateSelection reads the text selected in the app in front, then
// shows the translator by the pointer and translates it.
func translateSelection(app *gui.App) {
	go func() {
		text, err := sys.SelectedText()
		mygo.RunOnMain(func() {
			switch {
			case errors.Is(err, sys.ErrNoPermission):
				app.ShowNotice(i18n.T("Please grant accessibility permissions to the app"))
				if sys.AccessibilitySettingsURL != "" {
					_ = mygo.Shell.OpenExternal(sys.AccessibilitySettingsURL)
				}
			case err != nil:
				log.Printf("selected text: %v", err)
			case strings.TrimSpace(text) != "":
				app.SetInput(text, true)
			}
			app.ShowTranslator(true)
		})
	}()
}

// migrateLoginItem moves start-at-login over from the Tauri app. On macOS
// its LaunchAgent starts Contents/MacOS/app, which the update to this app
// removed, so the agent goes and this app's own login item takes its place.
// Elsewhere the installer moved the entry over; this only makes sure the
// setting and the system agree.
func migrateLoginItem(want bool) {
	if runtime.GOOS == "darwin" {
		if home, err := os.UserHomeDir(); err == nil {
			p := filepath.Join(home, "Library", "LaunchAgents", "NextAI Translator.plist")
			if b, err := os.ReadFile(p); err == nil && strings.Contains(string(b), "Contents/MacOS/app") {
				if err := os.Remove(p); err != nil {
					log.Printf("remove the Tauri app's login item: %v", err)
				}
			}
		}
	}
	if want != mygo.App.OpenAtLogin() {
		if err := mygo.App.SetOpenAtLogin(want); err != nil {
			log.Printf("open at login: %v", err)
		}
	}
}
