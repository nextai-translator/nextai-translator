package gui

import (
	"strconv"
	"strings"

	"github.com/egoist/mygo/ui"
)

// The settings form, drawn as the Tauri app's Base Web form: a bold label,
// the control 8 below it, an optional caption, and 16 to the next item.

// caption is the gray text under a control, which may hold a link.
type caption struct {
	text       string
	link, url  string // a link after text
	after      string // text after the link
	spaceAfter bool
}

func plain(s string) *caption { return &caption{text: s} }

func linked(before, link, url, after string) *caption {
	return &caption{text: before, link: link, url: url, after: after}
}

func formItem(c *ui.Context, p palette, label string, required bool, cap *caption, control func()) {
	ui.Column(c).Margin(0, 0, 16, 0).Children(func() {
		ui.Row(c).Height(24.4).AlignItems(ui.Center).Gap(4).Children(func() {
			if required {
				ui.Text(c, "*").FontSize(14).FontWeight(500).TextColor(p.text)
			}
			ui.Text(c, label).FontSize(16.8).FontWeight(600).TextColor(p.text).SingleLine()
		})
		ui.Column(c).Margin(8, 0, 0, 0).Children(control)
		if cap != nil {
			captionText(c, p, cap, 8)
		}
	})
}

func captionText(c *ui.Context, p palette, cap *caption, top float32) {
	ui.RichText(c).Margin(top, 0, 0, 0).FontSize(12).LineHeight(20.0 / 12).TextColor(p.secondary).Wrap().Children(func() {
		if cap.link == "" {
			ui.Text(c, cap.text)
			return
		}
		if cap.text != "" {
			ui.Text(c, cap.text+" ")
		}
		ui.Link(c, cap.link, cap.url).Underline().Opacity(.8).TextColor(p.secondary)
		if cap.after != "" {
			ui.Text(c, " "+cap.after)
		}
	})
}

// fieldBox is the look of the selects and inputs: the control color at
// rest, the input color and a dark border with the focus.
func fieldBox(e ui.Element, p palette, focused bool) ui.Element {
	e.Radius(8).Border(2, p.control).Background(p.control)
	if focused {
		e.Background(p.input).BorderColor(p.focus)
	}
	return e
}

// formSelect is a full-width select of labels for *value; icon, when set,
// draws a value's icon before its label.
func formSelect(c *ui.Context, p palette, key string, value *string, values, labels []string, icon func(v string), chevron bool) bool {
	return formSelectLook(c, p, key, value, values, labels, icon, selectLook{height: 36, fontSize: 14, chevron: chevron})
}

// selectLook is how big a select is drawn: Base Web's compact selects are
// 36 tall with 14px text, its default ones 48 with 16px.
type selectLook struct {
	height, fontSize float32
	chevron          bool   // a chevron for the caret
	placeholder      string // shown while *value is ""
	clearable        bool   // a clear button while *value is set
}

