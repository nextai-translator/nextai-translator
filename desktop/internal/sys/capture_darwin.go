package sys

import (
	"fmt"
	"image"
	"image/draw"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/ebitengine/purego"
)

// ScreenCaptureSettingsURL opens the Screen Recording pane of Privacy &
// Security, where the user lets the app capture the screen.
const ScreenCaptureSettingsURL = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"

var captureCG struct {
	once      sync.Once
	err       error
	preflight func() bool
	request   func() bool
}

func captureLoadCG() error {
	captureCG.once.Do(func() {
		lib, err := purego.Dlopen("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics", purego.RTLD_LAZY|purego.RTLD_GLOBAL)
		if err != nil {
			captureCG.err = err
			return
		}
		purego.RegisterLibFunc(&captureCG.preflight, lib, "CGPreflightScreenCaptureAccess")
		purego.RegisterLibFunc(&captureCG.request, lib, "CGRequestScreenCaptureAccess")
	})
	return captureCG.err
}

// ScreenCaptureAllowed reports whether the app has Screen Recording
// access. Without it, macOS still lets the capture run but leaves other
// apps' windows out of it: the picture shows the wallpaper and the app's
// own windows only.
func ScreenCaptureAllowed() bool {
	return captureLoadCG() == nil && captureCG.preflight()
}

// RequestScreenCapture asks for Screen Recording access. The first time,
// macOS shows its prompt and adds the app to the list in the settings
// pane; later calls do nothing, and the user has to grant it at
// ScreenCaptureSettingsURL. A grant takes effect when the app restarts.
func RequestScreenCapture() {
	if captureLoadCG() == nil {
		captureCG.request()
	}
}

// CaptureScreen returns the pixels of a rectangle of the screen at device
// resolution: a rectangle of 100 × 50 on a Retina display gives 200 × 100
// pixels.
//
// On macOS x, y, w and h are in points, in the space of
// mygo.Display.Bounds, which is AppKit's screen space flipped: 0, 0 is
// the top-left corner of the primary display (the one with the menu bar),
// and y grows downwards. That is also Core Graphics' global display space,
// which screencapture -R takes.
func CaptureScreen(x, y, w, h int) (*image.RGBA, error) {
	if w <= 0 || h <= 0 {
		return nil, fmt.Errorf("sys: empty capture rectangle %dx%d", w, h)
	}
	dir, err := os.MkdirTemp("", "capture")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	file := filepath.Join(dir, "capture.png")
	out, err := exec.Command("/usr/sbin/screencapture", "-x", "-t", "png", fmt.Sprintf("-R%d,%d,%d,%d", x, y, w, h), file).CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("sys: screencapture: %v: %s", err, strings.TrimSpace(string(out)))
	}
	f, err := os.Open(file)
	if err != nil {
		return nil, fmt.Errorf("sys: screencapture wrote nothing: %s", strings.TrimSpace(string(out)))
	}
	defer f.Close()
	img, err := png.Decode(f)
	if err != nil {
		return nil, fmt.Errorf("sys: screencapture: %w", err)
	}
	if rgba, ok := img.(*image.RGBA); ok && rgba.Rect.Min == (image.Point{}) {
		return rgba, nil
	}
	rgba := image.NewRGBA(image.Rect(0, 0, img.Bounds().Dx(), img.Bounds().Dy()))
	draw.Draw(rgba, rgba.Rect, img, img.Bounds().Min, draw.Src)
	return rgba, nil
}
