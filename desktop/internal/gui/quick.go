package gui

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/ui"
	"github.com/egoist/mygo/ui/markdown"
	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
	"github.com/nextai-translator/nextai-translator/desktop/internal/sys"
	"github.com/nextai-translator/nextai-translator/desktop/internal/translate"
)

// The Quick Translator is QuickTranslator.tsx: a panel at the bottom of the
// display that reads the text around the pointer, has the model pick what
// the user most likely wants translated, and translates the first pick.

type candidate struct {
	text, kind, reason string
}

type quickState struct {
	ctx        sys.AXContext
	candidates []candidate
	active     int
	picking    bool
	pickErr    string
	output     string
	running    bool
	trErr      string
	wide       bool
	gen        int // bumps on every pick, so late answers are dropped
	trGen      int
	cancel     context.CancelFunc
	trCancel   context.CancelFunc
}

// ShowQuickTranslator brings the panel up on the display under the pointer
// and starts reading the screen.
func (a *App) ShowQuickTranslator() {
	if a.quickWin == nil || a.quickWin.IsDestroyed() {
		a.quickWin = mygo.NewWindow(mygo.WindowOptions{
			Title:        "",
			Content:      ui.View(a.quickView),
			Width:        560,
			Height:       320,
			MinWidth:     420,
			MinHeight:    220,
			MaxWidth:     820,
			MaxHeight:    620,
			Frameless:    true,
			Panel:        true,
			Transparent:  true,
			Vibrancy:     mygo.VibrancyPopover,
			CornerRadius: 12,
			SkipTaskbar:  true,
			Hidden:       true,
		})
		a.quickWin.OnClose(func(e *mygo.CloseEvent) {
			if a.quitting {
				return
			}
			e.PreventDefault()
			a.HideQuickTranslator()
		})
	}
	// The bottom middle of the display under the pointer, 96 above its edge.
	area := mygo.Screen.DisplayNearestPoint(mygo.Screen.CursorScreenPoint()).WorkArea
	w, h := a.quickWin.Size()
	x := area.X + (area.Width-w)/2
	y := area.Y + area.Height - h - 96
	a.quickWin.SetPosition(max(x, area.X), max(y, area.Y))
	a.quickWin.SetAlwaysOnTop(true)
	// Shown without the focus: the app in front is the one read. The panel
	// takes the keyboard (for esc) once the screen has been read.
	a.quickWin.ShowInactive()
	a.qt.wide = false
	a.pickCandidates(false)
}

// HideQuickTranslator stops what the panel runs and hides it.
func (a *App) HideQuickTranslator() {
	a.qt.gen++
	a.qt.trGen++
	if a.qt.cancel != nil {
		a.qt.cancel()
	}
	if a.qt.trCancel != nil {
		a.qt.trCancel()
	}
	a.qt.picking, a.qt.running = false, false
	if a.quickWin != nil && !a.quickWin.IsDestroyed() {
		a.quickWin.Hide()
	}
}

// candidateLine is a line of the picker's answer: TYPE :: TEXT :: REASON.
var candidateLine = regexp.MustCompile(`(?i)^([0-9]+[).\s]+)?(word|phrase|sentence)\s*::\s*(.+?)\s*::\s*(.+)$`)

func parseCandidates(s string) []candidate {
	var out []candidate
	for _, raw := range strings.Split(s, "\n") {
		m := candidateLine.FindStringSubmatch(strings.TrimSpace(raw))
		if m == nil {
			continue
		}
		text := strings.TrimSpace(m[3])
		text = strings.TrimSuffix(strings.TrimPrefix(text, `"`), `"`)
		text = strings.TrimSuffix(strings.TrimPrefix(text, `'`), `'`)
		reason := strings.TrimSpace(m[4])
		if text != "" && reason != "" {
			out = append(out, candidate{text: text, kind: strings.ToLower(m[2]), reason: reason})
		}
	}
	return out
}

