package sys

import (
	"runtime"
	"sync"
	"unsafe"

	"github.com/ebitengine/purego"
	"github.com/ebitengine/purego/objc"
)

type axcCGPoint struct{ X, Y float64 }

var axc struct {
	once sync.Once
	err  error

	createSystemWide  func() uintptr
	createApplication func(pid int32) uintptr
	copyAttribute     func(elem, attr uintptr, out *uintptr) int32
	elementAtPosition func(app uintptr, x, y float32, out *uintptr) int32
	getPid            func(elem uintptr, pid *int32) int32
	elementTypeID     func() uintptr

	eventCreate      func(source uintptr) uintptr
	eventGetLocation func(ev uintptr) axcCGPoint

	release           func(ref uintptr)
	getTypeID         func(ref uintptr) uintptr
	stringTypeID      func() uintptr
	arrayTypeID       func() uintptr
	stringCreate      func(alloc uintptr, s *byte, encoding uint32) uintptr
	stringLength      func(s uintptr) int
	stringMaxSize     func(length int, encoding uint32) int
	stringGetCString  func(s uintptr, buf *byte, size int, encoding uint32) bool
	arrayCount        func(a uintptr) int
	arrayValueAtIndex func(a uintptr, i int) uintptr

	// Attribute names, created once and kept.
	attrs map[string]uintptr
}

const axcUTF8 = 0x08000100 // kCFStringEncodingUTF8

const (
	axcRole             = "AXRole"
	axcValue            = "AXValue"
	axcTitle            = "AXTitle"
	axcDescription      = "AXDescription"
	axcSelectedText     = "AXSelectedText"
	axcChildren         = "AXChildren"
	axcFocusedApp       = "AXFocusedApplication"
	axcFocusedUIElement = "AXFocusedUIElement"
	axcFocusedWindow    = "AXFocusedWindow"
)

func axcLoad() error {
	axc.once.Do(func() {
		as, err := purego.Dlopen("/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices", purego.RTLD_LAZY|purego.RTLD_GLOBAL)
		if err != nil {
			axc.err = err
			return
		}
		cf, err := purego.Dlopen("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation", purego.RTLD_LAZY|purego.RTLD_GLOBAL)
		if err != nil {
			axc.err = err
			return
		}
		// NSWorkspace, for the app's name and bundle ID.
		if _, err := purego.Dlopen("/System/Library/Frameworks/AppKit.framework/AppKit", purego.RTLD_LAZY|purego.RTLD_GLOBAL); err != nil {
			axc.err = err
			return
		}
		purego.RegisterLibFunc(&axc.createSystemWide, as, "AXUIElementCreateSystemWide")
		purego.RegisterLibFunc(&axc.createApplication, as, "AXUIElementCreateApplication")
		purego.RegisterLibFunc(&axc.copyAttribute, as, "AXUIElementCopyAttributeValue")
		purego.RegisterLibFunc(&axc.elementAtPosition, as, "AXUIElementCopyElementAtPosition")
		purego.RegisterLibFunc(&axc.getPid, as, "AXUIElementGetPid")
		purego.RegisterLibFunc(&axc.elementTypeID, as, "AXUIElementGetTypeID")
		purego.RegisterLibFunc(&axc.eventCreate, as, "CGEventCreate")
		purego.RegisterLibFunc(&axc.eventGetLocation, as, "CGEventGetLocation")
		purego.RegisterLibFunc(&axc.release, cf, "CFRelease")
		purego.RegisterLibFunc(&axc.getTypeID, cf, "CFGetTypeID")
		purego.RegisterLibFunc(&axc.stringTypeID, cf, "CFStringGetTypeID")
		purego.RegisterLibFunc(&axc.arrayTypeID, cf, "CFArrayGetTypeID")
		purego.RegisterLibFunc(&axc.stringCreate, cf, "CFStringCreateWithCString")
		purego.RegisterLibFunc(&axc.stringLength, cf, "CFStringGetLength")
		purego.RegisterLibFunc(&axc.stringMaxSize, cf, "CFStringGetMaximumSizeForEncoding")
		purego.RegisterLibFunc(&axc.stringGetCString, cf, "CFStringGetCString")
		purego.RegisterLibFunc(&axc.arrayCount, cf, "CFArrayGetCount")
		purego.RegisterLibFunc(&axc.arrayValueAtIndex, cf, "CFArrayGetValueAtIndex")

		axc.attrs = map[string]uintptr{}
		for _, name := range []string{axcRole, axcValue, axcTitle, axcDescription, axcSelectedText, axcChildren, axcFocusedApp, axcFocusedUIElement, axcFocusedWindow} {
			b := append([]byte(name), 0)
			axc.attrs[name] = axc.stringCreate(0, &b[0], axcUTF8)
		}
	})
	return axc.err
}

// axcCopy returns the attribute's value, which the caller releases, or 0.
func axcCopy(elem uintptr, attr string) uintptr {
	var v uintptr
	if axc.copyAttribute(elem, axc.attrs[attr], &v) != 0 {
		return 0
	}
	return v
}

// axcCopyElement returns the attribute's value when it is an element, which
// the caller releases, or 0.
func axcCopyElement(elem uintptr, attr string) uintptr {
	v := axcCopy(elem, attr)
	if v != 0 && axc.getTypeID(v) != axc.elementTypeID() {
		axc.release(v)
		return 0
	}
	return v
}

