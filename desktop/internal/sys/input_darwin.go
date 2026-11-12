package sys

import (
	"errors"
	"os"
	"runtime"
	"sync"
	"time"
	"unsafe"

	"github.com/ebitengine/purego"
	"github.com/ebitengine/purego/objc"
	"github.com/egoist/mygo"
)

// Key codes of the keys that are the same in every layout.
var macKeys = map[string]uint16{
	"enter": 36, "tab": 48, "space": 49, "backspace": 51, "escape": 53,
	"delete": 117, "insert": 114, "home": 115, "end": 119, "pageup": 116, "pagedown": 121,
	"left": 123, "right": 124, "down": 125, "up": 126,
	"f1": 122, "f2": 120, "f3": 99, "f4": 118, "f5": 96, "f6": 97, "f7": 98, "f8": 100,
	"f9": 101, "f10": 109, "f11": 103, "f12": 111, "f13": 105, "f14": 107, "f15": 113,
	"f16": 106, "f17": 64, "f18": 79, "f19": 80, "f20": 90,
}

// ansiKeys are the key codes of the characters on the US (ANSI) layout,
// used when the current layout has no key for a character, as Russian has
// none for "a": macOS then matches shortcuts by these keys.
var ansiKeys = map[rune]uint16{
	'a': 0, 's': 1, 'd': 2, 'f': 3, 'h': 4, 'g': 5, 'z': 6, 'x': 7, 'c': 8, 'v': 9,
	'b': 11, 'q': 12, 'w': 13, 'e': 14, 'r': 15, 'y': 16, 't': 17, '1': 18, '2': 19,
	'3': 20, '4': 21, '6': 22, '5': 23, '=': 24, '9': 25, '7': 26, '-': 27, '8': 28,
	'0': 29, ']': 30, 'o': 31, 'u': 32, '[': 33, 'i': 34, 'p': 35, 'l': 37, 'j': 38,
	'\'': 39, 'k': 40, ';': 41, '\\': 42, ',': 43, '/': 44, 'n': 45, 'm': 46, '.': 47,
	'`': 50,
}

// Modifier keys and their event flags, in the order they go down.
var macMods = []struct {
	mod  modMask
	code uint16
	flag uint64
}{
	{modCtrl, 59, 0x40000},
	{modAlt, 58, 0x80000},
	{modShift, 56, 0x20000},
	{modMeta, 55, 0x100000},
}

// keyCodeFor returns the key that types ch in the current keyboard layout,
// so that Cmd+A is Cmd+A on AZERTY too, where the US layout's A key is Q,
// or the US layout's key when the layout has none.
func keyCodeFor(ch rune) (uint16, bool) {
	if cg.tisLayout != nil {
		var code uint16
		found := false
		// Text Input Sources must be read on the main thread.
		mygo.RunOnMain(func() {
			src := cg.tisLayout()
			if src == 0 {
				return
			}
			defer cg.release(src)
			data := cg.tisProperty(src, cg.tisLayoutData)
			if data == 0 {
				return
			}
			layout := cg.dataBytes(data)
			if layout == 0 {
				return
			}
			kbd := uint32(cg.kbdType())
			for c := uint16(0); c < 128; c++ {
				var dead uint32
				var n uint64
				var buf [4]uint16
				// kUCKeyActionDisplay, kUCKeyTranslateNoDeadKeysMask.
				if cg.keyTranslate(layout, c, 3, 0, kbd, 1, &dead, 4, &n, &buf[0]) == 0 && n == 1 && rune(buf[0]) == ch {
					code, found = c, true
					return
				}
			}
		})
		if found {
			return code, true
		}
	}
	code, ok := ansiKeys[ch]
	return code, ok
}

