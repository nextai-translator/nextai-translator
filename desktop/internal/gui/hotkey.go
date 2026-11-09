package gui

import (
	"runtime"
	"strings"

	"github.com/egoist/mygo/ui"
)

// keyName is how the old settings spelled a key; "" for keys a hotkey
// cannot end with.
func keyName(k ui.Key) string {
	switch {
	case k >= ui.KeyA && k <= ui.KeyZ:
		return string(rune('A' + int(k-ui.KeyA)))
	case k >= ui.Key0 && k <= ui.Key9:
		return string(rune('0' + int(k-ui.Key0)))
	case k >= ui.KeyF1 && k <= ui.KeyF12:
		return "F" + itoa(int64(k-ui.KeyF1+1))
	}
	return map[ui.Key]string{
		ui.KeySpace: "Space", ui.KeyEnter: "Enter", ui.KeyTab: "Tab", ui.KeyBackspace: "Backspace",
		ui.KeyDelete: "Delete", ui.KeyInsert: "Insert", ui.KeyHome: "Home", ui.KeyEnd: "End",
		ui.KeyPageUp: "PageUp", ui.KeyPageDown: "PageDown", ui.KeyUp: "Up", ui.KeyDown: "Down",
		ui.KeyLeft: "Left", ui.KeyRight: "Right", ui.KeyMinus: "-", ui.KeyEqual: "=",
		ui.KeyComma: ",", ui.KeyPeriod: ".", ui.KeySlash: "/", ui.KeySemicolon: ";",
		ui.KeyQuote: "'", ui.KeyBracketLeft: "[", ui.KeyBracketRight: "]",
		ui.KeyBackslash: "\\", ui.KeyBackquote: "`",
	}[k]
}

// hotkeyString spells a key press the way the old settings stored it.
func hotkeyString(mods ui.Modifiers, k ui.Key) string {
	name := keyName(k)
	if name == "" || mods == 0 && !(k >= ui.KeyF1 && k <= ui.KeyF12) {
		return ""
	}
	var parts []string
	if mods&ui.Cmd != 0 {
		parts = append(parts, "CommandOrControl")
	}
	if runtime.GOOS == "darwin" && mods&ui.Ctrl != 0 {
		parts = append(parts, "Control")
	}
	if runtime.GOOS != "darwin" && mods&ui.Super != 0 {
		parts = append(parts, "Super")
	}
	if mods&ui.Alt != 0 {
		parts = append(parts, "Alt")
	}
	if mods&ui.Shift != 0 {
		parts = append(parts, "Shift")
	}
	return strings.Join(append(parts, name), "+")
}

// hotkeyLabel shows a stored hotkey with the platform's symbols.
func hotkeyLabel(hk string) string {
	if hk == "" {
		return ""
	}
	parts := strings.FieldsFunc(hk, func(r rune) bool { return r == '+' })
	mac := runtime.GOOS == "darwin"
	for i, p := range parts {
		switch strings.ToLower(p) {
		case "commandorcontrol", "commandorctrl", "cmdorctrl", "cmdorcontrol", "meta":
			parts[i] = map[bool]string{true: "⌘", false: "Ctrl"}[mac]
		case "command", "cmd":
			parts[i] = "⌘"
		case "control", "ctrl":
			parts[i] = map[bool]string{true: "⌃", false: "Ctrl"}[mac]
		case "alt", "option":
			parts[i] = map[bool]string{true: "⌥", false: "Alt"}[mac]
		case "shift":
			parts[i] = map[bool]string{true: "⇧", false: "Shift"}[mac]
		default:
			if len(p) == 1 {
				parts[i] = strings.ToUpper(p)
			}
		}
	}
	if mac {
		return strings.Join(parts, "")
	}
	return strings.Join(parts, "+")
}

// hotkeyRecorder is a field that takes the next key press with modifiers as
// the hotkey; Backspace clears it. It writes *value between frames, so
// value must outlive the frame.
func hotkeyRecorder(c *ui.Context, key string, value *string) {
	th := c.Theme()
	box := ui.Row(c.Key(key)).Focusable().Padding(6, 10).Radius(th.Radius).MinHeight(30).
		Border(1, th.Border).Background(th.Surface).AlignItems(ui.Center).Cursor(ui.CursorPointer)
	focused := box.Focused()
	if focused {
		box.Border(1, th.Accent)
	}
	box.HandleInput(func(ev ui.InputEvent) bool {
		if ev.Kind != ui.InputKeyDown {
			return false
		}
		if ev.Key == ui.KeyTab && ev.Mods&^ui.Shift == 0 {
			return false
		}
		if ev.Mods == 0 && (ev.Key == ui.KeyBackspace || ev.Key == ui.KeyDelete) {
			*value = ""
			c.Invalidate()
			return true
		}
		if hk := hotkeyString(ev.Mods, ev.Key); hk != "" {
			*value = hk
			c.Invalidate()
		}
		return true
	}).Children(func() {
		switch {
		case focused && *value == "":
			ui.Text(c, T("Please press the hotkey you want to set.")).TextColor(th.TextMuted)
		case *value == "":
			ui.Text(c, T("Click above to set hotkeys.")).TextColor(th.TextMuted)
		default:
			ui.Text(c, hotkeyLabel(*value))
		}
	})
}