// axcGoString copies a CFString.
func axcGoString(s uintptr) string {
	size := axc.stringMaxSize(axc.stringLength(s), axcUTF8) + 1
	if size <= 1 {
		return ""
	}
	buf := make([]byte, size)
	if !axc.stringGetCString(s, &buf[0], size, axcUTF8) {
		return ""
	}
	for i, c := range buf {
		if c == 0 {
			return string(buf[:i])
		}
	}
	return string(buf)
}

// axcAttrString returns the attribute's value when it is a string.
func axcAttrString(elem uintptr, attr string) (string, bool) {
	v := axcCopy(elem, attr)
	if v == 0 {
		return "", false
	}
	defer axc.release(v)
	if axc.getTypeID(v) != axc.stringTypeID() {
		return "", false
	}
	return axcGoString(v), true
}

func axcRoleOf(elem uintptr) string {
	r, _ := axcAttrString(elem, axcRole)
	return r
}

func axcBestTextOf(elem uintptr) string {
	// Read lazily: the first text that is not blank wins.
	for _, attr := range []string{axcValue, axcTitle, axcDescription} {
		if s, ok := axcAttrString(elem, attr); ok {
			if t := axcBestText(s); t != "" {
				return t
			}
		}
	}
	return ""
}

// axcEachChild visits elem's children; the array keeps them alive meanwhile.
func axcEachChild(elem uintptr, visit func(uintptr) bool) bool {
	kids := axcCopy(elem, axcChildren)
	if kids == 0 {
		return true
	}
	defer axc.release(kids)
	if axc.getTypeID(kids) != axc.arrayTypeID() {
		return true
	}
	for i, n := 0, axc.arrayCount(kids); i < n; i++ {
		child := axc.arrayValueAtIndex(kids, i)
		if child == 0 {
			continue
		}
		if !visit(child) {
			return false
		}
	}
	return true
}

func axcFocusedPid(system uintptr) (int32, bool) {
	app := axcCopyElement(system, axcFocusedApp)
	if app == 0 {
		return 0, false
	}
	defer axc.release(app)
	var pid int32
	if axc.getPid(app, &pid) != 0 {
		return 0, false
	}
	return pid, true
}

func axcElementAtPosition(system uintptr, x, y float32) uintptr {
	pid, ok := axcFocusedPid(system)
	if !ok {
		return 0
	}
	app := axc.createApplication(pid)
	if app == 0 {
		return 0
	}
	defer axc.release(app)
	var out uintptr
	if axc.elementAtPosition(app, x, y, &out) != 0 {
		return 0
	}
	return out
}

// axcMouse is the pointer in global display coordinates, top-left origin.
func axcMouse() (int, int) {
	ev := axc.eventCreate(0)
	if ev == 0 {
		return 0, 0
	}
	defer axc.release(ev)
	p := axc.eventGetLocation(ev)
	return int(p.X), int(p.Y)
}

func axcNSString(s objc.ID) string {
	if s == 0 {
		return ""
	}
	p := objc.Send[uintptr](s, objc.RegisterName("UTF8String"))
	if p == 0 {
		return ""
	}
	n := objc.Send[uintptr](s, objc.RegisterName("lengthOfBytesUsingEncoding:"), uintptr(4)) // NSUTF8StringEncoding
	return string(unsafe.Slice(*(**byte)(unsafe.Pointer(&p)), n))
}

// axcFrontmostApp returns the name and bundle ID of the app in front.
func axcFrontmostApp() (name, bundleID string) {
	pool := objc.ID(objc.GetClass("NSAutoreleasePool")).Send(objc.RegisterName("new"))
	defer pool.Send(objc.RegisterName("drain"))
	ws := objc.ID(objc.GetClass("NSWorkspace")).Send(objc.RegisterName("sharedWorkspace"))
	if ws == 0 {
		return "", ""
	}
	app := ws.Send(objc.RegisterName("frontmostApplication"))
	if app == 0 {
		return "", ""
	}
	return axcNSString(app.Send(objc.RegisterName("localizedName"))),
		axcNSString(app.Send(objc.RegisterName("bundleIdentifier")))
}

func axcRead(wide bool) AXContext {
	var ctx AXContext
	if err := axcLoad(); err != nil {
		return ctx
	}
	runtime.LockOSThread() // for the autorelease pool
	defer runtime.UnlockOSThread()

	ctx.MouseX, ctx.MouseY = axcMouse()
	ctx.AppName, ctx.AppBundleID = axcFrontmostApp()

	system := axc.createSystemWide()
	if system == 0 {
		return ctx
	}
	defer axc.release(system)

	if focused := axcCopyElement(system, axcFocusedUIElement); focused != 0 {
		ctx.FocusedRole = axcRoleOf(focused)
		value, _ := axcAttrString(focused, axcValue)
		ctx.FocusedText = axcFocusedText(value, func() string { return axcBestTextOf(focused) })
		ctx.SelectedText, _ = axcAttrString(focused, axcSelectedText)
		axc.release(focused)
	}

	if hovered := axcElementAtPosition(system, float32(ctx.MouseX), float32(ctx.MouseY)); hovered != 0 {
		ctx.HoveredText = axcBestTextOf(hovered)
		ctx.HoveredRole = axcRoleOf(hovered)
		axc.release(hovered)
	}

	if !wide {
		return ctx
	}
	if window := axcCopyElement(system, axcFocusedWindow); window != 0 {
		defer axc.release(window)
		w := axcWalker[uintptr]{role: axcRoleOf, text: axcBestTextOf, each: axcEachChild}
		ctx.Truncated = !w.walk(window, 0)
		ctx.Paragraphs = w.out
	}
	return ctx
}
