package sys

// This file has no build constraint: mapping the screen's pixels to MyGo's
// DIPs is plain arithmetic, tested everywhere; Windows uses it.

// pixelDisplay is a display in the screen's pixels, with its DPI.
type pixelDisplay struct {
	x, y, w, h int
	dpi        int
}

// pixelRectToDIP converts a rectangle in the screen's pixels, as Windows
// gives a caret or a window to a per-monitor DPI aware process, to MyGo's
// screen coordinates, the way MyGo places its windows on Windows: each
// display's DIPs start at its top-left pixel scaled by the smallest scale
// of all the displays, and go on in its own scale from there.
func pixelRectToDIP(displays []pixelDisplay, x, y, w, h int) (float64, float64, float64, float64) {
	minDPI := 96
	displays = append([]pixelDisplay(nil), displays...)
	for i, d := range displays {
		if d.dpi <= 0 {
			displays[i].dpi = 96
		}
		if i == 0 || displays[i].dpi < minDPI {
			minDPI = displays[i].dpi
		}
	}
	// The display the rectangle is the most on, or the nearest.
	best, bestArea, bestDist := -1, int64(0), int64(-1)
	rw, rh := max(w, 1), max(h, 1)
	for i, d := range displays {
		ow := min(x+rw, d.x+d.w) - max(x, d.x)
		oh := min(y+rh, d.y+d.h) - max(y, d.y)
		if ow > 0 && oh > 0 {
			if a := int64(ow) * int64(oh); a > bestArea {
				best, bestArea = i, a
			}
			continue
		}
		if bestArea > 0 {
			continue
		}
		dx, dy := int64(max(0, -ow)), int64(max(0, -oh))
		if dist := dx*dx + dy*dy; bestDist < 0 || dist < bestDist {
			best, bestDist = i, dist
		}
	}
	if best < 0 {
		return float64(x), float64(y), float64(w), float64(h)
	}
	d := displays[best]
	scale := 96 / float64(d.dpi)
	ox, oy := float64(d.x)*96/float64(minDPI), float64(d.y)*96/float64(minDPI)
	return ox + float64(x-d.x)*scale, oy + float64(y-d.y)*scale, float64(w) * scale, float64(h) * scale
}
