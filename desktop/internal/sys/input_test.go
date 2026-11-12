package sys

import (
	"slices"
	"testing"
)

func TestParseCombo(t *testing.T) {
	for _, tc := range []struct {
		in, goos string
		want     keyCombo
	}{
		{"shift+enter", "windows", keyCombo{modShift, "enter"}},
		{"Shift + Enter", "darwin", keyCombo{modShift, "enter"}},
		{"ctrl+enter", "linux", keyCombo{modCtrl, "enter"}},
		{"alt+Return", "windows", keyCombo{modAlt, "enter"}},
		{"CommandOrControl+v", "darwin", keyCombo{modMeta, "v"}},
		{"CommandOrControl+v", "windows", keyCombo{modCtrl, "v"}},
		{"meta+shift+KeyA", "darwin", keyCombo{modMeta | modShift, "a"}},
		{"ctrl-alt-Digit1", "linux", keyCombo{modCtrl | modAlt, "1"}},
		{"option+arrowleft", "darwin", keyCombo{modAlt, "left"}},
		{"enter", "windows", keyCombo{0, "enter"}},
		{"ctrl+period", "windows", keyCombo{modCtrl, "."}},
		{"F5", "windows", keyCombo{0, "f5"}},
		{"shift+F12", "darwin", keyCombo{modShift, "f12"}},
	} {
		got, err := parseCombo(tc.in, tc.goos)
		if err != nil || got != tc.want {
			t.Errorf("parseCombo(%q, %s) = %+v, %v; want %+v", tc.in, tc.goos, got, err, tc.want)
		}
	}
	for _, bad := range []string{"", "shift", "ctrl+alt", "a+b", "shift+hyper"} {
		if _, err := parseCombo(bad, "linux"); err == nil {
			t.Errorf("parseCombo(%q) accepted", bad)
		}
	}
	// A lone "f" is the F key, not a function key.
	if c, err := parseCombo("f", "linux"); err != nil || c.key != "f" {
		t.Errorf(`parseCombo("f") = %+v, %v`, c, err)
	}
}

func TestTypeSegments(t *testing.T) {
	for _, tc := range []struct {
		in    string
		split bool
		want  []string
	}{
		{"one\r\ntwo\nthree", true, []string{"one", "two", "three"}},
		{"one\r\ntwo", false, []string{"one\ntwo"}},
		{"\nlead", true, []string{"", "lead"}},
		{"trail\n", true, []string{"trail", ""}},
		{"a\n\nb", true, []string{"a", "", "b"}},
		{"plain", true, []string{"plain"}},
	} {
		if got := typeSegments(tc.in, tc.split); !slices.Equal(got, tc.want) {
			t.Errorf("typeSegments(%q, %v) = %q; want %q", tc.in, tc.split, got, tc.want)
		}
	}
}

func TestNormalizeNewlines(t *testing.T) {
	if got := normalizeNewlines("a\r\nb\rc\nd"); got != "a\nb\nc\nd" {
		t.Errorf("normalizeNewlines = %q", got)
	}
}

func TestPixelRectToDIP(t *testing.T) {
	type rect struct{ x, y, w, h float64 }
	primary150 := pixelDisplay{0, 0, 3840, 2160, 144}
	right100 := pixelDisplay{3840, 0, 1920, 1080, 96}
	left200 := pixelDisplay{-3840, 0, 3840, 2160, 192}
	for _, tc := range []struct {
		name       string
		displays   []pixelDisplay
		x, y, w, h int
		want       rect
	}{
		{"no displays", nil, 10, 20, 30, 40, rect{10, 20, 30, 40}},
		{"one display at 150%", []pixelDisplay{primary150}, 300, 150, 3, 30, rect{200, 100, 2, 20}},
		// The right display starts at 3840 px × 96/96 (the smallest DPI)
		// = 3840 DIPs and goes on at 100%.
		{"second display at 100%", []pixelDisplay{primary150, right100}, 3940, 100, 10, 20, rect{3940, 100, 10, 20}},
		// The primary display keeps its DIPs whatever the others' scales.
		{"primary beside a 100% display", []pixelDisplay{primary150, right100}, 150, 150, 15, 15, rect{100, 100, 10, 10}},
		// Left of the primary at 200%, with 144 the smallest DPI: its origin
		// is -3840 × 96/144 = -2560 DIPs, then 200%.
		{"display left at 200%", []pixelDisplay{primary150, left200}, -3840 + 400, 200, 20, 40, rect{-2560 + 200, 100, 10, 20}},
		// Off every display: the nearest one's scale.
		{"in a gap", []pixelDisplay{primary150}, 3840 + 30, 0, 3, 3, rect{2580, 0, 2, 2}},
	} {
		x, y, w, h := pixelRectToDIP(tc.displays, tc.x, tc.y, tc.w, tc.h)
		if got := (rect{x, y, w, h}); got != tc.want {
			t.Errorf("%s: pixelRectToDIP = %+v; want %+v", tc.name, got, tc.want)
		}
	}
}