func formSelectLook(c *ui.Context, p palette, key string, value *string, values, labels []string, icon func(v string), look selectLook) bool {
	cur := ""
	for i, v := range values {
		if v == *value {
			cur = labels[i]
		}
	}
	if cur == "" && *value != "" {
		cur = *value
	}
	lh := 20 / look.fontSize
	if look.fontSize >= 16 {
		lh = 24 / look.fontSize
	}
	w, _ := c.Size()
	sel := ui.SelectBase(c.Key(key), value)
	t := sel.Trigger.Row()
	fieldBox(t, p, t.Focused()).Height(look.height).Padding(0, 12).Gap(8).
		AlignItems(ui.Center).Cursor(ui.CursorPointer).TextColor(p.text)
	cleared := false
	t.Children(func() {
		if icon != nil && *value != "" {
			icon(*value)
		}
		if cur == "" && look.placeholder != "" {
			ui.Text(c, look.placeholder).FontSize(look.fontSize).LineHeight(lh).TextColor(p.tertiary).SingleLine().Grow(1)
		} else {
			ui.Text(c, cur).FontSize(look.fontSize).LineHeight(lh).SingleLine().Grow(1)
		}
		if look.clearable && *value != "" {
			b := ui.Row(c.Key("clear")).Size(16, 16).Center().Cursor(ui.CursorPointer).Label(T("Clear"))
			b.Children(func() { ui.Icon(c, riIoCloseCircle).Size(16, 16) })
			if b.Clicked() {
				*value, cleared = "", true
			}
		}
		if look.chevron {
			ui.Icon(c, iconDown).Size(16, 16)
		} else {
			ui.Icon(c, iconCaret).Size(16, 16)
		}
	})
	sel.Popup(func(panel ui.Element) {
		// Base Web's dark select menu sits a step lighter than its options.
		menuBg, hiBg, dim := p.menu, p.menuHover, p.secondary
		if p.dark {
			menuBg, hiBg, dim = ui.RGB(41, 41, 41), ui.RGB(31, 31, 31), ui.RGB(107, 107, 107)
		}
		panel.Background(menuBg).Radius(8).Clip().Shadow(0, 4, 16, 0, ui.RGBA(0, 0, 0, .16))
		ui.Scroll(c.Key("options")).MaxHeight(336).Width(max(w-50, 100)).Children(func() {
			ui.Column(c).Padding(8, 0).Children(func() {
				for i, v := range values {
					it := sel.Item(v).Padding(8, 16).Gap(8).AlignItems(ui.Center)
					col, weight := dim, 400
					if v == *value {
						col, weight = p.text, 600
					}
					if it.Highlighted() || v == *value {
						it.Background(hiBg)
					}
					it.TextColor(col)
					it.Children(func() {
						if icon != nil {
							icon(v)
						}
						ui.Text(c, labels[i]).FontSize(14).LineHeight(20.0 / 14).FontWeight(weight).TextColor(col).Wrap()
					})
				}
			})
		})
	})
	return t.Changed() || cleared
}

// formInput is a text input; a secret one hides its text behind dots until
// its eye is clicked, which reveal keeps.
func formInput(c *ui.Context, p palette, key string, value *string, secret bool, reveal *bool, placeholder string) {
	row := ui.Row(c.Key(key)).Height(36).AlignItems(ui.Center)
	fieldBox(row, p, row.FocusWithin()).Children(func() {
		in := ui.TextInputBase(c.Key("in"), value).Grow(1).Padding(6, 14).FontSize(14).LineHeight(20.0 / 14).LetterSpacing(-.14).
			TextColor(p.text).Placeholder(placeholder).PlaceholderColor(p.tertiary)
		if secret && (reveal == nil || !*reveal) {
			in.Password()
		}
		if secret && reveal != nil {
			icon := iconEye
			if *reveal {
				icon = iconEyeOff
			}
			b := ui.Row(c.Key("eye")).Size(40, 32).Margin(0, 12, 0, 0).Center().Cursor(ui.CursorPointer).TextColor(p.text).Label(T("Show"))
			b.Children(func() { ui.Icon(c, icon).Size(16, 16) })
			if b.Clicked() {
				*reveal = !*reveal
			}
		}
	})
}

// formPort is a number input as the browser draws one: its steppers in a
// small column at the right.
func formPort(c *ui.Context, p palette, key string, value *string) {
	row := ui.Row(c.Key(key)).Height(36).AlignItems(ui.Center)
	fieldBox(row, p, row.FocusWithin()).Children(func() {
		ui.TextInputBase(c.Key("in"), value).Grow(1).Padding(6, 14).FontSize(14).LineHeight(20.0 / 14).
			LetterSpacing(-.14).TextColor(p.text)
		ui.Column(c).Margin(0, 14, 0, 0).TextColor(p.text).Children(func() {
			for _, d := range []struct {
				icon *ui.SVG
				by   int
			}{{iconUp, 1}, {iconDown, -1}} {
				b := ui.Row(c.Key(d.by)).Size(15, 9).Center().Cursor(ui.CursorPointer)
				b.Children(func() { ui.Icon(c, d.icon).Size(10, 10) })
				if b.Clicked() {
					n, err := strconv.Atoi(strings.TrimSpace(*value))
					if err != nil {
						n = 0
					}
					*value = strconv.Itoa(min(max(n+d.by, 0), 65535))
				}
			}
		})
	})
}

