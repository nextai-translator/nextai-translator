package sys

import (
	"strings"
	"unicode/utf8"
)

// AXContext is the text the Accessibility API reports around the pointer in
// the app in front. The Quick Translator uses it to guess which word or
// sentence the user is most likely interested in.
type AXContext struct {
	FocusedText, FocusedRole, SelectedText, HoveredText, HoveredRole, AppName, AppBundleID string

	MouseX, MouseY int
	Paragraphs     []string
	Truncated      bool
}

// ReadAXContext reads the text around the pointer in the app in front: narrow
// reads the focused/hovered/selected element, wide also walks the focused
// window for paragraphs, as read_narrow / read_wide do.
func ReadAXContext(wide bool) AXContext {
	ctx := axcRead(wide)
	if ctx.Paragraphs == nil {
		ctx.Paragraphs = []string{} // [] in JSON, as the Rust version sends
	}
	return ctx
}

// Limits on what is read, in characters (runes) and nodes.
const (
	axcMaxTextPerNode = 1200
	axcMaxFocusedText = 4000
	axcMaxWideNodes   = 300
	axcMaxWideDepth   = 8
	axcMaxWideTotal   = 8000
)

// axcTruncate keeps the first max runes of s.
func axcTruncate(s string, max int) string {
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	n := 0
	for i := range s {
		if n == max {
			return s[:i]
		}
		n++
	}
	return s
}

// axcBestText returns the first candidate that is not blank, trimmed and
// clipped to a node's limit. The candidates are an element's value, title
// and description, in that order; a missing one is "".
func axcBestText(candidates ...string) string {
	for _, c := range candidates {
		if t := strings.TrimSpace(c); t != "" {
			return axcTruncate(t, axcMaxTextPerNode)
		}
	}
	return ""
}

// axcFocusedText is the focused element's text: its whole value, clipped to
// the focused limit, or its best text when the value is blank.
func axcFocusedText(value string, best func() string) string {
	if strings.TrimSpace(value) == "" {
		return best()
	}
	return axcTruncate(value, axcMaxFocusedText)
}

// axcInterestingRole reports whether a role holds paragraph text.
func axcInterestingRole(role string) bool {
	switch role {
	case "AXStaticText", "AXTextArea", "AXTextField", "AXHeading", "AXLink":
		return true
	}
	return false
}

// axcWalker collects paragraph text from an accessibility tree, depth first,
// within the wide limits. N is a node; the callbacks read it.
type axcWalker[N any] struct {
	role func(N) string
	text func(N) string
	// each calls visit on n's children in order and stops when visit
	// returns false, returning false then.
	each func(n N, visit func(N) bool) bool

	out   []string
	total int
}

// walk visits n and its subtree. It returns false when it stopped at a limit,
// which also stops the rest of the walk: then the result is truncated. A node
// deeper than the depth limit counts as a limit too.
func (w *axcWalker[N]) walk(n N, depth int) bool {
	if depth > axcMaxWideDepth || len(w.out) >= axcMaxWideNodes || w.total >= axcMaxWideTotal {
		return false
	}
	if axcInterestingRole(w.role(n)) {
		if t := w.text(n); t != "" {
			w.total += utf8.RuneCountInString(t)
			w.out = append(w.out, t)
			if len(w.out) >= axcMaxWideNodes || w.total >= axcMaxWideTotal {
				return false
			}
		}
	}
	return w.each(n, func(child N) bool { return w.walk(child, depth+1) })
}
