//go:build !darwin && !windows

package sys

import (
	"errors"
	"os"
	"os/exec"
	"strings"
)

// Trusted is always true: the primary selection needs no permission.
func Trusted() bool { return true }

// AccessibilitySettingsURL is empty: there is no such setting here.
const AccessibilitySettingsURL = ""

// SelectedText returns the primary selection, which X11 and most Wayland
// desktops keep for whatever text is selected, read with wl-paste, xclip
// or xsel, whichever is installed.
func SelectedText() (string, error) {
	var cmds [][]string
	if os.Getenv("WAYLAND_DISPLAY") != "" {
		cmds = append(cmds, []string{"wl-paste", "--primary", "--no-newline"})
	}
	cmds = append(cmds, []string{"xclip", "-o", "-selection", "primary"}, []string{"xsel", "-o", "-p"})
	for _, c := range cmds {
		if _, err := exec.LookPath(c[0]); err != nil {
			continue
		}
		out, err := exec.Command(c[0], c[1:]...).Output()
		if err == nil {
			return strings.TrimRight(string(out), "\x00"), nil
		}
	}
	return "", errors.New("install wl-clipboard, xclip or xsel to translate selected text")
}