// formTextArea is a few lines of text.
func formTextArea(c *ui.Context, p palette, key string, value *string) {
	formTextAreaHeight(c, p, key, value, 76)
}

func formTextAreaHeight(c *ui.Context, p palette, key string, value *string, h float32) {
	ta := ui.TextAreaBase(c.Key(key), value).Height(h).Padding(6, 14).FontSize(14).LineHeight(20.0 / 14).TextColor(p.text)
	fieldBox(ta, p, ta.Focused())
}

// formCheckbox is Base Web's check box: a 20px box with a thick border, a
// filled one with a check mark when checked.
func formCheckbox(c *ui.Context, p palette, key string, value *bool) bool {
	cb := ui.CheckboxBase(c.Key(key), value).Height(24).AlignItems(ui.Center).Cursor(ui.CursorPointer)
	cb.Children(func() {
		box := ui.Row(c).Size(20, 20).Margin(2).Center()
		if *value {
			box.Background(p.primaryBg).TextColor(p.primaryFg).Children(func() { ui.Icon(c, iconCheck).Size(14, 14) })
		} else {
			box.Border(3, p.tertiary).Background(p.bg)
		}
	})
	return cb.Changed()
}

// formNumber is a number input with steppers at its right.
func formNumber(c *ui.Context, p palette, key string, value *float64, lo, hi float64, text *string) {
	if *text == "" || parseNum(*text) != *value {
		*text = strconv.FormatFloat(*value, 'f', -1, 64)
	}
	row := ui.Row(c.Key(key)).Height(48).AlignItems(ui.Center)
	fieldBox(row, p, row.FocusWithin()).Children(func() {
		in := ui.TextInputBase(c.Key("in"), text).Grow(1).Padding(0, 14).FontSize(16).TextColor(p.text)
		if in.Changed() {
			if v := parseNum(*text); v >= lo && v <= hi {
				*value = v
			}
		}
		ui.Column(c).Margin(0, 14, 0, 0).Width(16).TextColor(p.text).Children(func() {
			for _, d := range []struct {
				icon *ui.SVG
				by   float64
			}{{iconUp, 1}, {iconDown, -1}} {
				b := ui.Row(c.Key(d.by)).Size(16, 14).Center().Cursor(ui.CursorPointer)
				b.Children(func() { ui.Icon(c, d.icon).Size(12, 12) })
				if b.Clicked() {
					*value = min(max(*value+d.by, lo), hi)
					*text = strconv.FormatFloat(*value, 'f', -1, 64)
				}
			}
		})
	})
}

func parseNum(s string) float64 {
	v, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
	if err != nil {
		return -1
	}
	return v
}

// hotkeyShown spells a hotkey as the Tauri recorder shows it.
func hotkeyShown(hk string) string {
	parts := strings.Split(hk, "+")
	for i, s := range parts {
		switch strings.ToLower(s) {
		case "commandorcontrol", "commandorctrl", "cmdorcontrol":
			parts[i] = "CmdOrCtrl"
		}
	}
	return strings.Join(parts, " + ")
}

var (
	// Base Web's Show and Hide, the password's eye.
	iconEye    = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M12 5C7 5 3.3 8.4 2 12c1.3 3.6 5 7 10 7s8.7-3.4 10-7c-1.3-3.6-5-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>`)
	iconEyeOff = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3.3 2.3 2 3.6l3.2 3.2C3.8 8.2 2.6 10 2 12c1.3 3.6 5 7 10 7 1.7 0 3.3-.4 4.7-1.1l3.7 3.7 1.3-1.3L3.3 2.3ZM12 16a4 4 0 0 1-3.9-4.9l1.6 1.6a2 2 0 0 0 1.6 1.6l1.6 1.6c-.3.1-.6.1-.9.1Zm0-11c-1.3 0-2.6.2-3.7.7l2.1 2.1A4 4 0 0 1 16.2 13l3.2 3.2C20.6 15 21.5 13.6 22 12c-1.3-3.6-5-7-10-7Z"/></svg>`)
	iconCheck  = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z"/></svg>`)
)
