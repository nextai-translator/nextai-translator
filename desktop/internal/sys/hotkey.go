// Package sys holds what the app needs from the operating system beyond
// MyGo: global hotkeys in the old app's format, the text selected in other
// apps, and the local IPC endpoint other tools post text to.
package sys

import (
	"strings"
	"sync"

	"github.com/egoist/mygo"
)

// keyNames maps react-hotkeys-hook's recorded key names, which the old
// settings stored, to MyGo accelerator keys.
var keyNames = map[string]string{
	"commandorcontrol": "CmdOrCtrl", "commandorctrl": "CmdOrCtrl", "cmdorcontrol": "CmdOrCtrl", "cmdorctrl": "CmdOrCtrl",
	"command": "Cmd", "cmd": "Cmd", "meta": "CmdOrCtrl", "super": "Super", "os": "Super",
	"control": "Ctrl", "ctrl": "Ctrl", "alt": "Alt", "option": "Alt", "shift": "Shift",
	"arrowup": "Up", "arrowdown": "Down", "arrowleft": "Left", "arrowright": "Right",
	"period": ".", "comma": ",", "slash": "/", "backslash": "\\", "backquote": "`",
	"bracketleft": "[", "bracketright": "]", "minus": "-", "equal": "=",
	"semicolon": ";", "quote": "'", "space": "Space", " ": "Space",
}

var modifierNames = map[string]bool{"CmdOrCtrl": true, "Cmd": true, "Super": true, "Ctrl": true, "Alt": true, "Shift": true}

// Accelerator turns a stored hotkey ("CommandOrControl+Shift+x",
// "ctrl-alt-a") into a MyGo accelerator. It reports false for an empty
// hotkey or one of modifiers only, which the old app refused too.
func Accelerator(hotkey string) (string, bool) {
	parts := strings.FieldsFunc(strings.ReplaceAll(hotkey, "-", "+"), func(r rune) bool { return r == '+' })
	var mods []string
	key := ""
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		name, ok := keyNames[strings.ToLower(p)]
		if !ok {
			name = p
			if len([]rune(p)) == 1 {
				name = strings.ToUpper(p)
			}
			if l := strings.ToLower(p); strings.HasPrefix(l, "key") && len(l) == 4 {
				name = strings.ToUpper(l[3:])
			} else if strings.HasPrefix(l, "digit") && len(l) == 6 {
				name = l[5:]
			}
		}
		if modifierNames[name] {
			mods = append(mods, name)
			continue
		}
		if key != "" {
			return "", false // two keys besides modifiers
		}
		key = name
	}
	if key == "" {
		return "", false
	}
	return strings.Join(append(mods, key), "+"), true
}

// Hotkeys keeps a set of named global hotkeys registered, swapping them as
// the settings change.
type Hotkeys struct {
	mu  sync.Mutex
	reg map[string]string // name → accelerator registered
}

// Set registers bindings (name → stored hotkey) and unregisters those no
// longer wanted. It returns the names whose hotkey could not be registered,
// as when another app holds it.
func (h *Hotkeys) Set(hotkeys map[string]string, actions map[string]func()) (failed map[string]error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	want := map[string]string{}
	for name, hk := range hotkeys {
		if acc, ok := Accelerator(hk); ok && actions[name] != nil {
			want[name] = acc
		}
	}
	for name, acc := range h.reg {
		if want[name] != acc {
			mygo.GlobalShortcut.Unregister(acc)
			delete(h.reg, name)
		}
	}
	if h.reg == nil {
		h.reg = map[string]string{}
	}
	for name, acc := range want {
		if _, ok := h.reg[name]; ok {
			continue
		}
		if err := mygo.GlobalShortcut.Register(acc, actions[name]); err != nil {
			if failed == nil {
				failed = map[string]error{}
			}
			failed[name] = err
			continue
		}
		h.reg[name] = acc
	}
	return failed
}
