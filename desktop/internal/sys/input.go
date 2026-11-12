package sys

// This file is the writing flow's side of the system: reading the text of
// the input the user is typing in, in whatever app, and writing into it,
// by the platform's accessibility API where it has one and by simulated
// keys and the clipboard otherwise. The per-platform parts are in
// input_darwin.go, input_windows.go and input_other.go.

import (
	"errors"
	"fmt"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/transfer"
)

// ErrInputUnsupported means this system offers no way to read or write
// another app's input, as on Linux without xdotool (X11) or wtype
// (Wayland).
var ErrInputUnsupported = errors.New("simulating input is not supported here")

// inputMu serializes the simulated input and the clipboard dance: two
// pastes, or a paste and a copy, must not interleave.
var inputMu sync.Mutex

// FocusedText returns the whole text of the focused input in the frontmost
// app, with line breaks as "\n". It reads it through the accessibility API
// first (macOS: the focused element's AXValue; Windows: UI Automation's
// Value or Text pattern), which leaves the input and the clipboard alone,
// and falls back to selecting all, copying and collapsing the selection
// again, the clipboard put back afterwards. It returns "" when the input is
// empty or nothing is focused. Call it off the main thread.
func FocusedText() (string, error) {
	if text, ok := axFocusedText(); ok && strings.TrimSpace(text) != "" {
		return normalizeNewlines(text), nil
	}
	if err := checkInput(); err != nil {
		return "", err
	}
	inputMu.Lock()
	defer inputMu.Unlock()
	if err := selectAll(); err != nil {
		return "", err
	}
	time.Sleep(50 * time.Millisecond)
	text, err := copyBySimulation(func() error { return pressCombo(keyCombo{mods: shortcutMod, key: "c"}) })
	if err != nil {
		return "", err
	}
	if text != "" {
		// Collapse the selection, as the old app did, so that the next keys
		// the user types do not replace the text.
		_ = pressCombo(keyCombo{key: "right"})
	}
	return normalizeNewlines(strings.TrimSuffix(text, "\r\n")), nil
}

// SelectedTextAX returns the text selected in the focused input as the
// accessibility API reports it, without touching the clipboard or sending
// keys, and false when there is none or the platform cannot tell (only
// macOS can). The writing flow uses it to choose between typing over the
// selection and replacing the whole input.
func SelectedTextAX() (string, bool) {
	text, ok := axSelectedText()
	if !ok || text == "" {
		return "", false
	}
	return normalizeNewlines(text), true
}

// SelectAll selects all the text of the focused input: on macOS through
// the accessibility API where the input takes it, otherwise with the
// select-all shortcut (Cmd+A, Ctrl+A). Call it off the main thread.
func SelectAll() error {
	if err := checkInput(); err != nil {
		return err
	}
	inputMu.Lock()
	defer inputMu.Unlock()
	return selectAll()
}

// ReplaceFocusedText selects all the text of the focused input and
// replaces it with text, pasted from the clipboard, which is put back as it
// was afterwards. Call it off the main thread.
func ReplaceFocusedText(text string) error {
	if err := checkInput(); err != nil {
		return err
	}
	inputMu.Lock()
	defer inputMu.Unlock()
	if err := selectAll(); err != nil {
		return err
	}
	time.Sleep(50 * time.Millisecond)
	if text == "" {
		return pressCombo(keyCombo{key: "backspace"})
	}
	return pasteText(text)
}

// TypeText inserts text at the caret of the focused input, replacing its
// selection if it has one. It pastes the text, so that input methods and
// keyboard layouts cannot mangle it, and puts the clipboard back once
// typing pauses; a stream of chunks can call it chunk by chunk.
//
// newlineCombo is the writing settings' line break shortcut
// (writingNewlineHotkey, such as "shift+enter"): when it is set, every
// line break in text is that shortcut pressed instead, for chat inputs in
// which Enter would send the message. When it is empty, line breaks are
// pasted with the text, which inserts them without sending anything.
// Call it off the main thread.
func TypeText(text, newlineCombo string) error {
	if text == "" {
		return nil
	}
	var newline keyCombo
	if newlineCombo != "" {
		c, err := parseCombo(newlineCombo, runtime.GOOS)
		if err != nil {
			return err
		}
		newline = c
	}
	if err := checkInput(); err != nil {
		return err
	}
	inputMu.Lock()
	defer inputMu.Unlock()
	for i, seg := range typeSegments(text, newlineCombo != "") {
		if i > 0 {
			if err := pressCombo(newline); err != nil {
				return err
			}
			time.Sleep(20 * time.Millisecond)
		}
		if seg == "" {
			continue
		}
		if err := pasteText(seg); err != nil {
			return err
		}
	}
	return nil
}

