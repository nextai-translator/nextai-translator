package sys

// captureRect is a rectangle of the screen, in pixels or in DIPs.
type captureRect struct{ X, Y, W, H int }

// captureDisplay is a monitor in the screen's pixels, with its DPI.
type captureDisplay struct {
	bounds captureRect
	dpi    int
}

// captureDIPSpace maps between the screen's pixels and MyGo's DIPs on
// Windows, as MyGo's internal/windows dipSpace does, so that a rectangle of
// mygo.Display.Bounds lands on the pixels it names. A display's DIPs start
// at its top-left pixel scaled by the smallest scale of all the displays,
// and go on in its own scale from there:
//
//	DIP = origin × 96 / minDPI + (pixel − origin) × 96 / dpi
type captureDIPSpace struct {
	displays []captureDisplay
	minDPI   int
}

func captureNewDIPSpace(displays []captureDisplay, fallback int) captureDIPSpace {
	if fallback <= 0 {
		fallback = 96
	}
	s := captureDIPSpace{minDPI: fallback}
	for i, d := range displays {
		if d.dpi <= 0 {
			d.dpi = fallback
		}
		s.displays = append(s.displays, d)
		if i == 0 || d.dpi < s.minDPI {
			s.minDPI = d.dpi
		}
	}
	return s
}

// captureScaled returns v × num / den rounded to the nearest integer,
// halves up, for negative v too.
func captureScaled(v, num, den int) int { return captureFloorDiv(2*v*num+den, 2*den) }

func captureFloorDiv(a, b int) int {
	q := a / b
	if a%b != 0 && a < 0 {
		q--
	}
	return q
}

// origin returns display i's top-left pixel, where it is in DIPs, and its
// DPI.
func (s captureDIPSpace) origin(i int) (pxX, pxY, dipX, dipY, dpi int) {
	if i < 0 || i >= len(s.displays) {
		return 0, 0, 0, 0, s.minDPI
	}
	d := s.displays[i]
	return d.bounds.X, d.bounds.Y, captureScaled(d.bounds.X, 96, s.minDPI), captureScaled(d.bounds.Y, 96, s.minDPI), d.dpi
}

func (s captureDIPSpace) toDIPOn(i int, r captureRect) captureRect {
	px, py, dx, dy, dpi := s.origin(i)
	return captureRect{dx + captureScaled(r.X-px, 96, dpi), dy + captureScaled(r.Y-py, 96, dpi), captureScaled(r.W, 96, dpi), captureScaled(r.H, 96, dpi)}
}

func (s captureDIPSpace) toPixelsOn(i int, r captureRect) captureRect {
	px, py, dx, dy, dpi := s.origin(i)
	return captureRect{px + captureScaled(r.X-dx, dpi, 96), py + captureScaled(r.Y-dy, dpi, 96), captureScaled(r.W, dpi, 96), captureScaled(r.H, dpi, 96)}
}

// toPixels converts r, in DIPs, to pixels through the scale of the display
// it is the most on, as MyGo places a window's bounds.
func (s captureDIPSpace) toPixels(r captureRect) captureRect {
	dips := func(i int) captureRect { return s.toDIPOn(i, s.displays[i].bounds) }
	pixels := func(i int) captureRect { return s.displays[i].bounds }
	order := captureByOverlap(r, len(s.displays), dips)
	for _, i := range order {
		px := s.toPixelsOn(i, r)
		if o := captureByOverlap(px, len(s.displays), pixels); len(o) > 0 && o[0] == i {
			return px
		}
	}
	if len(order) == 0 {
		return s.toPixelsOn(-1, r)
	}
	return s.toPixelsOn(order[0], r)
}

// captureByOverlap returns the n displays from the one r overlaps the most
// to the one it overlaps the least, then those it does not overlap from
// the nearest to the farthest.
func captureByOverlap(r captureRect, n int, bounds func(int) captureRect) []int {
	r.W, r.H = max(r.W, 1), max(r.H, 1)
	type rank struct {
		i              int
		area, distance int64
	}
	ranks := make([]rank, n)
	for i := range n {
		b := bounds(i)
		w := min(r.X+r.W, b.X+b.W) - max(r.X, b.X)
		h := min(r.Y+r.H, b.Y+b.H) - max(r.Y, b.Y)
		k := rank{i: i}
		if w > 0 && h > 0 {
			k.area = int64(w) * int64(h)
		} else {
			dx, dy := int64(max(0, -w)), int64(max(0, -h))
			k.distance = dx*dx + dy*dy
		}
		ranks[i] = k
	}
	for i := 1; i < n; i++ {
		for j := i; j > 0; j-- {
			a, b := ranks[j-1], ranks[j]
			if a.area > b.area || a.area == b.area && a.distance <= b.distance {
				break
			}
			ranks[j-1], ranks[j] = b, a
		}
	}
	order := make([]int, n)
	for i, k := range ranks {
		order[i] = k.i
	}
	return order
}
