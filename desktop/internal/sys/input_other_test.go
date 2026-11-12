//go:build !darwin && !windows

package sys

import (
	"slices"
	"testing"
)

func TestComboArgs(t *testing.T) {
	c := keyCombo{modShift | modCtrl, "enter"}
	if got, want := comboArgs("xdotool", c), []string{"xdotool", "key", "--clearmodifiers", "ctrl+shift+Return"}; !slices.Equal(got, want) {
		t.Errorf("xdotool: %q; want %q", got, want)
	}
	if got, want := comboArgs("wtype", c), []string{"wtype", "-M", "ctrl", "-M", "shift", "-k", "Return", "-m", "shift", "-m", "ctrl"}; !slices.Equal(got, want) {
		t.Errorf("wtype: %q; want %q", got, want)
	}
	if got := comboArgs("", c); got != nil {
		t.Errorf("no tool: %q", got)
	}
	if got := comboArgs("xdotool", keyCombo{modMeta, "."}); got[3] != "super+period" {
		t.Errorf("xdotool: %q", got)
	}
}
