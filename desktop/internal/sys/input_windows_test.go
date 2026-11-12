//go:build windows && inputtest

// The input integration test types into a real RichEdit control in a
// window of its own, through the real MyGo clipboard, so it needs the
// app's event loop (TestMain below) and an interactive desktop. It is
// behind the inputtest tag so that the package's other tests keep their
// plain TestMain-less run:
//
//	go test -tags inputtest -run Input -v ./internal/sys
//
// An SSH session runs in session 0, which has no desktop to type into; the
// test skips there. Run it in the console session, as through a scheduled
// task created with schtasks /it.

package sys

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
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

var (
	kernel32            = syscall.NewLazyDLL("kernel32.dll")
	procSessionID       = kernel32.NewProc("ProcessIdToSessionId")
	procGetModule       = kernel32.NewProc("GetModuleHandleW")
	procRegisterClass   = user32.NewProc("RegisterClassExW")
	procCreateWindow    = user32.NewProc("CreateWindowExW")
	procDefWindowProc   = user32.NewProc("DefWindowProcW")
	procGetMessage      = user32.NewProc("GetMessageW")
	procTranslateMsg    = user32.NewProc("TranslateMessage")
	procDispatchMsg     = user32.NewProc("DispatchMessageW")
	procPostQuit        = user32.NewProc("PostThreadMessageW")
	procSetFocus        = user32.NewProc("SetFocus")
	procSetWindowText   = user32.NewProc("SetWindowTextW")
	procGetWindowText   = user32.NewProc("GetWindowTextW")
	procGetTextLength   = user32.NewProc("GetWindowTextLengthW")
	procDestroyWindow   = user32.NewProc("DestroyWindow")
	procLoadLibrary     = kernel32.NewProc("LoadLibraryW")
	procOpenProcess     = kernel32.NewProc("OpenProcess")
	procQueryImageName  = kernel32.NewProc("QueryFullProcessImageNameW")
	testWndProc         = syscall.NewCallback(testWindowProc)
	testClassRegistered bool
)

const wmApp = 0x8000

func testWindowProc(hwnd, msg, w, l uintptr) uintptr {
	r, _, _ := procDefWindowProc.Call(hwnd, msg, w, l)
	return r
}

func utf16Ptr(s string) uintptr {
	p, _ := syscall.UTF16PtrFromString(s)
	return uintptr(unsafe.Pointer(p))
}

// testWindow is a top-level window with a RichEdit control, run by its own
// thread's message loop.
type testWindow struct {
	top, edit uintptr
	thread    uintptr
	done      chan struct{}
}

func openTestWindow(t *testing.T, title, text string, x int) *testWindow {
	t.Helper()
	w := &testWindow{done: make(chan struct{})}
	ready := make(chan error)
	go func() {
		runtime.LockOSThread()
		defer close(w.done)
		module, _, _ := procGetModule.Call(0)
		if !testClassRegistered {
			procLoadLibrary.Call(utf16Ptr("Msftedit.dll"))
			wc := struct {
				size, style                   uint32
				proc                          uintptr
				clsExtra, wndExtra            int32
				instance, icon, cursor, brush uintptr
				menuName, className           uintptr
				iconSm                        uintptr
			}{proc: testWndProc, instance: module, brush: 6, className: utf16Ptr("NextAIInputTest")}
			wc.size = uint32(unsafe.Sizeof(wc))
			procRegisterClass.Call(uintptr(unsafe.Pointer(&wc)))
			testClassRegistered = true
		}
		const wsOverlappedWindow, wsVisible, wsChild, wsBorder, esMultiline = 0x00CF0000, 0x10000000, 0x40000000, 0x00800000, 0x0004
		w.top, _, _ = procCreateWindow.Call(0, utf16Ptr("NextAIInputTest"), utf16Ptr(title), wsOverlappedWindow|wsVisible,
			uintptr(x), 120, 480, 260, 0, 0, module, 0)
		w.edit, _, _ = procCreateWindow.Call(0, utf16Ptr("RICHEDIT50W"), 0, wsChild|wsVisible|wsBorder|esMultiline,
			10, 10, 440, 180, w.top, 1, module, 0)
		if w.top == 0 || w.edit == 0 {
			ready <- syscall.GetLastError()
			return
		}
		procSetWindowText.Call(w.edit, utf16Ptr(text))
		w.thread, _, _ = procGetCurrentThreadID.Call()
		ready <- nil
		var msg struct {
			hwnd, message, w, l uintptr
			time                uint32
			pt                  [2]int32
			private             uint32
		}
		for {
			r, _, _ := procGetMessage.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
			if int32(r) <= 0 {
				return
			}
			if msg.hwnd == 0 && msg.message == wmApp {
				// Focus the edit control, which only its thread can do.
				procSetFocus.Call(w.edit)
				continue
			}
			if msg.hwnd == 0 && msg.message == wmApp+1 {
				procDestroyWindow.Call(w.top)
				return
			}
			procTranslateMsg.Call(uintptr(unsafe.Pointer(&msg)))
			procDispatchMsg.Call(uintptr(unsafe.Pointer(&msg)))
		}
	}()
	if err := <-ready; err != nil {
		t.Fatalf("creating the test window: %v", err)
	}
	t.Cleanup(func() {
		procPostQuit.Call(w.thread, wmApp+1, 0, 0)
		<-w.done
	})
	return w
}

// focus brings the window to the front with its edit control focused.
func (w *testWindow) focus(t *testing.T) {
	t.Helper()
	if err := focusWindow(w.top); err != nil {
		t.Fatalf("focusing the test window: %v", err)
	}
	procPostQuit.Call(w.thread, wmApp, 0, 0)
	time.Sleep(150 * time.Millisecond)
}