// pressCombo presses c. It posts the modifiers' own key events, and sets
// each event's flags to exactly c's modifiers, so that the modifiers the
// user still holds from the hotkey do not join in.
func pressCombo(c keyCombo) error {
	if err := loadCG(); err != nil {
		return err
	}
	if !cg.axTrusted() {
		return ErrNoPermission
	}
	code, ok := macKeys[c.key]
	if !ok {
		r := []rune(c.key)
		if len(r) != 1 {
			return errors.New("no key for " + c.key)
		}
		if code, ok = keyCodeFor(r[0]); !ok {
			return errors.New("no key for " + c.key)
		}
	}
	const hidTap = 0
	send := func(code uint16, down bool, flags uint64) error {
		ev := cg.keyEvent(0, code, down)
		if ev == 0 {
			return ErrNoPermission
		}
		cg.setFlags(ev, flags)
		cg.post(hidTap, ev)
		cg.release(ev)
		return nil
	}
	var flags uint64
	var held []int
	for i, m := range macMods {
		if c.mods&m.mod != 0 {
			flags |= m.flag
			if err := send(m.code, true, flags); err != nil {
				return err
			}
			held = append(held, i)
		}
	}
	err := send(code, true, flags)
	if err == nil {
		err = send(code, false, flags)
	}
	for i := len(held) - 1; i >= 0; i-- {
		m := macMods[held[i]]
		flags &^= m.flag
		_ = send(m.code, false, flags)
	}
	return err
}

// cfNames caches the CFStrings of attribute names, kept for good.
var cfNames sync.Map // string → uintptr

func cfName(s string) uintptr {
	if v, ok := cfNames.Load(s); ok {
		return v.(uintptr)
	}
	ref := cg.newString(0, s, 0x08000100) // kCFStringEncodingUTF8
	if v, loaded := cfNames.LoadOrStore(s, ref); loaded {
		cg.release(ref)
		return v.(uintptr)
	}
	return ref
}

// goString returns a CFString's text, and false for anything else.
func goString(ref uintptr) (string, bool) {
	if ref == 0 || cg.typeID(ref) != cg.stringTypeID() {
		return "", false
	}
	size := cg.stringMax(cg.stringLen(ref), 0x08000100) + 1
	buf := make([]byte, size)
	if !cg.stringBytes(ref, &buf[0], size, 0x08000100) {
		return "", false
	}
	for i, b := range buf {
		if b == 0 {
			return string(buf[:i]), true
		}
	}
	return string(buf), true
}

// axAttr copies an attribute of el; the caller releases it.
func axAttr(el uintptr, attr string) (uintptr, bool) {
	var v uintptr
	if cg.axCopy(el, cfName(attr), &v) != 0 || v == 0 {
		return 0, false
	}
	return v, true
}

// axString reads a string attribute of el.
func axString(el uintptr, attr string) (string, bool) {
	v, ok := axAttr(el, attr)
	if !ok {
		return "", false
	}
	defer cg.release(v)
	return goString(v)
}

// AXValue types.
const (
	axPointType = 1
	axSizeType  = 2
	axRectType  = 3
	axRangeType = 4
)

type cfRange struct{ loc, length int }
type cgRect struct{ x, y, w, h float64 }

// axValue reads an AXValue of type typ from v into out.
func axValue(v uintptr, typ uint32, out unsafe.Pointer) bool {
	return v != 0 && cg.typeID(v) == cg.axValueTypeID() && cg.axValueGet(v, typ, out)
}

// axReady loads the functions and reports whether the app may use them.
func axReady() bool { return loadCG() == nil && cg.axTrusted() }

var systemWide struct {
	once sync.Once
	el   uintptr
}

// axSystem returns the system-wide element, which asks the frontmost app.
func axSystem() uintptr {
	systemWide.once.Do(func() {
		systemWide.el = cg.axSystemWide()
		// An app that hangs must not hang the hotkey for the default 6s.
		cg.axTimeout(systemWide.el, 1)
	})
	return systemWide.el
}

// focusedElement returns the focused element of the frontmost app,
// retained. Chromium and Electron build their accessibility tree only
// when asked, by AXManualAccessibility, which it sets on a miss.
func focusedElement() (uintptr, bool) {
	sys := axSystem()
	if el, ok := axAttr(sys, "AXFocusedUIElement"); ok {
		if cg.typeID(el) == cg.axElementTypeID() {
			return el, true
		}
		cg.release(el)
	}
	app, ok := axAttr(sys, "AXFocusedApplication")
	if !ok {
		return 0, false
	}
	defer cg.release(app)
	if cg.booleanTrue == 0 || cg.axSet(app, cfName("AXManualAccessibility"), cg.booleanTrue) != 0 {
		return 0, false
	}
	el, ok := axAttr(app, "AXFocusedUIElement")
	if ok && cg.typeID(el) != cg.axElementTypeID() {
		cg.release(el)
		return 0, false
	}
	return el, ok
}

