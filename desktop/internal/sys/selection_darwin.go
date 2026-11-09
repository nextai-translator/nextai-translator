package sys

import (
	"sync"

	"github.com/ebitengine/purego"
)

var cg struct {
	once      sync.Once
	err       error
	keyEvent  func(source uintptr, key uint16, down bool) uintptr
	setFlags  func(ev uintptr, flags uint64)
	post      func(tap uint32, ev uintptr)
	release   func(ref uintptr)
	axTrusted func() bool
}

func loadCG() error {
	cg.once.Do(func() {
		as, err := purego.Dlopen("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices", purego.RTLD_LAZY|purego.RTLD_GLOBAL)
		if err != nil {
			cg.err = err
			return
		}
		cf, err := purego.Dlopen("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation", purego.RTLD_LAZY|purego.RTLD_GLOBAL)
		if err != nil {
			cg.err = err
			return
		}
		purego.RegisterLibFunc(&cg.keyEvent, as, "CGEventCreateKeyboardEvent")
		purego.RegisterLibFunc(&cg.setFlags, as, "CGEventSetFlags")
		purego.RegisterLibFunc(&cg.post, as, "CGEventPost")
		purego.RegisterLibFunc(&cg.axTrusted, as, "AXIsProcessTrusted")
		purego.RegisterLibFunc(&cg.release, cf, "CFRelease")
	})
	return cg.err
}

// Trusted reports whether the app has Accessibility access, without which
// macOS drops the key events that copy the selection.
func Trusted() bool {
	return loadCG() == nil && cg.axTrusted()
}

// AccessibilitySettingsURL opens the pane that grants it.
const AccessibilitySettingsURL = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"

// SelectedText returns the text selected in the frontmost app.
func SelectedText() (string, error) {
	if err := loadCG(); err != nil {
		return "", err
	}
	if !cg.axTrusted() {
		return "", ErrNoPermission
	}
	return copyBySimulation(func() error {
		const keyC, flagCmd, hidTap = 8, 0x100000, 0
		for _, down := range []bool{true, false} {
			ev := cg.keyEvent(0, keyC, down)
			if ev == 0 {
				return ErrNoPermission
			}
			// Only Command: the hotkey's own modifiers may still be held.
			cg.setFlags(ev, flagCmd)
			cg.post(hidTap, ev)
			cg.release(ev)
		}
		return nil
	})
}
