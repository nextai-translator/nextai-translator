package sys

import (
	"errors"
	"image"
	"image/draw"
	"unicode"

	xdraw "golang.org/x/image/draw"
)

// ErrUnsupported means the system has no OCR the app can use: Linux, where
// the old app did no OCR either.
var ErrUnsupported = errors.New("sys: OCR is not supported on this system")

// ocrIsCJK reports whether c is a Chinese or Japanese character, CJK
// punctuation or a full-width form, between which Windows OCR puts spaces.
func ocrIsCJK(c rune) bool {
	return c >= 0x3000 && c <= 0x30ff || // CJK punctuation, hiragana, katakana
		c >= 0x3400 && c <= 0x4dbf ||
		c >= 0x4e00 && c <= 0x9fff ||
		c >= 0xf900 && c <= 0xfaff ||
		c >= 0xff00 && c <= 0xffef // full-width forms
}

// ocrJoinCJKSpaces drops the spaces Windows OCR puts between Chinese and
// Japanese characters ("你 好 世 界"), which read as garbage and confuse the
// translator. A space goes only when both its neighbours are CJK, so spaces
// between Latin words, and Korean word spacing, stay.
func ocrJoinCJKSpaces(line string) string {
	chars := []rune(line)
	out := make([]rune, 0, len(chars))
	for i, c := range chars {
		if c == ' ' && i > 0 && i+1 < len(chars) && ocrIsCJK(chars[i-1]) && ocrIsCJK(chars[i+1]) {
			continue
		}
		out = append(out, c)
	}
	return string(out)
}

// ocrPickResult returns the index of the OCR result to use. results[0]
// comes from the user-profile language and wins unless another engine read
// at least 20% more non-whitespace characters, so an engine for another
// script only takes over when it clearly saw text the profile engine could
// not read.
func ocrPickResult(results []string) int {
	score := func(text string) int {
		n := 0
		for _, c := range text {
			if !unicode.IsSpace(c) {
				n++
			}
		}
		return n
	}
	profile := 0
	if len(results) > 0 {
		profile = score(results[0])
	}
	best, bestScore := 0, profile
	for i := 1; i < len(results); i++ {
		if s := score(results[i]); s*5 > profile*6 && s > bestScore {
			best, bestScore = i, s
		}
	}
	return best
}

// ocrOpaque returns img as an opaque RGBA image from 0, 0, scaled down to
// fit in maxDim pixels each way when maxDim > 0: transparent pixels go on
// white, as they look in the screenshot window.
func ocrOpaque(img image.Image, maxDim int) *image.RGBA {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if maxDim > 0 && (w > maxDim || h > maxDim) {
		if w >= h {
			w, h = maxDim, max(1, h*maxDim/w)
		} else {
			w, h = max(1, w*maxDim/h), maxDim
		}
	}
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(dst, dst.Bounds(), image.White, image.Point{}, draw.Src)
	if w == b.Dx() && h == b.Dy() {
		draw.Draw(dst, dst.Bounds(), img, b.Min, draw.Over)
	} else {
		xdraw.CatmullRom.Scale(dst, dst.Bounds(), img, b, draw.Over, nil)
	}
	return dst
}