func axFocusedText() (string, bool) {
	if !axReady() {
		return "", false
	}
	el, ok := focusedElement()
	if !ok {
		return "", false
	}
	defer cg.release(el)
	return axString(el, "AXValue")
}

func axSelectedText() (string, bool) {
	if !axReady() {
		return "", false
	}
	el, ok := focusedElement()
	if !ok {
		return "", false
	}
	defer cg.release(el)
	return axString(el, "AXSelectedText")
}

// selectAll selects the focused input's text by setting its selected range
// to all of its value, which sends no keys, and checks that it took;
// otherwise, as in web pages that ignore it, it presses Cmd+A.
func selectAll() error {
	if axReady() && axSelectAll() {
		return nil
	}
	return pressCombo(keyCombo{mods: modMeta, key: "a"})
}

func axSelectAll() bool {
	el, ok := focusedElement()
	if !ok {
		return false
	}
	defer cg.release(el)
	v, ok := axAttr(el, "AXValue")
	if !ok {
		return false
	}
	n := 0
	if cg.typeID(v) == cg.stringTypeID() {
		n = cg.stringLen(v) // UTF-16 units, as AX ranges count
	}
	cg.release(v)
	if n == 0 {
		return false
	}
	want := cfRange{0, n}
	r := cg.axValueCreate(axRangeType, unsafe.Pointer(&want))
	if r == 0 {
		return false
	}
	defer cg.release(r)
	if cg.axSet(el, cfName("AXSelectedTextRange"), r) != 0 {
		return false
	}
	got, ok := axAttr(el, "AXSelectedTextRange")
	if !ok {
		return false
	}
	defer cg.release(got)
	var have cfRange
	return axValue(got, axRangeType, unsafe.Pointer(&have)) && have == want
}

// caretRect returns the bounds of the selection, or of the character
// before a collapsed caret, else the focused element's frame. AX gives
// them in points from the top-left corner of the primary display, which
// is MyGo's screen space on macOS.
func caretRect() (x, y, w, h float64, ok bool) {
	if !axReady() {
		return 0, 0, 0, 0, false
	}
	el, found := focusedElement()
	if !found {
		return 0, 0, 0, 0, false
	}
	defer cg.release(el)
	if r, ok := selectionBounds(el); ok {
		return r.x, r.y, r.w, r.h, true
	}
	var pos struct{ x, y float64 }
	var size struct{ w, h float64 }
	p, okP := axAttr(el, "AXPosition")
	if okP {
		okP = axValue(p, axPointType, unsafe.Pointer(&pos))
		cg.release(p)
	}
	s, okS := axAttr(el, "AXSize")
	if okS {
		okS = axValue(s, axSizeType, unsafe.Pointer(&size))
		cg.release(s)
	}
	if okP && okS && size.w > 0 && size.h > 0 {
		return pos.x, pos.y, size.w, size.h, true
	}
	return 0, 0, 0, 0, false
}

func selectionBounds(el uintptr) (cgRect, bool) {
	v, ok := axAttr(el, "AXSelectedTextRange")
	if !ok {
		return cgRect{}, false
	}
	var sel cfRange
	ok = axValue(v, axRangeType, unsafe.Pointer(&sel))
	cg.release(v)
	if !ok {
		return cgRect{}, false
	}
	bounds := func(r cfRange) (cgRect, bool) {
		rv := cg.axValueCreate(axRangeType, unsafe.Pointer(&r))
		if rv == 0 {
			return cgRect{}, false
		}
		defer cg.release(rv)
		var out uintptr
		if cg.axCopyParam(el, cfName("AXBoundsForRange"), rv, &out) != 0 || out == 0 {
			return cgRect{}, false
		}
		defer cg.release(out)
		var rect cgRect
		if !axValue(out, axRectType, unsafe.Pointer(&rect)) || rect.h <= 0 {
			return cgRect{}, false
		}
		return rect, true
	}
	if rect, ok := bounds(sel); ok {
		rect.w = max(rect.w, 1)
		return rect, true
	}
	if sel.length == 0 && sel.loc > 0 {
		// Many apps give no bounds for an empty range: take the right
		// edge of the character before the caret.
		if rect, ok := bounds(cfRange{sel.loc - 1, 1}); ok {
			return cgRect{rect.x + rect.w, rect.y, 1, rect.h}, true
		}
	}
	return cgRect{}, false
}

