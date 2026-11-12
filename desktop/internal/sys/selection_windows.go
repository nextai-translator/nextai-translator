package sys

import "syscall"

var (
	user32          = syscall.NewLazyDLL("user32.dll")
	procKeybdEvent  = user32.NewProc("keybd_event")
	procGetAsyncKey = user32.NewProc("GetAsyncKeyState")
	procMapVK       = user32.NewProc("MapVirtualKeyW")
)

// Trusted is always true: Windows asks no permission to send keys.
func Trusted() bool { return true }

// AccessibilitySettingsURL is empty: there is no such setting on Windows.
const AccessibilitySettingsURL = ""

const (
	keyExtended = 1
	keyUp       = 2
)

// key sends a key event for the virtual key vk, with its scan code, which
// some apps read instead.
func key(vk uintptr, flags uintptr) {
	scan, _, _ := procMapVK.Call(vk, 0) // MAPVK_VK_TO_VSC
	procKeybdEvent.Call(vk, scan, flags, 0)
}

// SelectedText returns the text selected in the foreground app.
func SelectedText() (string, error) {
	inputMu.Lock()
	defer inputMu.Unlock()
	return copyBySimulation(func() error { return pressCombo(keyCombo{mods: modCtrl, key: "c"}) })
}