func clipText(s string, n int) string {
	flat := strings.Join(strings.Fields(s), " ")
	if r := []rune(flat); len(r) > n {
		return string(r[:n]) + "…"
	}
	return flat
}

func summarizeContext(c sys.AXContext) string {
	var parts []string
	if strings.TrimSpace(c.SelectedText) != "" {
		parts = append(parts, fmt.Sprintf("USER_SELECTED: %q", clipText(c.SelectedText, 200)))
	}
	if strings.TrimSpace(c.HoveredText) != "" {
		parts = append(parts, fmt.Sprintf("UNDER_CURSOR: %q", clipText(c.HoveredText, 220)))
	}
	if strings.TrimSpace(c.FocusedText) != "" {
		parts = append(parts, fmt.Sprintf("FOCUSED_ELEMENT: %q", clipText(c.FocusedText, 600)))
	}
	if len(c.Paragraphs) > 0 {
		ps := make([]string, len(c.Paragraphs))
		for i, p := range c.Paragraphs {
			ps[i] = clipText(p, 280)
		}
		parts = append(parts, "WINDOW_PARAGRAPHS:\n"+strings.Join(ps, "\n"))
	}
	if c.AppName != "" {
		app := "APP: " + c.AppName
		if c.AppBundleID != "" {
			app += " (" + c.AppBundleID + ")"
		}
		parts = append(parts, app)
	}
	return strings.Join(parts, "\n\n")
}

func summarizeHistory(items []store.HistoryItem, now time.Time) string {
	if len(items) == 0 {
		return "No prior lookups recorded."
	}
	const day = 24 * time.Hour
	var week, month, quarter, older, words int
	var recent, longish []string
	for _, it := range items {
		switch age := now.Sub(time.UnixMilli(it.CreatedAt)); {
		case age < 7*day:
			week++
		case age < 30*day:
			month++
		case age < 90*day:
			quarter++
		default:
			older++
		}
		t := strings.TrimSpace(it.Text)
		n := len(strings.Fields(t))
		words += n
		if len(recent) < 12 {
			recent = append(recent, t)
		}
		if n >= 3 && len(longish) < 8 {
			longish = append(longish, t)
		}
	}
	avg := float64(int(float64(words)/float64(len(items))*10+.5)) / 10
	lines := []string{
		fmt.Sprintf("Recent counts — 7d:%d, 30d:%d, 90d:%d, older:%d.", week, month, quarter, older),
		fmt.Sprintf("Average lookup length: %v words.", avg),
	}
	if len(recent) > 0 {
		lines = append(lines, "Sample recent lookups: "+strings.Join(recent, "; "))
	}
	if len(longish) > 0 {
		lines = append(lines, "Sample multi-word lookups: "+strings.Join(longish, "; "))
	}
	return strings.Join(lines, "\n")
}

func pickerPrompts(c sys.AXContext, history, target string) engine.Request {
	role := `You assist an English learner. The user can read but sometimes wants to look up a word, phrase, or sentence that appears in the screen reader text in front of them. Their typical lookup history reveals their level. Pick at most 4 candidates that they are most likely to want translated next. Prefer the rarest/most novel content over common words they would already know.
Target language for translation is ` + target + `.
Output format — exactly one candidate per line, no preamble, no JSON, no markdown:
TYPE :: TEXT :: REASON
Where TYPE is one of word, phrase, sentence. TEXT is the exact span as it appears on screen (do not paraphrase). REASON is one short clause explaining why this candidate matters to this user.
Order candidates from most likely to least likely. Output 1–4 lines.`
	cmd := "User lookup history fingerprint:\n" + history + "\n\nScreen context:\n" + summarizeContext(c) + "\n\nReturn candidates now."
	return engine.Request{RolePrompt: role, CommandPrompt: cmd}
}

