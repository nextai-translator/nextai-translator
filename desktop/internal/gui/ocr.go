package gui

import (
	"errors"
	"image"
	"log"
	"strings"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/sys"
)

// The OCR overlay is the Tauri app's screenshot window: the display under
// the pointer, frozen, where a drag picks the region to read. Its text goes
// to the translator.

type ocrState struct {
	shot     *image.RGBA
	bitmap   *ui.Bitmap
	bounds   mygo.Rectangle // the display, in screen DIPs
	dragging bool
	x0, y0   float32 // where the drag started, in the window
	x1, y1   float32
}

// StartOCR captures the display under the pointer and shows the overlay.
func (a *App) StartOCR() {
	if !sys.ScreenCaptureAllowed() {
		sys.RequestScreenCapture()
		if !sys.ScreenCaptureAllowed() {
			a.ShowNotice(T("Please grant screen recording permission to the app, then restart it"))
			a.ShowTranslator(false)
			if sys.ScreenCaptureSettingsURL != "" {
				_ = mygo.Shell.OpenExternal(sys.ScreenCaptureSettingsURL)
			}
			return
		}
	}
	if a.ocrWin != nil && !a.ocrWin.IsDestroyed() && a.ocrWin.IsVisible() {
		return
	}
	b := mygo.Screen.DisplayNearestPoint(mygo.Screen.CursorScreenPoint()).Bounds
	go func() {
		shot, err := a.Capture(b.X, b.Y, b.Width, b.Height)
		a.post(func() {
			if err != nil {
				a.ShowNotice(err.Error())
				a.ShowTranslator(false)
				return
			}
			a.ocr = ocrState{shot: shot, bitmap: ui.NewBitmap(shot), bounds: b}
			if a.ocrWin == nil || a.ocrWin.IsDestroyed() {
				a.ocrWin = mygo.NewWindow(mygo.WindowOptions{
					Content:       ui.View(a.ocrView),
					Frameless:     true,
					Hidden:        true,
					AlwaysOnTop:   true,
					SkipTaskbar:   true,
					DisableResize: true,
					DisableShadow: true,
				})
				a.ocrWin.OnClose(func(e *mygo.CloseEvent) {
					if a.quitting {
						return
					}
					e.PreventDefault()
					a.closeOCR()
				})
			}
			a.ocrWin.SetBounds(b)
			a.ocrWin.Show()
			a.ocrWin.Focus()
		})
	}()
}

func (a *App) closeOCR() {
	if a.ocrWin != nil && !a.ocrWin.IsDestroyed() {
		a.ocrWin.Hide()
	}
	a.ocr = ocrState{}
}

// ocrSelection is the dragged rectangle, in the window's DIPs.
func (o *ocrState) selection() ui.Rect {
	x, y := min(o.x0, o.x1), min(o.y0, o.y1)
	return ui.Rect{X: x, Y: y, W: max(o.x0, o.x1) - x, H: max(o.y0, o.y1) - y}
}

func (a *App) ocrView(c *ui.Context) {
	if c.Shortcut(0, ui.KeyEscape) {
		a.closeOCR()
		return
	}
	o := &a.ocr
	if o.bitmap == nil {
		return
	}
	area := ui.Box(c.Key("shot")).Fill().Cursor(ui.CursorCrosshair)
	if area.RightClicked() {
		a.closeOCR()
		return
	}
	x, y, _ := area.PointerPosition()
	switch pressed := area.Pressed(); {
	case pressed && !o.dragging:
		o.dragging, o.x0, o.y0, o.x1, o.y1 = true, x, y, x, y
	case pressed:
		o.x1, o.y1 = x, y
	case o.dragging:
		o.dragging = false
		r := o.selection()
		if r.W < 4 || r.H < 4 {
			a.closeOCR()
			return
		}
		a.recognize(r)
		return
	}
	bmp := o.bitmap
	area.Draw(func(p *ui.Painter, box ui.Rect) {
		p.Image(bmp, box, ui.FillBox)
		if o.dragging {
			r := o.selection()
			r.X, r.Y = r.X+box.X, r.Y+box.Y
			p.Fill(r, ui.Hex("#2080f020"), 0)
			p.Stroke(r, ui.Hex("#2080f0"), 0, 1)
		}
	})
}

// recognize reads the text in r of the screenshot and translates it.
func (a *App) recognize(r ui.Rect) {
	shot, b := a.ocr.shot, a.ocr.bounds
	a.closeOCR()
	// The shot has the display's pixels; the window, its DIPs.
	sx := float32(shot.Bounds().Dx()) / float32(b.Width)
	sy := float32(shot.Bounds().Dy()) / float32(b.Height)
	px := image.Rect(int(r.X*sx), int(r.Y*sy), int((r.X+r.W)*sx+.5), int((r.Y+r.H)*sy+.5)).
		Add(shot.Bounds().Min).Intersect(shot.Bounds())
	crop := shot.SubImage(px)
	go func() {
		text, err := a.OCR(crop)
		a.post(func() {
			switch {
			case errors.Is(err, sys.ErrUnsupported):
				a.ShowNotice(T("OCR is not supported on this system"))
			case err != nil:
				log.Printf("ocr: %v", err)
				a.ShowNotice(err.Error())
			case strings.TrimSpace(text) == "":
				a.ShowNotice(T("No text was recognized"))
			default:
				a.SetInput(strings.TrimSpace(text), true)
			}
			a.ShowTranslator(false)
		})
	}()
}
