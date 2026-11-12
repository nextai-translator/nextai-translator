//go:build darwin && inputtest

// The input integration test types into a real TextEdit document through
// the real MyGo clipboard, so it needs the app's event loop (TestMain
// below), a logged-in console session and Accessibility access:
//
//	go test -tags inputtest -c -o inputtest ./internal/sys
//	./inputtest -test.run Input -test.v
//
// macOS gives Accessibility to the app responsible for the process: run
// the binary from an app the user granted it to (Terminal, or a helper
// app started by open). Over SSH it is sshd's, and the test skips. It
// skips too when TextEdit is already running, so as not to type into the
// user's documents.

package sys

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
	"unsafe"

	"github.com/egoist/mygo"
)

func TestMain(m *testing.M) {
	mygo.App.SetName("NextAIInputTest")
	mygo.App.OnWindowAllClosed(func() {})
	mygo.App.WhenReady(func() {
		go func() { os.Exit(m.Run()) }()
	})
	if err := mygo.App.Run(); err != nil {
		println(err.Error())
		os.Exit(1)
	}
}

func pidOf(name string) int32 {
	out, err := exec.Command("pgrep", "-x", name).Output()
	if err != nil {
		return 0
	}
	n, _ := strconv.Atoi(strings.Fields(string(out))[0])
	return int32(n)
}

// openTextEdit opens a plain-text document holding text in TextEdit and
// waits until its text view has the focus.
func openTextEdit(t *testing.T, text string) int32 {
	t.Helper()
	if !Trusted() {
		exe, _ := os.Executable()
		t.Skipf("no Accessibility access for %s (or the app that started it)", exe)
	}
	if pidOf("TextEdit") != 0 {
		t.Skip("TextEdit is already running")
	}
	file := filepath.Join(t.TempDir(), "input-test.txt")
	if err := os.WriteFile(file, []byte(text), 0o644); err != nil {
		t.Fatal(err)
	}
	if out, err := exec.Command("open", "-a", "TextEdit", file).CombinedOutput(); err != nil {
		t.Fatalf("open TextEdit: %v %s", err, out)
	}
	t.Cleanup(func() {
		if pid := pidOf("TextEdit"); pid != 0 {
			_ = exec.Command("kill", strconv.Itoa(int(pid))).Run()
		}
	})
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		pid := pidOf("TextEdit")
		if pid != 0 && frontmostPID() == pid {
			if got, ok := axFocusedText(); ok && normalizeNewlines(got) == text {
				return pid
			}
		}
		time.Sleep(200 * time.Millisecond)
	}
	t.Fatalf("TextEdit did not come up focused on the document (frontmost %d, TextEdit %d)", frontmostPID(), pidOf("TextEdit"))
	return 0
}

// windowFrame is the frame of the focused window of pid, in points from
// the top-left corner of the primary display.
func windowFrame(pid int32) (x, y, w, h float64, ok bool) {
	app := cg.axApplication(pid)
	if app == 0 {
		return
	}
	defer cg.release(app)
	win, found := axAttr(app, "AXFocusedWindow")
	if !found {
		return
	}
	defer cg.release(win)
	var pos struct{ x, y float64 }
	var size struct{ w, h float64 }
	p, okP := axAttr(win, "AXPosition")
	if okP {
		okP = axValue(p, axPointType, unsafe.Pointer(&pos))
		cg.release(p)
	}
	s, okS := axAttr(win, "AXSize")
	if okS {
		okS = axValue(s, axSizeType, unsafe.Pointer(&size))
		cg.release(s)
	}
	return pos.x, pos.y, size.w, size.h, okP && okS
}

