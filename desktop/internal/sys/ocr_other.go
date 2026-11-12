//go:build !darwin && !windows

package sys

import "image"

// RecognizeText returns ErrUnsupported: there is no OCR engine to call
// here, and the old app did no OCR on Linux either.
func RecognizeText(img image.Image) (string, error) { return "", ErrUnsupported }