func (w *testWindow) text() string {
	n, _, _ := procGetTextLength.Call(w.edit)
	buf := make([]uint16, n+1)
	procGetWindowText.Call(w.edit, uintptr(unsafe.Pointer(&buf[0])), n+1)
	return normalizeNewlines(syscall.UTF16ToString(buf))
}

func skipWithoutDesktop(t *testing.T) {
	var session uint32
	procSessionID.Call(uintptr(os.Getpid()), uintptr(unsafe.Pointer(&session)))
	if session == 0 {
		t.Skip("no interactive desktop: the process runs in session 0 (a service or SSH session)")
	}
	// A locked workstation keeps the foreground on its lock screen, and
	// every key goes there.
	fg, _, _ := procGetForeground.Call()
	var pid uint32
	procGetWindowThreadPID.Call(fg, uintptr(unsafe.Pointer(&pid)))
	if fg == 0 || strings.EqualFold(filepath.Base(processImage(pid)), "LockApp.exe") {
		t.Skip("the workstation is locked")
	}
}

func processImage(pid uint32) string {
	h, _, _ := procOpenProcess.Call(0x1000, 0, uintptr(pid)) // PROCESS_QUERY_LIMITED_INFORMATION
	if h == 0 {
		return ""
	}
	defer syscall.CloseHandle(syscall.Handle(h))
	buf := make([]uint16, 1024)
	n := uint32(len(buf))
	if r, _, _ := procQueryImageName.Call(h, 0, uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&n))); r == 0 {
		return ""
	}
	return syscall.UTF16ToString(buf[:n])
}

func TestInputRoundTrip(t *testing.T) {
	skipWithoutDesktop(t)
	w := openTestWindow(t, "NextAI input test", "hello\r\nworld", 140)
	w.focus(t)

	// The vtable indices: the focused element is this process's RichEdit.
	// Stop otherwise, before any key goes to someone else's window.
	var pid int32
	var class string
	withUIA(func(u *uia) bool {
		el := u.focused()
		if el == 0 {
			return false
		}
		defer comRelease(el)
		comCall(el, vtProcessID, uintptr(unsafe.Pointer(&pid)))
		var b uintptr
		comCall(el, vtClassName, uintptr(unsafe.Pointer(&b)))
		class = bstr(b)
		return true
	})
	if int(pid) != os.Getpid() || class != "RICHEDIT50W" {
		t.Fatalf("focused element: pid %d, class %q; want %d, RICHEDIT50W", pid, class, os.Getpid())
	}

	if text, ok := axFocusedText(); !ok || normalizeNewlines(text) != "hello\nworld" {
		t.Errorf("UI Automation text = %q, %v", text, ok)
	}
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
	copied, cerr := copyBySimulation(func() error { return pressCombo(keyCombo{mods: modCtrl, key: "c"}) })
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
	time.Sleep(100 * time.Millisecond)
	if got := w.text(); got != "bonjour\nle monde" {
		t.Errorf("after ReplaceFocusedText the input has %q", got)
	}
	if got, err := FocusedText(); err != nil || got != "bonjour\nle monde" {
		t.Errorf("FocusedText after replace = %q, %v", got, err)
	}

	// Chunks as a stream sends them, a line break pressed as Enter.
	for _, chunk := range []string{" !", "\nsecond", " line"} {
		if err := TypeText(chunk, "enter"); err != nil {
			t.Fatalf("TypeText(%q): %v", chunk, err)
		}
	}
	time.Sleep(100 * time.Millisecond)
	if got, want := w.text(), "bonjour\nle monde !\nsecond line"; got != want {
		t.Errorf("after TypeText the input has %q; want %q", got, want)
	}
	if err := PressKeys("shift+home"); err != nil {
		t.Errorf("PressKeys: %v", err)
	}
	time.Sleep(100 * time.Millisecond)
	if sel, ok := SelectedTextAX(); !ok || sel != "second line" {
		t.Errorf("SelectedTextAX after shift+home = %q, %v", sel, ok)
	}

	time.Sleep(restoreDelay + 300*time.Millisecond)
	if got := mygo.Clipboard.ReadText(); got != "the user's clipboard" {
		t.Errorf("the clipboard was not put back: %q", got)
	}

	x, y, cw, ch, ok := CaretRect()
	var wr winRect
	procGetWindowRect.Call(w.top, uintptr(unsafe.Pointer(&wr)))
	wx, wy, ww, wh := pixelRectToDIP(displays(), int(wr.left), int(wr.top), int(wr.right-wr.left), int(wr.bottom-wr.top))
	t.Logf("CaretRect = %v %v %v %v %v; window in DIPs %v %v %v %v", x, y, cw, ch, ok, wx, wy, ww, wh)
	if !ok || cw <= 0 || ch <= 0 || x < wx || y < wy || x > wx+ww || y > wy+wh {
		t.Errorf("CaretRect = %v,%v %vx%v %v; not inside the window at %v,%v %vx%v", x, y, cw, ch, ok, wx, wy, ww, wh)
	}
}

func TestInputRestoreForeground(t *testing.T) {
	skipWithoutDesktop(t)
	a := openTestWindow(t, "NextAI input test A", "a", 140)
	b := openTestWindow(t, "NextAI input test B", "b", 680)
	a.focus(t)
	b.focus(t)
	// RememberForeground skips this process's windows, as the translator's
	// own; remember A by hand.
	foreground.Lock()
	foreground.hwnd = a.top
	foreground.Unlock()
	if err := RestoreForeground(); err != nil {
		t.Fatalf("RestoreForeground: %v", err)
	}
	if fg, _, _ := procGetForeground.Call(); fg != a.top {
		t.Errorf("foreground is %#x; want A %#x", fg, a.top)
	}
}
