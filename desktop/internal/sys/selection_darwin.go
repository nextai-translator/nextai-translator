package sys

import (
	"sync"
	"unsafe"

	"github.com/ebitengine/purego"
)

// cg holds the CoreGraphics, CoreFoundation, Accessibility (HIServices)
// and Text Input Sources (HIToolbox) functions the app calls, loaded once.
var cg struct {
	once     sync.Once
	err      error
	keyEvent func(source uintptr, key uint16, down bool) uintptr
	setFlags func(ev uintptr, flags uint64)
	post     func(tap uint32, ev uintptr)

	release      func(ref uintptr)
	retain       func(ref uintptr) uintptr
	typeID       func(ref uintptr) uintptr
	stringTypeID func() uintptr
	newString    func(alloc uintptr, s string, encoding uint32) uintptr
	stringLen    func(s uintptr) int
	stringMax    func(length int, encoding uint32) int
	stringBytes  func(s uintptr, buf *byte, size int, encoding uint32) bool
	dataBytes    func(data uintptr) uintptr
	booleanTrue  uintptr

	axTrusted       func() bool
	axSystemWide    func() uintptr
	axApplication   func(pid int32) uintptr
	axCopy          func(el, attr uintptr, out *uintptr) int32
	axCopyParam     func(el, attr, param uintptr, out *uintptr) int32
	axSet           func(el, attr, value uintptr) int32
	axPerform       func(el, action uintptr) int32
	axPid           func(el uintptr, pid *int32) int32
	axTimeout       func(el uintptr, seconds float32) int32
	axValueCreate   func(typ uint32, ptr unsafe.Pointer) uintptr
	axValueGet      func(v uintptr, typ uint32, ptr unsafe.Pointer) bool
	axValueTypeID   func() uintptr
	axElementTypeID func() uintptr

	// Keyboard layouts, for the key that types a character; nil when
	// HIToolbox did not load, and the US layout's keys are used.
	tisLayout     func() uintptr
	tisProperty   func(source, key uintptr) uintptr
	tisLayoutData uintptr // kTISPropertyUnicodeKeyLayoutData
	kbdType       func() uint8
	keyTranslate  func(layout uintptr, code, action uint16, modifiers, kbdType, options uint32, deadKeys *uint32, max uint64, length *uint64, chars *uint16) int32
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

		purego.RegisterLibFunc(&cg.release, cf, "CFRelease")
		purego.RegisterLibFunc(&cg.retain, cf, "CFRetain")
		purego.RegisterLibFunc(&cg.typeID, cf, "CFGetTypeID")
		purego.RegisterLibFunc(&cg.stringTypeID, cf, "CFStringGetTypeID")
		purego.RegisterLibFunc(&cg.newString, cf, "CFStringCreateWithCString")
		purego.RegisterLibFunc(&cg.stringLen, cf, "CFStringGetLength")
		purego.RegisterLibFunc(&cg.stringMax, cf, "CFStringGetMaximumSizeForEncoding")
		purego.RegisterLibFunc(&cg.stringBytes, cf, "CFStringGetCString")
		purego.RegisterLibFunc(&cg.dataBytes, cf, "CFDataGetBytePtr")
		if sym, err := purego.Dlsym(cf, "kCFBooleanTrue"); err == nil {
			cg.booleanTrue = **(**uintptr)(unsafe.Pointer(&sym))
		}

		purego.RegisterLibFunc(&cg.axTrusted, as, "AXIsProcessTrusted")
		purego.RegisterLibFunc(&cg.axSystemWide, as, "AXUIElementCreateSystemWide")
		purego.RegisterLibFunc(&cg.axApplication, as, "AXUIElementCreateApplication")
		purego.RegisterLibFunc(&cg.axCopy, as, "AXUIElementCopyAttributeValue")
		purego.RegisterLibFunc(&cg.axCopyParam, as, "AXUIElementCopyParameterizedAttributeValue")
		purego.RegisterLibFunc(&cg.axSet, as, "AXUIElementSetAttributeValue")
		purego.RegisterLibFunc(&cg.axPerform, as, "AXUIElementPerformAction")
		purego.RegisterLibFunc(&cg.axPid, as, "AXUIElementGetPid")
		purego.RegisterLibFunc(&cg.axTimeout, as, "AXUIElementSetMessagingTimeout")
		purego.RegisterLibFunc(&cg.axValueCreate, as, "AXValueCreate")
		purego.RegisterLibFunc(&cg.axValueGet, as, "AXValueGetValue")
		purego.RegisterLibFunc(&cg.axValueTypeID, as, "AXValueGetTypeID")
		purego.RegisterLibFunc(&cg.axElementTypeID, as, "AXUIElementGetTypeID")

		if hit, err := purego.Dlopen("/System/Library/Frameworks/Carbon.framework/Carbon", purego.RTLD_LAZY|purego.RTLD_GLOBAL); err == nil {
			if sym, err := purego.Dlsym(hit, "kTISPropertyUnicodeKeyLayoutData"); err == nil {
				cg.tisLayoutData = **(**uintptr)(unsafe.Pointer(&sym))
				purego.RegisterLibFunc(&cg.tisLayout, hit, "TISCopyCurrentKeyboardLayoutInputSource")
				purego.RegisterLibFunc(&cg.tisProperty, hit, "TISGetInputSourceProperty")
				purego.RegisterLibFunc(&cg.kbdType, hit, "LMGetKbdType")
				purego.RegisterLibFunc(&cg.keyTranslate, hit, "UCKeyTranslate")
			}
		}
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
	inputMu.Lock()
	defer inputMu.Unlock()
	return copyBySimulation(func() error { return pressCombo(keyCombo{mods: modMeta, key: "c"}) })
}