// pickCandidates reads the screen and asks the model what to translate.
func (a *App) pickCandidates(wide bool) {
	if a.qt.cancel != nil {
		a.qt.cancel()
	}
	if a.qt.trCancel != nil {
		a.qt.trCancel()
	}
	a.qt.gen++
	a.qt.trGen++
	gen := a.qt.gen
	ctx, cancel := context.WithCancel(context.Background())
	a.qt.cancel = cancel
	a.qt.wide = a.qt.wide || wide
	a.qt.candidates, a.qt.active, a.qt.picking, a.qt.pickErr = nil, 0, true, ""
	a.qt.output, a.qt.trErr, a.qt.running = "", "", false
	s := a.Settings.Get()
	client := a.httpClient(s)
	target := s.DefaultTargetLanguage
	if target == "" {
		target = "en"
	}
	history := a.Store.History(store.HistoryQuery{Limit: 200})
	current := func() bool { return gen == a.qt.gen }
	go func() {
		defer cancel()
		axc := a.ReadContext(wide)
		a.post(func() {
			if current() {
				a.qt.ctx = axc
				if a.quickWin != nil && a.quickWin.IsVisible() {
					a.quickWin.Focus()
				}
			}
		})
		if strings.TrimSpace(axc.FocusedText+axc.HoveredText+axc.SelectedText) == "" && len(axc.Paragraphs) == 0 {
			a.post(func() {
				if current() {
					a.qt.picking, a.qt.pickErr = false, T("Unable to read text from the foreground app.")
				}
			})
			return
		}
		e, err := a.NewEngine(s.Provider, s, client)
		var buf strings.Builder
		if err == nil {
			n := 0
			_, err = e.Send(ctx, pickerPrompts(axc, summarizeHistory(history, time.Now()), target), func(t string) {
				buf.WriteString(t)
				next := parseCandidates(buf.String())
				if len(next) == n {
					return
				}
				first := n == 0
				n = len(next)
				a.post(func() {
					if !current() {
						return
					}
					a.qt.candidates = next
					if first {
						a.translateCandidate(0)
					}
				})
			})
		}
		a.post(func() {
			if !current() {
				return
			}
			a.qt.picking = false
			switch {
			case err != nil && ctx.Err() == nil:
				a.qt.pickErr = err.Error()
			case err == nil && len(parseCandidates(buf.String())) == 0:
				a.qt.pickErr = T("Could not extract candidates from the screen text.")
			}
		})
	}()
}

// translateCandidate translates the i-th candidate with the translate action.
func (a *App) translateCandidate(i int) {
	if i < 0 || i >= len(a.qt.candidates) {
		return
	}
	if a.qt.trCancel != nil {
		a.qt.trCancel()
	}
	a.qt.active = i
	a.qt.trGen++
	gen := a.qt.trGen
	ctx, cancel := context.WithCancel(context.Background())
	a.qt.trCancel = cancel
	a.qt.output, a.qt.trErr, a.qt.running = "", "", true
	text := a.qt.candidates[i].text
	s := a.Settings.Get()
	client := a.httpClient(s)
	target := s.DefaultTargetLanguage
	if target == "" {
		target = "en"
	}
	action, ok := a.Store.ActionByMode(store.ModeTranslate)
	if !ok {
		a.qt.running, a.qt.trErr = false, T("No translate action found.")
		cancel()
		return
	}
	current := func() bool { return gen == a.qt.trGen }
	go func() {
		defer cancel()
		src := a.Detect(ctx, client, s.LanguageDetection, text)
		_, err := a.Run(ctx, translate.Query{Text: text, Source: src, Target: target, Action: action}, s, client, func(t string) {
			a.post(func() {
				if current() {
					a.qt.output += t
				}
			})
		})
		a.post(func() {
			if !current() {
				return
			}
			a.qt.running = false
			if err != nil && ctx.Err() == nil {
				a.qt.trErr = err.Error()
			}
		})
	}()
}

