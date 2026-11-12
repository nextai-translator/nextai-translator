package sys

import (
	"strings"
	"testing"
	"unicode/utf8"
)

func TestAXTruncate(t *testing.T) {
	for _, c := range []struct {
		in   string
		max  int
		want string
	}{
		{"", 3, ""},
		{"abc", 3, "abc"},
		{"abcd", 3, "abc"},
		{"你好世界", 2, "你好"},
		{"a😀b", 2, "a😀"},
		{"abc", 0, ""},
	} {
		if got := axcTruncate(c.in, c.max); got != c.want {
			t.Errorf("axcTruncate(%q, %d) = %q, want %q", c.in, c.max, got, c.want)
		}
	}
}

func TestAXBestText(t *testing.T) {
	if got := axcBestText("", "  \n", " title ", "desc"); got != "title" {
		t.Errorf("got %q, want the first text that is not blank, trimmed", got)
	}
	if got := axcBestText("", " "); got != "" {
		t.Errorf("got %q, want empty", got)
	}
	long := strings.Repeat("字", axcMaxTextPerNode+10)
	if got := axcBestText(long); utf8.RuneCountInString(got) != axcMaxTextPerNode {
		t.Errorf("got %d runes, want %d", utf8.RuneCountInString(got), axcMaxTextPerNode)
	}
}

func TestAXFocusedText(t *testing.T) {
	best := func() string { return "best" }
	if got := axcFocusedText(" \t", best); got != "best" {
		t.Errorf("blank value: got %q", got)
	}
	// The value is kept untrimmed, as the Rust version does.
	if got := axcFocusedText(" v ", best); got != " v " {
		t.Errorf("got %q", got)
	}
	long := strings.Repeat("a", axcMaxFocusedText+1)
	if got := axcFocusedText(long, best); len(got) != axcMaxFocusedText {
		t.Errorf("got %d chars, want %d", len(got), axcMaxFocusedText)
	}
}

type axcNode struct {
	role, text string
	kids       []*axcNode
}

func axcTestWalk(root *axcNode) ([]string, bool) {
	w := axcWalker[*axcNode]{
		role: func(n *axcNode) string { return n.role },
		text: func(n *axcNode) string { return axcBestText(n.text) },
		each: func(n *axcNode, visit func(*axcNode) bool) bool {
			for _, k := range n.kids {
				if !visit(k) {
					return false
				}
			}
			return true
		},
	}
	ok := w.walk(root, 0)
	return w.out, ok
}

func TestAXWalkCollectsInterestingRolesInOrder(t *testing.T) {
	root := &axcNode{role: "AXWindow", text: "window title", kids: []*axcNode{
		{role: "AXGroup", kids: []*axcNode{
			{role: "AXHeading", text: "Heading"},
			{role: "AXStaticText", text: "  first  "},
			{role: "AXButton", text: "OK"},
			{role: "AXStaticText", text: "   "},
		}},
		{role: "AXLink", text: "link"},
		{role: "AXTextArea", text: "area"},
		{role: "AXTextField", text: "field"},
	}}
	out, ok := axcTestWalk(root)
	want := []string{"Heading", "first", "link", "area", "field"}
	if !ok || strings.Join(out, "|") != strings.Join(want, "|") {
		t.Errorf("got %q, %v; want %q, true", out, ok, want)
	}
}

func TestAXWalkStopsAtNodeLimit(t *testing.T) {
	root := &axcNode{role: "AXGroup"}
	for range axcMaxWideNodes + 5 {
		root.kids = append(root.kids, &axcNode{role: "AXStaticText", text: "x"})
	}
	out, ok := axcTestWalk(root)
	if ok || len(out) != axcMaxWideNodes {
		t.Errorf("got %d paragraphs, ok %v; want %d, false", len(out), ok, axcMaxWideNodes)
	}
}

func TestAXWalkStopsAtTotalLimit(t *testing.T) {
	root := &axcNode{role: "AXGroup"}
	for range 10 {
		root.kids = append(root.kids, &axcNode{role: "AXStaticText", text: strings.Repeat("y", axcMaxTextPerNode)})
	}
	out, ok := axcTestWalk(root)
	// 7 × 1200 = 8400 reaches 8000 on the 7th.
	if ok || len(out) != 7 {
		t.Errorf("got %d paragraphs, ok %v; want 7, false", len(out), ok)
	}
}

func TestAXWalkDepthLimitStopsTheWalk(t *testing.T) {
	// A node below the depth limit stops the whole walk, as in the Rust
	// version: the sibling after it is not read.
	deep := &axcNode{role: "AXStaticText", text: "too deep"}
	n := deep
	for range axcMaxWideDepth {
		n = &axcNode{role: "AXGroup", kids: []*axcNode{n}}
	}
	root := &axcNode{role: "AXWindow", kids: []*axcNode{
		{role: "AXStaticText", text: "before"},
		n,
		{role: "AXStaticText", text: "after"},
	}}
	out, ok := axcTestWalk(root)
	if ok || strings.Join(out, "|") != "before" {
		t.Errorf("got %q, %v; want [before], false", out, ok)
	}

	// At the limit itself it is still read.
	n = &axcNode{role: "AXStaticText", text: "deepest"}
	for range axcMaxWideDepth - 1 {
		n = &axcNode{role: "AXGroup", kids: []*axcNode{n}}
	}
	out, ok = axcTestWalk(&axcNode{role: "AXWindow", kids: []*axcNode{n}})
	if !ok || strings.Join(out, "|") != "deepest" {
		t.Errorf("got %q, %v; want [deepest], true", out, ok)
	}
}
