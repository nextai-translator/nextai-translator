package sys

import (
	"fmt"
	"image"
	"runtime"
	"sync"
	"syscall"
	"unsafe"
)

// ScreenCaptureSettingsURL is empty: Windows has no such setting.
const ScreenCaptureSettingsURL = ""

// ScreenCaptureAllowed is always true: Windows asks no permission to read
// the screen.
func ScreenCaptureAllowed() bool { return true }

// RequestScreenCapture does nothing: there is no permission to ask for.
func RequestScreenCapture() {}

var (
	captureGDI32  = syscall.NewLazyDLL("gdi32.dll")
	captureShcore = syscall.NewLazyDLL("shcore.dll")

	captureProcGetDC                  = user32.NewProc("GetDC")
	captureProcReleaseDC              = user32.NewProc("ReleaseDC")
	captureProcEnumDisplayMonitors    = user32.NewProc("EnumDisplayMonitors")
	captureProcGetMonitorInfoW        = user32.NewProc("GetMonitorInfoW")
	captureProcGetDpiForSystem        = user32.NewProc("GetDpiForSystem")
	captureProcSetThreadDpiAwareness  = user32.NewProc("SetThreadDpiAwarenessContext")
	captureProcGetDpiForMonitor       = captureShcore.NewProc("GetDpiForMonitor")
	captureProcCreateCompatibleDC     = captureGDI32.NewProc("CreateCompatibleDC")
	captureProcCreateCompatibleBitmap = captureGDI32.NewProc("CreateCompatibleBitmap")
	captureProcSelectObject           = captureGDI32.NewProc("SelectObject")
	captureProcBitBlt                 = captureGDI32.NewProc("BitBlt")
	captureProcGetDIBits              = captureGDI32.NewProc("GetDIBits")
	captureProcDeleteObject           = captureGDI32.NewProc("DeleteObject")
	captureProcDeleteDC               = captureGDI32.NewProc("DeleteDC")
)

// captureDPIAwarePerMonitorV2 is DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2.
const captureDPIAwarePerMonitorV2 = ^uintptr(3) // -4

type captureWinRect struct{ Left, Top, Right, Bottom int32 }

type captureMonitorInfo struct {
	Size          uint32
	Monitor, Work captureWinRect
	Flags         uint32
}

type captureBitmapInfo struct {
	Size          uint32
	Width, Height int32
	Planes        uint16
	BitCount      uint16
	Compression   uint32
	SizeImage     uint32
	XPelsPerMeter int32
	YPelsPerMeter int32
	ClrUsed       uint32
	ClrImportant  uint32
	Colors        [1]uint32
}

var (
	captureMonitorsMu   sync.Mutex
	captureMonitorsOnce sync.Once
	captureMonitorsCB   uintptr
	captureMonitorsSink []captureDisplay
)

// captureDisplays returns the monitors in physical pixels with their
// effective DPI. The calling thread must be per-monitor DPI aware.
func captureDisplays() []captureDisplay {
	captureMonitorsMu.Lock()
	defer captureMonitorsMu.Unlock()
	captureMonitorsOnce.Do(func() {
		captureMonitorsCB = syscall.NewCallback(func(mon, _, _, _ uintptr) uintptr {
			mi := captureMonitorInfo{Size: uint32(unsafe.Sizeof(captureMonitorInfo{}))}
			captureProcGetMonitorInfoW.Call(mon, uintptr(unsafe.Pointer(&mi)))
			dpi := 0
			if captureProcGetDpiForMonitor.Find() == nil {
				var dx, dy uint32
				if r, _, _ := captureProcGetDpiForMonitor.Call(mon, 0, uintptr(unsafe.Pointer(&dx)), uintptr(unsafe.Pointer(&dy))); r == 0 {
					dpi = int(dx)
				}
			}
			r := mi.Monitor
			captureMonitorsSink = append(captureMonitorsSink, captureDisplay{
				bounds: captureRect{int(r.Left), int(r.Top), int(r.Right - r.Left), int(r.Bottom - r.Top)},
				dpi:    dpi,
			})
			return 1
		})
	})
	captureMonitorsSink = nil
	captureProcEnumDisplayMonitors.Call(0, 0, captureMonitorsCB, 0)
	out := captureMonitorsSink
	captureMonitorsSink = nil
	return out
}

