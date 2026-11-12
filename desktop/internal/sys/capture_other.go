//go:build !darwin && !windows

package sys

import "image"

// ScreenCaptureSettingsURL is empty: there is no such setting here.
const ScreenCaptureSettingsURL = ""

// ScreenCaptureAllowed is always true: no permission guards the screen
// here, where the app does not capture it anyway.
func ScreenCaptureAllowed() bool { return true }

// RequestScreenCapture does nothing: there is no permission to ask for.
func RequestScreenCapture() {}

// CaptureScreen returns ErrUnsupported: the app does no OCR here, so it
// has no use for the screen's pixels.
func CaptureScreen(x, y, w, h int) (*image.RGBA, error) { return nil, ErrUnsupported }
