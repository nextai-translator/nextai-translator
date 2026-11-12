package sys

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/draw"
	"math"
	"os"
	"sort"
	"strings"
	"testing"

	gtfont "github.com/go-text/typesetting/font"
	ot "github.com/go-text/typesetting/font/opentype"
	"golang.org/x/image/font/gofont/goregular"
)

func TestOCRJoinCJKSpaces(t *testing.T) {
	for in, want := range map[string]string{
		"HeIIo WorId 你 好 世 界": "HeIIo WorId 你好世界",
		"Kimi 半 年 三 次 道 歉":    "Kimi 半年三次道歉",
		"“ 行 李 箱 ” 装 下":       "“ 行李箱 ” 装下",
		"こ ん に ち は":           "こんにちは",
		"안녕 하세요":              "안녕 하세요",
		"plain english text":  "plain english text",
	} {
		if got := ocrJoinCJKSpaces(in); got != want {
			t.Errorf("ocrJoinCJKSpaces(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestOCRPickResult(t *testing.T) {
	for _, c := range []struct {
		name    string
		results []string
		want    int
	}{
		{"keeps profile result when others read about the same", []string{"Hello world", "He11o w0rld!"}, 0},
		// #1902: an en-US engine on a Chinese page keeps only the digits.
		{"switches to engine that read another script", []string{"1\n2\n3\nKimi\n", "1 微信转账\n2 喜欢吃\n3 行李箱\nKimi 道歉\n"}, 1},
		{"prefers the best of several candidates", []string{"", "ab", "abcdef"}, 2},
		{"empty profile result loses to any text", []string{"", "你好"}, 1},
		{"no results", nil, 0},
	} {
		if got := ocrPickResult(c.results); got != c.want {
			t.Errorf("%s: ocrPickResult = %d, want %d", c.name, got, c.want)
		}
	}
}

func TestCaptureDIPSpace(t *testing.T) {
	// A 150% primary display of 2880 × 1620 pixels, and a 100% one right
	// of it: the smallest scale is 100%, so the second one's DIPs start at
	// its pixel 2880, past a gap after the primary's 1920 DIPs.
	s := captureNewDIPSpace([]captureDisplay{
		{bounds: captureRect{0, 0, 2880, 1620}, dpi: 144},
		{bounds: captureRect{2880, 0, 1920, 1080}, dpi: 96},
	}, 96)
	for _, c := range []struct{ in, want captureRect }{
		{captureRect{100, 100, 200, 50}, captureRect{150, 150, 300, 75}},
		{captureRect{0, 0, 1920, 1080}, captureRect{0, 0, 2880, 1620}},
		{captureRect{2900, 10, 100, 100}, captureRect{2900, 10, 100, 100}},
	} {
		if got := s.toPixels(c.in); got != c.want {
			t.Errorf("toPixels(%v) = %v, want %v", c.in, got, c.want)
		}
	}
	// A 200% primary and a 100% display left of it, at negative pixels.
	s = captureNewDIPSpace([]captureDisplay{
		{bounds: captureRect{0, 0, 3840, 2160}, dpi: 192},
		{bounds: captureRect{-1920, 0, 1920, 1080}, dpi: 96},
	}, 192)
	for _, c := range []struct{ in, want captureRect }{
		{captureRect{10, 20, 30, 40}, captureRect{20, 40, 60, 80}},
		{captureRect{-1900, 0, 100, 100}, captureRect{-1900, 0, 100, 100}},
	} {
		if got := s.toPixels(c.in); got != c.want {
			t.Errorf("toPixels(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

// ocrTestFont returns a system font with Chinese glyphs, or Go's own font,
// which has none, and whether it has them.
func ocrTestFont(t *testing.T) (*gtfont.Face, bool) {
	t.Helper()
	for _, path := range []string{
		`C:\Windows\Fonts\msyh.ttc`,
		`C:\Windows\Fonts\simsun.ttc`,
		"/System/Library/Fonts/Hiragino Sans GB.ttc",
		"/System/Library/Fonts/STHeiti Medium.ttc",
		"/System/Library/Fonts/PingFang.ttc",
		"/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
	} {
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var face *gtfont.Face
		if faces, err := gtfont.ParseTTC(bytes.NewReader(data)); err == nil && len(faces) > 0 {
			face = faces[0]
		} else if face, err = gtfont.ParseTTF(bytes.NewReader(data)); err != nil {
			continue
		}
		if _, ok := face.NominalGlyph('你'); ok {
			t.Logf("font: %s", path)
			return face, true
		}
	}
	face, err := gtfont.ParseTTF(bytes.NewReader(goregular.TTF))
	if err != nil {
		t.Fatal(err)
	}
	t.Log("font: Go Regular, no Chinese")
	return face, false
}

// ocrTestImage draws lines of black text on white, 56 pixels high, with
// a scanline fill of the glyphs' outlines by the nonzero rule.
func ocrTestImage(t *testing.T, face *gtfont.Face, lines ...string) *image.RGBA {
	t.Helper()
	const size = 56.0
	img := image.NewRGBA(image.Rect(0, 0, 900, 60+100*len(lines)))
	draw.Draw(img, img.Bounds(), image.White, image.Point{}, draw.Src)
	scale := size / float64(face.Upem())
	type edge struct{ x0, y0, x1, y1 float64 }
	var edges []edge
	for i, line := range lines {
		penX, baseline := 40.0, float64(100+100*i)
		for _, r := range line {
			gid, ok := face.NominalGlyph(r)
			if !ok {
				t.Fatalf("no glyph for %q", r)
			}
			pt := func(p gtfont.SegmentPoint) (float64, float64) {
				return penX + float64(p.X)*scale, baseline - float64(p.Y)*scale
			}
			outline, _ := face.GlyphData(gid).(gtfont.GlyphOutline)
			var cx, cy, sx, sy float64
			lineTo := func(x, y float64) {
				edges = append(edges, edge{cx, cy, x, y})
				cx, cy = x, y
			}
			closePath := func() {
				if cx != sx || cy != sy {
					lineTo(sx, sy)
				}
			}
			for _, seg := range outline.Segments {
				switch seg.Op {
				case ot.SegmentOpMoveTo:
					closePath()
					cx, cy = pt(seg.Args[0])
					sx, sy = cx, cy
				case ot.SegmentOpLineTo:
					lineTo(pt(seg.Args[0]))
				case ot.SegmentOpQuadTo, ot.SegmentOpCubeTo:
					x0, y0 := cx, cy
					x1, y1 := pt(seg.Args[0])
					x2, y2 := pt(seg.Args[1])
					for k := 1; k <= 16; k++ {
						u := float64(k) / 16
						v := 1 - u
						if seg.Op == ot.SegmentOpQuadTo {
							lineTo(v*v*x0+2*v*u*x1+u*u*x2, v*v*y0+2*v*u*y1+u*u*y2)
						} else {
							x3, y3 := pt(seg.Args[2])
							lineTo(v*v*v*x0+3*v*v*u*x1+3*v*u*u*x2+u*u*u*x3, v*v*v*y0+3*v*v*u*y1+3*v*u*u*y2+u*u*u*y3)
						}
					}
				}
			}
			closePath()
			penX += float64(face.HorizontalAdvance(gid)) * scale
		}
	}
	type crossing struct {
		x   float64
		dir int
	}
	for y := 0; y < img.Rect.Dy(); y++ {
		fy := float64(y) + 0.5
		var xs []crossing
		for _, e := range edges {
			if (e.y0 <= fy) == (e.y1 <= fy) {
				continue
			}
			dir := 1
			if e.y1 < e.y0 {
				dir = -1
			}
			xs = append(xs, crossing{e.x0 + (fy-e.y0)*(e.x1-e.x0)/(e.y1-e.y0), dir})
		}
		sort.Slice(xs, func(i, j int) bool { return xs[i].x < xs[j].x })
		winding := 0
		for i, c := range xs {
			winding += c.dir
			if winding != 0 && i+1 < len(xs) {
				for x := int(math.Round(c.x)); x < int(math.Round(xs[i+1].x)); x++ {
					img.Set(x, y, color.Black)
				}
			}
		}
	}
	return img
}

func TestRecognizeText(t *testing.T) {
	f, cjk := ocrTestFont(t)
	lines := []string{"Hello World"}
	if cjk {
		lines = append(lines, "你好世界")
	}
	text, err := RecognizeText(ocrTestImage(t, f, lines...))
	if errors.Is(err, ErrUnsupported) {
		t.Skip(err)
	}
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("recognized: %q", text)
	// Windows' zh-Hans engine may read the Latin line as "HeIIo WorId".
	if !strings.Contains(text, "He") || !strings.Contains(text, "W") {
		t.Errorf("no Hello World in %q", text)
	}
	if cjk && !strings.Contains(text, "你好世界") {
		t.Errorf("no 你好世界 in %q", text)
	}
	if text, err := RecognizeText(image.NewRGBA(image.Rect(0, 0, 0, 0))); err != nil || text != "" {
		t.Errorf("empty image: %q, %v", text, err)
	}
}

func TestCaptureScreen(t *testing.T) {
	if _, err := CaptureScreen(0, 0, 0, 10); err == nil {
		t.Error("empty rectangle captured")
	}
	img, err := CaptureScreen(0, 0, 64, 32)
	if errors.Is(err, ErrUnsupported) {
		t.Skip(err)
	}
	if err != nil {
		// A session without a desktop, as over SSH, has no screen.
		t.Skipf("no screen to capture: %v", err)
	}
	b := img.Bounds()
	t.Logf("captured 64x32 as %dx%d, screen capture allowed: %v", b.Dx(), b.Dy(), ScreenCaptureAllowed())
	if b.Dx() < 64 || b.Dy() < 32 || b.Dx()*32 != b.Dy()*64 {
		t.Errorf("captured %v for 64x32", b)
	}
}
