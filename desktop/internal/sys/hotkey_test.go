package sys

import "testing"

func TestAccelerator(t *testing.T) {
	for in, want := range map[string]string{
		"CommandOrControl+Shift+x": "CmdOrCtrl+Shift+X",
		"ctrl-alt-a":               "Ctrl+Alt+A",
		"alt+arrowup":              "Alt+Up",
		"meta+period":              "CmdOrCtrl+.",
		"Option+Space":             "Alt+Space",
		"shift+KeyD":               "Shift+D",
		"F2":                       "F2",
	} {
		if got, ok := Accelerator(in); !ok || got != want {
			t.Errorf("Accelerator(%q) = %q %v, want %q", in, got, ok, want)
		}
	}
	for _, in := range []string{"", "shift", "CommandOrControl+Shift", "a+b"} {
		if got, ok := Accelerator(in); ok {
			t.Errorf("Accelerator(%q) = %q, want refused", in, got)
		}
	}
}