// CaptureScreen returns the pixels of a rectangle of the screen at device
// resolution: a rectangle of 100 × 50 on a display at 150% gives 150 × 75
// pixels.
//
// On Windows x, y, w and h are in MyGo's DIPs, the space of
// mygo.Display.Bounds: each display's DIPs start at its top-left pixel
// scaled by the smallest scale of all the displays and go on in its own
// scale, so the primary display's are its pixels divided by its scale.
// CaptureScreen maps the rectangle to pixels as MyGo maps a window's
// bounds, through the scale of the display it is the most on, and reads
// them with GDI.
func CaptureScreen(x, y, w, h int) (*image.RGBA, error) {
	if w <= 0 || h <= 0 {
		return nil, fmt.Errorf("sys: empty capture rectangle %dx%d", w, h)
	}
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	// MyGo makes the process per-monitor aware; this thread is made so
	// too, for a caller without MyGo, such as a test, to get pixels.
	if captureProcSetThreadDpiAwareness.Find() == nil {
		if old, _, _ := captureProcSetThreadDpiAwareness.Call(captureDPIAwarePerMonitorV2); old != 0 {
			defer captureProcSetThreadDpiAwareness.Call(old)
		}
	}
	fallback := 96
	if captureProcGetDpiForSystem.Find() == nil {
		if r, _, _ := captureProcGetDpiForSystem.Call(); r != 0 {
			fallback = int(r)
		}
	}
	px := captureNewDIPSpace(captureDisplays(), fallback).toPixels(captureRect{x, y, w, h})
	if px.W <= 0 || px.H <= 0 {
		return nil, fmt.Errorf("sys: empty capture rectangle %dx%d", px.W, px.H)
	}

	screen, _, _ := captureProcGetDC.Call(0)
	if screen == 0 {
		return nil, fmt.Errorf("sys: GetDC failed")
	}
	defer captureProcReleaseDC.Call(0, screen)
	mem, _, _ := captureProcCreateCompatibleDC.Call(screen)
	if mem == 0 {
		return nil, fmt.Errorf("sys: CreateCompatibleDC failed")
	}
	defer captureProcDeleteDC.Call(mem)
	bmp, _, _ := captureProcCreateCompatibleBitmap.Call(screen, uintptr(px.W), uintptr(px.H))
	if bmp == 0 {
		return nil, fmt.Errorf("sys: CreateCompatibleBitmap %dx%d failed", px.W, px.H)
	}
	defer captureProcDeleteObject.Call(bmp)
	old, _, _ := captureProcSelectObject.Call(mem, bmp)
	const srcCopy, captureBlt = 0x00CC0020, 0x40000000
	ok, _, e := captureProcBitBlt.Call(mem, 0, 0, uintptr(px.W), uintptr(px.H), screen, uintptr(px.X), uintptr(px.Y), srcCopy|captureBlt)
	captureProcSelectObject.Call(mem, old) // GetDIBits wants it out of the DC
	if ok == 0 {
		return nil, fmt.Errorf("sys: BitBlt failed: %v", e)
	}

	bi := captureBitmapInfo{Width: int32(px.W), Height: -int32(px.H), Planes: 1, BitCount: 32}
	bi.Size = uint32(unsafe.Sizeof(bi) - unsafe.Sizeof(bi.Colors))
	img := image.NewRGBA(image.Rect(0, 0, px.W, px.H))
	if n, _, e := captureProcGetDIBits.Call(mem, bmp, 0, uintptr(px.H), uintptr(unsafe.Pointer(&img.Pix[0])), uintptr(unsafe.Pointer(&bi)), 0); n == 0 {
		return nil, fmt.Errorf("sys: GetDIBits failed: %v", e)
	}
	for i := 0; i < len(img.Pix); i += 4 { // BGRx to RGBA
		img.Pix[i], img.Pix[i+2], img.Pix[i+3] = img.Pix[i+2], img.Pix[i], 0xff
	}
	return img, nil
}