// PressKeys presses a shortcut in the format the settings store hotkeys in
// (react-hotkeys-hook's: "shift+enter", "ctrl+alt+a",
// "CommandOrControl+v"), the user's own modifiers still held from the
// hotkey released first. Call it off the main thread.
func PressKeys(combo string) error {
	c, err := parseCombo(combo, runtime.GOOS)
	if err != nil {
		return err
	}
	if err := checkInput(); err != nil {
		return err
	}
	inputMu.Lock()
	defer inputMu.Unlock()
	return pressCombo(c)
}

// CaretRect returns the screen rectangle of the caret or selection in the
// focused input, or of the input itself when the app does not tell where
// its caret is, in MyGo's screen coordinates (DIPs from the top-left corner
// of the primary display, what WindowOptions.X and Y take), for placing a
// small window next to it. ok is false when neither is known, as on Linux.
// Call it off the main thread.
func CaretRect() (x, y, w, h float64, ok bool) { return caretRect() }

// RememberForeground remembers the app and window that have the focus now,
// unless they are this app's own, for RestoreForeground to give the focus
// back to: the translator window does that to insert a translation into the
// input the user was typing in before. Call it off the main thread.
func RememberForeground() { rememberForeground() }

// RestoreForeground gives the focus back to the app and window
// RememberForeground remembered, and waits briefly for them to take it. It
// fails when none was remembered or the system refused.
func RestoreForeground() error { return restoreForeground() }

// checkInput reports why simulated input cannot work, as when macOS has
// not given the app Accessibility access.
func checkInput() error {
	if !Trusted() {
		return ErrNoPermission
	}
	return nil
}

// normalizeNewlines turns Windows' and old Mac line breaks into "\n".
func normalizeNewlines(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	return strings.ReplaceAll(s, "\r", "\n")
}

// typeSegments splits text at its line breaks when they are to be pressed
// as a shortcut, or keeps it whole when they are pasted with it.
func typeSegments(text string, splitLines bool) []string {
	text = normalizeNewlines(text)
	if !splitLines {
		return []string{text}
	}
	return strings.Split(text, "\n")
}

// modMask is a set of modifier keys. modMeta is Command on macOS, the
// Windows key on Windows and Super on Linux.
type modMask uint8

const (
	modShift modMask = 1 << iota
	modCtrl
	modAlt
	modMeta
)

// shortcutMod is the modifier of the platform's editing shortcuts.
var shortcutMod = func() modMask {
	if runtime.GOOS == "darwin" {
		return modMeta
	}
	return modCtrl
}()

// keyCombo is a parsed shortcut: modifiers and one key, named as in
// comboKeys' values, or a single lower-case character.
type keyCombo struct {
	mods modMask
	key  string
}

// comboMods maps the modifier names of stored hotkeys to modifiers;
// "commandorcontrol" and its kin are resolved per platform.
var comboMods = map[string]modMask{
	"shift": modShift, "ctrl": modCtrl, "control": modCtrl,
	"alt": modAlt, "option": modAlt, "opt": modAlt,
	"meta": modMeta, "cmd": modMeta, "command": modMeta, "super": modMeta, "win": modMeta, "os": modMeta,
}

// comboKeys maps the key names of stored hotkeys (react-hotkeys-hook's,
// Tauri's, MyGo's) to keyCombo's.
var comboKeys = map[string]string{
	"enter": "enter", "return": "enter", "escape": "escape", "esc": "escape",
	"tab": "tab", "space": "space", " ": "space", "backspace": "backspace",
	"delete": "delete", "del": "delete", "insert": "insert",
	"arrowleft": "left", "left": "left", "arrowright": "right", "right": "right",
	"arrowup": "up", "up": "up", "arrowdown": "down", "down": "down",
	"home": "home", "end": "end", "pageup": "pageup", "pagedown": "pagedown",
	"period": ".", "comma": ",", "slash": "/", "backslash": "\\", "backquote": "`",
	"bracketleft": "[", "bracketright": "]", "minus": "-", "equal": "=",
	"semicolon": ";", "quote": "'",
}

