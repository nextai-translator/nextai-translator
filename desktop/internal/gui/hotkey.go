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

// hotkeyRecorder is a field that takes the next key press with modifiers as
// the hotkey; Backspace or its clear button clears it. It writes *value
// between frames, so value must outlive the frame. It reports whether it is
// recording, which is while it has the focus.
func hotkeyRecorder(c *ui.Context, p palette, key string, value *string) bool {
	bg := ui.RGB(245, 245, 245)
	if p.dark {
		bg = ui.RGB(34, 34, 34)
	}
	box := ui.Row(c.Key(key)).Focusable().Width(330).Height(36).Padding(0, 12, 0, 15).Radius(8).
		Border(2, bg).Background(bg).AlignItems(ui.Center).Cursor(ui.CursorPointer).TextColor(p.text).
		Label(T("Hotkey"))
	focused := box.Focused()
	if focused {
		box.BorderColor(p.focus)
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
			ui.Text(c, T("Please press the hotkey you want to set.")).FontSize(14).TextColor(p.tertiary).SingleLine().Grow(1)
		default:
			ui.Text(c, hotkeyShown(*value)).FontSize(14).SingleLine().Grow(1)
		}
		if *value != "" {
			b := ui.Row(c.Key("clear")).Size(20, 20).Center().Cursor(ui.CursorPointer).Label(T("Clear"))
			b.Children(func() { ui.Icon(c, riIoCloseCircle).Size(16, 16) })
			if b.Clicked() {
				*value = ""
			}
		}
	})
	return focused
}
