//go:build !darwin && !windows

package sys

import (
	"errors"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

// keysyms are the X keysym names of the keys keyCombo names, which both
// xdotool and wtype take.
var keysyms = map[string]string{
	"enter": "Return", "tab": "Tab", "space": "space", "backspace": "BackSpace",
	"escape": "Escape", "delete": "Delete", "insert": "Insert", "home": "Home", "end": "End",
	"pageup": "Prior", "pagedown": "Next", "left": "Left", "right": "Right", "up": "Up", "down": "Down",
	".": "period", ",": "comma", "/": "slash", "\\": "backslash", "`": "grave",
	"[": "bracketleft", "]": "bracketright", "-": "minus", "=": "equal", ";": "semicolon", "'": "apostrophe",
}

func keysym(name string) string {
	if s, ok := keysyms[name]; ok {
		return s
	}
	if len(name) >= 2 && name[0] == 'f' {
		return strings.ToUpper(name)
	}
	return name
}

// Modifier names, in the order they go down.
var linuxMods = []struct {
	mod  modMask
	name string
}{{modCtrl, "ctrl"}, {modAlt, "alt"}, {modShift, "shift"}, {modMeta, "super"}}

// keyTool returns the key simulator to use: wtype on Wayland, xdotool on
// X11 (which reaches only X11 and XWayland apps on Wayland).
func keyTool() string {
	if os.Getenv("WAYLAND_DISPLAY") != "" {
		if _, err := exec.LookPath("wtype"); err == nil {
			return "wtype"
		}
	}
	if os.Getenv("DISPLAY") != "" {
		if _, err := exec.LookPath("xdotool"); err == nil {
			return "xdotool"
		}
	}
	return ""
}

// comboArgs returns the command that presses c.
func comboArgs(tool string, c keyCombo) []string {
	switch tool {
	case "xdotool":
		var parts []string
		for _, m := range linuxMods {
			if c.mods&m.mod != 0 {
				parts = append(parts, m.name)
			}
		}
		// --clearmodifiers lets go of the hotkey's modifiers the user still
		// holds, and presses them again afterwards.
		return []string{"xdotool", "key", "--clearmodifiers", strings.Join(append(parts, keysym(c.key)), "+")}
	case "wtype":
		args := []string{"wtype"}
		for _, m := range linuxMods {
			if c.mods&m.mod != 0 {
				name := m.name
				if name == "super" {
					name = "logo"
				}
				args = append(args, "-M", name)
			}
		}
		args = append(args, "-k", keysym(c.key))
		for i := len(linuxMods) - 1; i >= 0; i-- {
			if m := linuxMods[i]; c.mods&m.mod != 0 {
				name := m.name
				if name == "super" {
					name = "logo"
				}
				args = append(args, "-m", name)
			}
		}
		return args
	}
	return nil
}

func pressCombo(c keyCombo) error {
	args := comboArgs(keyTool(), c)
	if args == nil {
		return ErrInputUnsupported
	}
	return exec.Command(args[0], args[1:]...).Run()
}

func selectAll() error { return pressCombo(keyCombo{mods: modCtrl, key: "a"}) }

// Linux has no accessibility API this package reads: AT-SPI would need
// D-Bus.
func axFocusedText() (string, bool)  { return "", false }
func axSelectedText() (string, bool) { return "", false }

func caretRect() (x, y, w, h float64, ok bool) { return 0, 0, 0, 0, false }

// foreground is the X11 window RememberForeground remembered.
var foreground struct {
	sync.Mutex
	window string
}

func rememberForeground() {
	if os.Getenv("DISPLAY") == "" {
		return
	}
	if _, err := exec.LookPath("xdotool"); err != nil {
		return
	}
	out, err := exec.Command("xdotool", "getactivewindow").Output()
	if err != nil {
		return
	}
	id := strings.TrimSpace(string(out))
	if pid, err := exec.Command("xdotool", "getwindowpid", id).Output(); err == nil {
		if n, _ := strconv.Atoi(strings.TrimSpace(string(pid))); n == os.Getpid() {
			return
		}
	}
	foreground.Lock()
	foreground.window = id
	foreground.Unlock()
}

func restoreForeground() error {
	foreground.Lock()
	id := foreground.window
	foreground.Unlock()
	if id == "" {
		return errors.New("no previous window recorded")
	}
	if err := exec.Command("xdotool", "windowactivate", "--sync", id).Run(); err != nil {
		return err
	}
	time.Sleep(50 * time.Millisecond)
	return nil
}