func TestInputRoundTrip(t *testing.T) {
	pid := openTextEdit(t, "hello\nworld")

	got, err := FocusedText()
	t.Logf("FocusedText = %q, %v", got, err)
	if err != nil || got != "hello\nworld" {
		t.Fatalf("FocusedText = %q, %v; want %q", got, err, "hello\nworld")
	}

	mygo.Clipboard.WriteText("the user's clipboard")

	// The fallback: select all and copy.
	inputMu.Lock()
	err = selectAll()
	time.Sleep(50 * time.Millisecond)
	copied, cerr := copyBySimulation(func() error { return pressCombo(keyCombo{mods: modMeta, key: "c"}) })
	inputMu.Unlock()
	t.Logf("select all + copy = %q, %v, %v", copied, err, cerr)
	if err != nil || cerr != nil || normalizeNewlines(copied) != "hello\nworld" {
		t.Errorf("select all + copy = %q, %v, %v", copied, err, cerr)
	}
	if sel, ok := SelectedTextAX(); !ok || sel != "hello\nworld" {
		t.Errorf("SelectedTextAX after select all = %q, %v", sel, ok)
	}

	if err := ReplaceFocusedText("bonjour\nle monde"); err != nil {
		t.Fatalf("ReplaceFocusedText: %v", err)
	}
	time.Sleep(200 * time.Millisecond)
	if got, ok := axFocusedText(); !ok || got != "bonjour\nle monde" {
		t.Errorf("after ReplaceFocusedText the input has %q, %v", got, ok)
	}

	// Chunks as a stream sends them, a line break pressed as Enter.
	for _, chunk := range []string{" !", "\nsecond", " line"} {
		if err := TypeText(chunk, "enter"); err != nil {
			t.Fatalf("TypeText(%q): %v", chunk, err)
		}
	}
	time.Sleep(200 * time.Millisecond)
	if got, want := normalizeNewlines(must(axFocusedText())), "bonjour\nle monde !\nsecond line"; got != want {
		t.Errorf("after TypeText the input has %q; want %q", got, want)
	}
	if err := PressKeys("meta+shift+left"); err != nil {
		t.Errorf("PressKeys: %v", err)
	}
	time.Sleep(200 * time.Millisecond)
	if sel, ok := SelectedTextAX(); !ok || sel != "second line" {
		t.Errorf("SelectedTextAX after meta+shift+left = %q, %v", sel, ok)
	}

	time.Sleep(restoreDelay + 300*time.Millisecond)
	if got := mygo.Clipboard.ReadText(); got != "the user's clipboard" {
		t.Errorf("the clipboard was not put back: %q", got)
	}

	x, y, cw, ch, ok := CaretRect()
	wx, wy, ww, wh, wok := windowFrame(pid)
	t.Logf("CaretRect = %v %v %v %v %v; window %v %v %v %v %v", x, y, cw, ch, ok, wx, wy, ww, wh, wok)
	if !ok || !wok || cw <= 0 || ch <= 0 || x < wx || y < wy || x > wx+ww || y > wy+wh {
		t.Errorf("CaretRect = %v,%v %vx%v %v; not inside the window at %v,%v %vx%v", x, y, cw, ch, ok, wx, wy, ww, wh)
	}
}

func TestInputRestoreForeground(t *testing.T) {
	pid := openTextEdit(t, "a")
	RememberForeground()
	if err := exec.Command("open", "-a", "Finder").Run(); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(5 * time.Second)
	for frontmostPID() == pid && time.Now().Before(deadline) {
		time.Sleep(100 * time.Millisecond)
	}
	if frontmostPID() == pid {
		t.Fatal("Finder did not come to the front")
	}
	if err := RestoreForeground(); err != nil {
		t.Fatalf("RestoreForeground: %v", err)
	}
	time.Sleep(300 * time.Millisecond)
	if got := frontmostPID(); got != pid {
		t.Errorf("frontmost is %d after RestoreForeground; want TextEdit %d", got, pid)
	}
	if got, ok := axFocusedText(); !ok || got != "a" {
		t.Errorf("focused text after RestoreForeground = %q, %v", got, ok)
	}
}

func must(s string, _ bool) string { return s }