// parseCombo parses a stored hotkey ("shift+enter", "CommandOrControl+v",
// "ctrl-alt-a") for goos: one key, which may be a modifier-free character,
// with any modifiers.
func parseCombo(combo, goos string) (keyCombo, error) {
	var c keyCombo
	parts := strings.FieldsFunc(strings.ReplaceAll(combo, "-", "+"), func(r rune) bool { return r == '+' })
	for _, p := range parts {
		name := strings.ToLower(strings.TrimSpace(p))
		if name == "" {
			continue
		}
		switch name {
		case "commandorcontrol", "commandorctrl", "cmdorcontrol", "cmdorctrl":
			if goos == "darwin" {
				c.mods |= modMeta
			} else {
				c.mods |= modCtrl
			}
			continue
		}
		if m, ok := comboMods[name]; ok {
			c.mods |= m
			continue
		}
		key, ok := comboKeys[name]
		switch {
		case ok:
		case len([]rune(name)) == 1:
			key = name
		case strings.HasPrefix(name, "key") && len(name) == 4:
			key = name[3:]
		case strings.HasPrefix(name, "digit") && len(name) == 6:
			key = name[5:]
		case len(name) >= 2 && len(name) <= 3 && name[0] == 'f' && strings.Trim(name[1:], "0123456789") == "":
			key = name
		default:
			return keyCombo{}, fmt.Errorf("unknown key %q in %q", p, combo)
		}
		if c.key != "" {
			return keyCombo{}, fmt.Errorf("%q has more than one key", combo)
		}
		c.key = key
	}
	if c.key == "" {
		return keyCombo{}, fmt.Errorf("%q has no key besides modifiers", combo)
	}
	return c, nil
}

// clip holds the clipboard the user had while pastes borrow it: saved on
// the first paste of a run and put back once pasting pauses, so that a
// stream of chunks neither saves its own chunks as the user's clipboard
// nor flashes it back between them. Guarded by inputMu.
var clip struct {
	saved   transfer.Data
	pending bool
	timer   *time.Timer
}

// pasteSettle is how long the target app gets to read the clipboard after
// the paste shortcut, before the clipboard may change again.
const pasteSettle = 150 * time.Millisecond

// restoreDelay is how long the clipboard keeps the last pasted text after
// a paste, in case another chunk follows, before it is put back.
const restoreDelay = 400 * time.Millisecond

// pasteText pastes text into the focused input. inputMu must be held.
func pasteText(text string) error {
	if !clip.pending {
		clip.saved = readClipboard()
		clip.pending = true
	}
	if clip.timer != nil {
		clip.timer.Stop()
	}
	// Concealed keeps the borrowed clipboard out of clipboard histories.
	err := mygo.Clipboard.Write(transfer.TextData(text), mygo.ClipboardOptions{Concealed: true})
	if err == nil {
		err = pressCombo(keyCombo{mods: shortcutMod, key: "v"})
		time.Sleep(pasteSettle)
	}
	clip.timer = time.AfterFunc(restoreDelay, func() {
		inputMu.Lock()
		defer inputMu.Unlock()
		restoreClipboard()
	})
	return err
}

// restoreClipboard puts back the clipboard a paste borrowed, if one has
// not been put back yet. inputMu must be held.
func restoreClipboard() {
	if !clip.pending {
		return
	}
	if clip.timer != nil {
		clip.timer.Stop()
		clip.timer = nil
	}
	clip.pending = false
	writeClipboard(clip.saved)
	clip.saved = transfer.Data{}
}

// readClipboard copies everything on the clipboard, in every format, or
// its text when the full read fails.
func readClipboard() transfer.Data {
	if d, err := mygo.Clipboard.Read(); err == nil {
		return d
	}
	if t := mygo.Clipboard.ReadText(); t != "" {
		return transfer.TextData(t)
	}
	return transfer.Data{}
}

// writeClipboard puts d back on the clipboard, clearing it for empty data.
func writeClipboard(d transfer.Data) {
	if len(d.Formats()) == 0 {
		mygo.Clipboard.Clear()
		return
	}
	if err := mygo.Clipboard.Write(d); err != nil {
		if t, err := d.Read(transfer.Text); err == nil {
			mygo.Clipboard.WriteText(string(t))
		}
	}
}