// quickColors are the panel's hairlines and fills, by theme.
func quickColors(dark bool) (hairline, subtle, hover, active ui.Color) {
	if dark {
		return ui.RGBA(255, 255, 255, .07), ui.RGBA(255, 255, 255, .05), ui.RGBA(255, 255, 255, .08), ui.RGBA(255, 255, 255, .13)
	}
	return ui.RGBA(0, 0, 0, .07), ui.RGBA(0, 0, 0, .04), ui.RGBA(0, 0, 0, .06), ui.RGBA(0, 0, 0, .08)
}

func (a *App) quickView(c *ui.Context) {
	p := pal(c)
	s := a.Settings.Get()
	if c.Shortcut(0, ui.KeyEscape) {
		a.HideQuickTranslator()
		return
	}
	hairline, subtle, hover, activeFill := quickColors(p.dark)
	root := ui.Column(c).Fill().TextColor(p.text)
	if !c.Vibrancy() {
		root.Background(p.bg)
	}
	root.Children(func() {
		// Header: the dot, the title and the app read, and close.
		ui.Row(c).Padding(11, 14, 9, 14).Gap(10).AlignItems(ui.Center).DragWindow().TextColor(p.secondary).Children(func() {
			ui.Row(c).Gap(8).AlignItems(ui.Center).Grow(1).MinWidth(0).Children(func() {
				ui.Box(c).Size(6, 6).Radius(3).LinearGradient(ui.LinearGradient{
					Angle: 135,
					Stops: []ui.GradientStop{{Color: ui.RGB(255, 138, 76), At: 0}, {Color: ui.RGB(193, 79, 203), At: .6}, {Color: ui.RGB(93, 108, 255), At: 1}},
				}).Shadow(0, 0, 8, 0, ui.RGBA(125, 90, 255, .35))
				ui.Text(c, strings.ToUpper(T("Quick Translator"))).FontSize(10.5).FontWeight(600).LetterSpacing(.95).SingleLine()
				if host := a.qt.ctx.AppName; host != "" {
					ui.Text(c, "·").FontSize(10.5).Opacity(.4).Margin(0, 2)
					ui.Text(c, host).FontSize(11).FontWeight(500).TextColor(p.tertiary).SingleLine().Tooltip(host)
				}
			})
			b := ui.Row(c.Key("close")).Size(22, 22).Radius(11).Center().Cursor(ui.CursorPointer).
				Role(ui.RoleButton).Label(T("Close")).Tooltip(T("Close"))
			if b.Hovered() {
				b.Background(hover)
			} else {
				b.Opacity(.55)
			}
			b.Children(func() { ui.Icon(c, riRxCross2).Size(13, 13) })
			if b.Clicked() {
				a.HideQuickTranslator()
			}
		})
		// The candidates.
		ui.Row(c).Wrap().Gap(6).Padding(0, 14, 12, 14).Children(func() {
			switch {
			case a.qt.picking && len(a.qt.candidates) == 0:
				ui.Row(c).Gap(8).Padding(4, 0).AlignItems(ui.Center).TextColor(p.tertiary).Children(func() {
					ui.Spinner(c).Size(12, 12)
					ui.Text(c, T("Detecting what you are reading…")).FontSize(12)
				})
			case !a.qt.picking && a.qt.pickErr != "" && len(a.qt.candidates) == 0:
				ui.Text(c, a.qt.pickErr).FontSize(12).TextColor(p.tertiary).Padding(4, 0).Wrap()
			}
			for i, cd := range a.qt.candidates {
				chip := ui.Row(c.Key(i)).Padding(5, 10, 5, 8).Gap(6).Radius(999).AlignItems(ui.Baseline).
					Border(1, hairline).Background(subtle).Cursor(ui.CursorPointer).Role(ui.RoleButton).Tooltip(cd.reason)
				switch {
				case i == a.qt.active:
					border := ui.RGBA(0, 0, 0, .14)
					if p.dark {
						border = ui.RGBA(255, 255, 255, .22)
					}
					chip.Background(activeFill).BorderColor(border)
				case chip.Hovered():
					chip.Background(hover)
				}
				chip.Children(func() {
					ui.Text(c, strings.ToUpper(cd.kind)).FontSize(9).FontWeight(600).LetterSpacing(.63).TextColor(p.tertiary)
					ui.Text(c, cd.text).FontSize(12.5).FontWeight(500).LineHeight(1.25).MaxWidth(320).SingleLine()
				})
				if chip.Clicked() {
					a.translateCandidate(i)
				}
			}
		})
		if len(a.qt.candidates) > 0 || a.qt.running || a.qt.output != "" || a.qt.trErr != "" {
			ui.Box(c).Height(1).Margin(0, 14).Background(hairline)
		}
		// The translation.
		fs := float32(s.FontSize)
		ui.Scroll(c.Key("out")).Grow(1).Children(func() {
			ui.Column(c).Padding(14, 16, 12, 16).Selectable().Children(func() {
				if a.qt.trErr != "" {
					ui.Text(c, a.qt.trErr).FontSize(12.5).TextColor(p.errText).Wrap()
				}
				if a.qt.output == "" && a.qt.running {
					ui.Row(c).Gap(8).AlignItems(ui.Center).TextColor(p.tertiary).Children(func() {
						ui.Spinner(c).Size(12, 12)
						label := T("Translating…")
						if a.qt.active < len(a.qt.candidates) {
							label = strings.ReplaceAll(T("Translating “{{text}}”…"), "{{text}}", a.qt.candidates[a.qt.active].text)
						}
						ui.Text(c, label).FontSize(12.5).Wrap()
					})
				}
				if a.qt.output != "" {
					th := markdown.DefaultTheme(c.Theme())
					th.FontSize, th.LineHeight, th.Text = fs, 1.65, p.text
					o := &markdown.Options{Theme: th}
					if a.qt.running {
						markdown.Stream(c, a.qt.output, o)
					} else {
						markdown.View(c, a.qt.output, o)
					}
				}
			})
		})
		// Footer: esc closes; wider context; re-detect.
		ui.Row(c).Padding(8, 14, 10, 14).Gap(10).AlignItems(ui.Center).TextColor(p.tertiary).Children(func() {
			ui.Row(c).Gap(6).AlignItems(ui.Center).Opacity(.85).Grow(1).Children(func() {
				ui.Row(c).Height(16).MinWidth(16).Padding(0, 4).Radius(4).Center().Border(1, hairline).Background(subtle).
					TextColor(p.secondary).Children(func() { ui.Text(c, "esc").FontSize(10).FontWeight(600) })
				ui.Text(c, T("close")).FontSize(11)
				if a.qt.ctx.Truncated {
					ui.Text(c, "·").FontSize(11).Opacity(.4).Margin(0, 4)
					ui.Text(c, T("context truncated")).FontSize(11)
				}
			})
			wideLabel := T("use wider context")
			if a.qt.wide {
				wideLabel = T("wider context")
			}
			if quickAction(c, p, "wide", wideLabel, hover, a.qt.picking || a.qt.wide) {
				a.pickCandidates(true)
			}
			if quickAction(c, p, "redetect", T("re-detect"), hover, a.qt.picking) {
				a.pickCandidates(a.qt.wide)
			}
		})
	})
}

func quickAction(c *ui.Context, p palette, key, label string, hover ui.Color, disabled bool) bool {
	b := ui.Row(c.Key(key)).Padding(3, 8).Radius(6).TextColor(p.secondary).Role(ui.RoleButton)
	if disabled {
		b.Opacity(.35)
	} else {
		b.Cursor(ui.CursorPointer)
		if b.Hovered() {
			b.Background(hover).TextColor(p.text)
		}
	}
	b.Children(func() { ui.Text(c, label).FontSize(11) })
	return b.Clicked() && !disabled
}
