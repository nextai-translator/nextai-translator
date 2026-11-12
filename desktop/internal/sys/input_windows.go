package sys

import (
	"errors"
	"os"
	"runtime"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

var (
	procVkKeyScan          = user32.NewProc("VkKeyScanW")
	procGetForeground      = user32.NewProc("GetForegroundWindow")
	procSetForeground      = user32.NewProc("SetForegroundWindow")
	procBringWindowToTop   = user32.NewProc("BringWindowToTop")
	procGetWindowThreadPID = user32.NewProc("GetWindowThreadProcessId")
	procAttachThreadInput  = user32.NewProc("AttachThreadInput")
	procIsWindow           = user32.NewProc("IsWindow")
	procIsIconic           = user32.NewProc("IsIconic")
	procShowWindow         = user32.NewProc("ShowWindow")
	procGetGUIThreadInfo   = user32.NewProc("GetGUIThreadInfo")
	procClientToScreen     = user32.NewProc("ClientToScreen")
	procGetWindowRect      = user32.NewProc("GetWindowRect")
	procEnumMonitors       = user32.NewProc("EnumDisplayMonitors")
	procGetMonitorInfo     = user32.NewProc("GetMonitorInfoW")
	procGetCurrentThreadID = syscall.NewLazyDLL("kernel32.dll").NewProc("GetCurrentThreadId")
	procGetDpiForMonitor   = syscall.NewLazyDLL("shcore.dll").NewProc("GetDpiForMonitor")
)

// Virtual keys of the keys keyCombo names, and whether they are extended
// keys.
var winKeys = map[string]struct {
	vk  uintptr
	ext bool
}{
	"enter": {0x0D, false}, "tab": {0x09, false}, "space": {0x20, false},
	"backspace": {0x08, false}, "escape": {0x1B, false},
	"delete": {0x2E, true}, "insert": {0x2D, true}, "home": {0x24, true}, "end": {0x23, true},
	"pageup": {0x21, true}, "pagedown": {0x22, true},
	"left": {0x25, true}, "up": {0x26, true}, "right": {0x27, true}, "down": {0x28, true},
}

// Modifier keys, in the order they go down.
var winMods = []struct {
	mod modMask
	vk  uintptr
	ext bool
}{
	{modCtrl, 0x11, false},
	{modAlt, 0x12, false},
	{modShift, 0x10, false},
	{modMeta, 0x5B, true},
}

// winKey returns the virtual key of a keyCombo key, and the modifiers the
// keyboard layout needs to type it, as Shift for "?".
func winKey(name string) (vk uintptr, ext bool, mods modMask, err error) {
	if k, ok := winKeys[name]; ok {
		return k.vk, k.ext, 0, nil
	}
	if len(name) >= 2 && name[0] == 'f' {
		n := 0
		for _, r := range name[1:] {
			n = n*10 + int(r-'0')
		}
		if n >= 1 && n <= 24 {
			return 0x70 + uintptr(n-1), false, 0, nil
		}
	}
	r := []rune(name)
	if len(r) != 1 {
		return 0, false, 0, errors.New("no key for " + name)
	}
	switch ch := r[0]; {
	case ch >= 'a' && ch <= 'z':
		return uintptr(ch - 'a' + 'A'), false, 0, nil
	case ch >= '0' && ch <= '9':
		return uintptr(ch), false, 0, nil
	}
	res, _, _ := procVkKeyScan.Call(uintptr(r[0]))
	if int16(res) == -1 {
		return 0, false, 0, errors.New("no key for " + name)
	}
	shift := res >> 8 & 0xFF
	if shift&1 != 0 {
		mods |= modShift
	}
	if shift&2 != 0 {
		mods |= modCtrl
	}
	if shift&4 != 0 {
		mods |= modAlt
	}
	return res & 0xFF, false, mods, nil
}

func modKey(vk uintptr, ext bool, flags uintptr) {
	if ext {
		flags |= keyExtended
	}
	key(vk, flags)
}

// releaseHeld lets go of the modifiers the user still holds from the
// hotkey, but those c needs, so that the app does not see them with c's
// keys. Before Alt or Windows goes up it taps an unassigned key, or
// letting go of Alt alone would open the app's menu bar, and of Windows the
// Start menu.
func releaseHeld(keep modMask) {
	masked := false
	for _, m := range []struct {
		mod modMask
		vk  uintptr
		ext bool
	}{
		{modShift, 0x10, false}, {modCtrl, 0x11, false}, {modAlt, 0x12, false},
		{modMeta, 0x5B, true}, {modMeta, 0x5C, true},
	} {
		if keep&m.mod != 0 {
			continue
		}
		if r, _, _ := procGetAsyncKey.Call(m.vk); r&0x8000 == 0 {
			continue
		}
		if (m.mod == modAlt || m.mod == modMeta) && !masked {
			key(0xE8, 0)
			key(0xE8, keyUp)
			masked = true
		}
		modKey(m.vk, m.ext, keyUp)
	}
}

func pressCombo(c keyCombo) error {
	vk, ext, extra, err := winKey(c.key)
	if err != nil {
		return err
	}
	mods := c.mods | extra
	releaseHeld(mods)
	var down []int
	for i, m := range winMods {
		if mods&m.mod != 0 {
			modKey(m.vk, m.ext, 0)
			down = append(down, i)
		}
	}
	modKey(vk, ext, 0)
	modKey(vk, ext, keyUp)
	for i := len(down) - 1; i >= 0; i-- {
		m := winMods[down[i]]
		modKey(m.vk, m.ext, keyUp)
	}
	return nil
}

func selectAll() error { return pressCombo(keyCombo{mods: modCtrl, key: "a"}) }

func axFocusedText() (string, bool) {
	var text string
	ok := withUIA(func(u *uia) bool {
		el := u.focused()
		if el == 0 {
			return false
		}
		defer comRelease(el)
		var ok bool
		text, ok = uiaText(el)
		return ok
	})
	return text, ok
}

func axSelectedText() (string, bool) {
	var text string
	ok := withUIA(func(u *uia) bool {
		el := u.focused()
		if el == 0 {
			return false
		}
		defer comRelease(el)
		var ok bool
		text, ok = uiaSelection(el)
		return ok
	})
	return text, ok
}

type winRect struct{ left, top, right, bottom int32 }

// guiThreadInfo is GUITHREADINFO.
type guiThreadInfo struct {
	size, flags                               uint32
	active, focus, capture, menuOwner, moving uintptr
	caret                                     uintptr
	caretRect                                 winRect
}

// focusInfo returns the foreground thread's GUI state: its focused window
// and its caret, which Win32 controls show and many others do not.
func focusInfo() (guiThreadInfo, bool) {
	fg, _, _ := procGetForeground.Call()
	if fg == 0 {
		return guiThreadInfo{}, false
	}
	tid, _, _ := procGetWindowThreadPID.Call(fg, 0)
	info := guiThreadInfo{size: uint32(unsafe.Sizeof(guiThreadInfo{}))}
	if r, _, _ := procGetGUIThreadInfo.Call(tid, uintptr(unsafe.Pointer(&info))); r == 0 {
		return guiThreadInfo{}, false
	}
	if info.focus == 0 {
		info.focus = fg
	}
	return info, true
}

// caretRect returns, in pixels, the system caret of the foreground thread,
// else UI Automation's frame of the focused element, else the focused
// window's, converted to MyGo's DIPs.
func caretRect() (x, y, w, h float64, ok bool) {
	px, found := caretPixels()
	if !found {
		return 0, 0, 0, 0, false
	}
	x, y, w, h = pixelRectToDIP(displays(), int(px.left), int(px.top), int(px.right-px.left), int(px.bottom-px.top))
	return x, y, w, h, true
}

func caretPixels() (winRect, bool) {
	info, ok := focusInfo()
	if !ok {
		return winRect{}, false
	}
	if info.caret != 0 && info.caretRect.bottom > info.caretRect.top {
		r := info.caretRect
		pts := [2][2]int32{{r.left, r.top}, {r.right, r.bottom}}
		procClientToScreen.Call(info.caret, uintptr(unsafe.Pointer(&pts[0])))
		procClientToScreen.Call(info.caret, uintptr(unsafe.Pointer(&pts[1])))
		return winRect{pts[0][0], pts[0][1], max(pts[1][0], pts[0][0]+1), pts[1][1]}, true
	}
	var rect winRect
	if withUIA(func(u *uia) bool {
		el := u.focused()
		if el == 0 {
			return false
		}
		defer comRelease(el)
		r, ok := uiaBounds(el)
		rect = r
		return ok
	}) {
		return rect, true
	}
	if r, _, _ := procGetWindowRect.Call(info.focus, uintptr(unsafe.Pointer(&rect))); r != 0 && rect.right > rect.left {
		return rect, true
	}
	return winRect{}, false
}

var monitors struct {
	sync.Mutex
	callback uintptr
	found    []pixelDisplay
}

// displays returns the monitors in pixels with their DPIs.
func displays() []pixelDisplay {
	monitors.Lock()
	defer monitors.Unlock()
	if monitors.callback == 0 {
		monitors.callback = syscall.NewCallback(func(mon, _, _, _ uintptr) uintptr {
			var info struct {
				size          uint32
				monitor, work winRect
				flags         uint32
			}
			info.size = uint32(unsafe.Sizeof(info))
			if r, _, _ := procGetMonitorInfo.Call(mon, uintptr(unsafe.Pointer(&info))); r == 0 {
				return 1
			}
			dpi := 96
			var dx, dy uint32
			if procGetDpiForMonitor.Find() == nil {
				if r, _, _ := procGetDpiForMonitor.Call(mon, 0, uintptr(unsafe.Pointer(&dx)), uintptr(unsafe.Pointer(&dy))); r == 0 && dx != 0 {
					dpi = int(dx)
				}
			}
			m := info.monitor
			monitors.found = append(monitors.found, pixelDisplay{int(m.left), int(m.top), int(m.right - m.left), int(m.bottom - m.top), dpi})
			return 1
		})
	}
	monitors.found = nil
	procEnumMonitors.Call(0, 0, monitors.callback, 0)
	return monitors.found
}

// foreground is the window RememberForeground remembered.
var foreground struct {
	sync.Mutex
	hwnd uintptr
}

func rememberForeground() {
	fg, _, _ := procGetForeground.Call()
	if fg == 0 {
		return
	}
	var pid uint32
	procGetWindowThreadPID.Call(fg, uintptr(unsafe.Pointer(&pid)))
	if int(pid) == os.Getpid() {
		return
	}
	foreground.Lock()
	foreground.hwnd = fg
	foreground.Unlock()
}

func restoreForeground() error {
	foreground.Lock()
	hwnd := foreground.hwnd
	foreground.Unlock()
	if hwnd == 0 {
		return errors.New("no previous window recorded")
	}
	return focusWindow(hwnd)
}

// focusWindow brings hwnd to the foreground. Windows lets only the
// foreground's own threads do that, so the thread joins the input of the
// foreground's thread and of hwnd's for the call, as insertion.rs did.
func focusWindow(hwnd uintptr) error {
	if r, _, _ := procIsWindow.Call(hwnd); r == 0 {
		return errors.New("the previous window is gone")
	}
	if r, _, _ := procIsIconic.Call(hwnd); r != 0 {
		procShowWindow.Call(hwnd, 9) // SW_RESTORE
	}
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	fg, _, _ := procGetForeground.Call()
	target, _, _ := procGetWindowThreadPID.Call(hwnd, 0)
	fgThread, _, _ := procGetWindowThreadPID.Call(fg, 0)
	self, _, _ := procGetCurrentThreadID.Call()
	if target == 0 {
		return errors.New("the previous window is gone")
	}
	procAttachThreadInput.Call(fgThread, self, 1)
	procAttachThreadInput.Call(target, self, 1)
	defer procAttachThreadInput.Call(fgThread, self, 0)
	defer procAttachThreadInput.Call(target, self, 0)
	for try := 0; try < 2; try++ {
		if try > 0 {
			// The foreground lock still held: a process may take the
			// foreground when it sent the last input, so tap a key that
			// nothing is bound to and try again.
			key(0xE8, 0)
			key(0xE8, keyUp)
		}
		procBringWindowToTop.Call(hwnd)
		procSetForeground.Call(hwnd)
		for deadline := time.Now().Add(500 * time.Millisecond); time.Now().Before(deadline); time.Sleep(20 * time.Millisecond) {
			if now, _, _ := procGetForeground.Call(); now == hwnd {
				time.Sleep(50 * time.Millisecond)
				return nil
			}
		}
	}
	return errors.New("SetForegroundWindow failed")
}