var appKit struct {
	once sync.Once
	ok   bool
	push func() uintptr
	pop  func(uintptr)
}

// loadAppKit loads AppKit's classes and the autorelease pool functions.
func loadAppKit() bool {
	appKit.once.Do(func() {
		if _, err := purego.Dlopen("/System/Library/Frameworks/AppKit.framework/AppKit", purego.RTLD_LAZY|purego.RTLD_GLOBAL); err != nil {
			return
		}
		lib, err := purego.Dlopen("/usr/lib/libobjc.A.dylib", purego.RTLD_LAZY|purego.RTLD_GLOBAL)
		if err != nil {
			return
		}
		purego.RegisterLibFunc(&appKit.push, lib, "objc_autoreleasePoolPush")
		purego.RegisterLibFunc(&appKit.pop, lib, "objc_autoreleasePoolPop")
		appKit.ok = true
	})
	return appKit.ok
}

// withPool runs fn in an autorelease pool, on one thread.
func withPool(fn func()) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	pool := appKit.push()
	defer appKit.pop(pool)
	fn()
}

func frontmostPID() int32 {
	if !loadAppKit() {
		return 0
	}
	var pid int32
	withPool(func() {
		ws := objc.ID(objc.GetClass("NSWorkspace")).Send(objc.RegisterName("sharedWorkspace"))
		app := ws.Send(objc.RegisterName("frontmostApplication"))
		if app != 0 {
			pid = objc.Send[int32](app, objc.RegisterName("processIdentifier"))
		}
	})
	return pid
}

// foreground is what RememberForeground remembered: the app, and its
// focused window as an AX element, retained, to raise that very window.
var foreground struct {
	sync.Mutex
	pid    int32
	window uintptr
}

func rememberForeground() {
	pid := frontmostPID()
	if pid == 0 || int(pid) == os.Getpid() {
		return
	}
	var window uintptr
	if axReady() {
		app := cg.axApplication(pid)
		if app != 0 {
			window, _ = axAttr(app, "AXFocusedWindow")
			cg.release(app)
		}
	}
	foreground.Lock()
	defer foreground.Unlock()
	if foreground.window != 0 {
		cg.release(foreground.window)
	}
	foreground.pid, foreground.window = pid, window
}

func restoreForeground() error {
	foreground.Lock()
	pid, window := foreground.pid, foreground.window
	if window != 0 {
		cg.retain(window)
		defer cg.release(window)
	}
	foreground.Unlock()
	if pid == 0 {
		return errors.New("no previous app recorded")
	}
	if !loadAppKit() {
		return errors.New("AppKit unavailable")
	}
	found := false
	withPool(func() {
		app := objc.ID(objc.GetClass("NSRunningApplication")).Send(objc.RegisterName("runningApplicationWithProcessIdentifier:"), pid)
		if app == 0 {
			return
		}
		found = true
		// macOS 14 lets an active app hand activation over, and may
		// ignore an activation it did not hand over.
		nsApp := objc.ID(objc.GetClass("NSApplication")).Send(objc.RegisterName("sharedApplication"))
		yield := objc.RegisterName("yieldActivationToApplication:")
		if nsApp != 0 && objc.Send[bool](nsApp, objc.RegisterName("respondsToSelector:"), yield) {
			nsApp.Send(yield, app)
		}
		const activateIgnoringOtherApps = 1 << 1
		objc.Send[bool](app, objc.RegisterName("activateWithOptions:"), uint(activateIgnoringOtherApps))
	})
	if !found {
		return errors.New("the previous app is no longer running")
	}
	if axReady() {
		if window != 0 {
			cg.axPerform(window, cfName("AXRaise"))
			if cg.booleanTrue != 0 {
				cg.axSet(window, cfName("AXMain"), cg.booleanTrue)
			}
		}
		if app := cg.axApplication(pid); app != 0 {
			if cg.booleanTrue != 0 {
				cg.axSet(app, cfName("AXFrontmost"), cg.booleanTrue)
			}
			cg.release(app)
		}
	}
	for deadline := time.Now().Add(time.Second); time.Now().Before(deadline); time.Sleep(20 * time.Millisecond) {
		if frontmostPID() == pid {
			// Let the window become key before keys are sent to it.
			time.Sleep(100 * time.Millisecond)
			return nil
		}
	}
	return errors.New("the previous app did not take the focus")
}
