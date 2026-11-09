package sys

import "syscall"

var (
	user32          = syscall.NewLazyDLL("user32.dll")
	procKeybdEvent  = user32.NewProc("keybd_event")
	procGetAsyncKey = user32.NewProc("GetAsyncKeyState")
)

// Trusted is always true: Windows asks no permission to send keys.
func Trusted() bool { return true }

// AccessibilitySettingsURL is empty: there is no such setting on Windows.
const AccessibilitySettingsURL = ""

const keyUp = 2

func key(vk uintptr, flags uintptr) { procKeybdEvent.Call(vk, 0, flags, 0) }

// SelectedText returns the text selected in the foreground app.
func SelectedText() (string, error) {
	return copyBySimulation(func() error {
		// Let go of the hotkey's modifiers, or the app sees Ctrl+Shift+C.
		for _, vk := range []uintptr{0x10, 0x12, 0x5B, 0x5C} { // Shift, Alt, LWin, RWin
			if r, _, _ := procGetAsyncKey.Call(vk); r&0x8000 != 0 {
				key(vk, keyUp)
			}
		}
		key(0x11, 0)     // Ctrl
		key(0x43, 0)     // C
		key(0x43, keyUp) //
		key(0x11, keyUp)
		return nil
	})
}
