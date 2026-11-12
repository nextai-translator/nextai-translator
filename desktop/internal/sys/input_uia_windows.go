package sys

// UI Automation, called through its COM vtables without cgo: the focused
// element of any app, its text (Value or Text pattern), its selection and
// its frame. The vtable indices are those of UIAutomationClient.h.

import (
	"runtime"
	"strings"
	"syscall"
	"unsafe"
)

var (
	ole32            = syscall.NewLazyDLL("ole32.dll")
	procCoInit       = ole32.NewProc("CoInitializeEx")
	procCoUninit     = ole32.NewProc("CoUninitialize")
	procCoCreate     = ole32.NewProc("CoCreateInstance")
	oleaut32         = syscall.NewLazyDLL("oleaut32.dll")
	procSysStringLen = oleaut32.NewProc("SysStringLen")
	procSysFreeStr   = oleaut32.NewProc("SysFreeString")
)

type guid struct {
	a    uint32
	b, c uint16
	d    [8]byte
}

var (
	clsidCUIAutomation  = guid{0xff48dba4, 0x60ef, 0x4201, [8]byte{0xaa, 0x87, 0x54, 0x10, 0x3e, 0xef, 0x59, 0x4e}}
	iidIUIAutomation    = guid{0x30cbe57d, 0xd9d0, 0x452a, [8]byte{0xab, 0x13, 0x7a, 0xc5, 0xac, 0x48, 0x25, 0xee}}
	iidValuePattern     = guid{0xa94cd8b1, 0x0844, 0x4cd6, [8]byte{0x9d, 0x2d, 0x64, 0x05, 0x37, 0xab, 0x39, 0xe9}}
	iidTextPattern      = guid{0x32eba289, 0x3583, 0x42c9, [8]byte{0x9c, 0x59, 0x3b, 0x6d, 0x9a, 0x1e, 0x9b, 0x6a}}
	uiaValuePatternID   = uintptr(10002)
	uiaTextPatternID    = uintptr(10014)
	allText             = ^uintptr(0) // GetText's maxLength -1: no limit
	vtGetFocused        = 8           // IUIAutomation::GetFocusedElement
	vtPatternAs         = 14          // IUIAutomationElement::GetCurrentPatternAs
	vtProcessID         = 20          // IUIAutomationElement::get_CurrentProcessId (tests)
	vtClassName         = 30          // IUIAutomationElement::get_CurrentClassName (tests)
	vtIsPassword        = 35          // IUIAutomationElement::get_CurrentIsPassword
	vtBounds            = 43          // IUIAutomationElement::get_CurrentBoundingRectangle
	vtValue             = 4           // IUIAutomationValuePattern::get_CurrentValue
	vtTextSelection     = 5           // IUIAutomationTextPattern::GetSelection
	vtTextDocument      = 7           // IUIAutomationTextPattern::get_DocumentRange
	vtRangeArrayLength  = 3           // IUIAutomationTextRangeArray::get_Length
	vtRangeArrayElement = 4           // IUIAutomationTextRangeArray::GetElement
	vtRangeText         = 12          // IUIAutomationTextRange::GetText
)

// comCall calls method idx of the COM object obj.
func comCall(obj uintptr, idx int, args ...uintptr) uintptr {
	p := *(*unsafe.Pointer)(unsafe.Pointer(&obj))
	vtbl := *(*unsafe.Pointer)(p)
	fn := *(*uintptr)(unsafe.Add(vtbl, uintptr(idx)*unsafe.Sizeof(uintptr(0))))
	r, _, _ := syscall.SyscallN(fn, append([]uintptr{obj}, args...)...)
	return r
}

func comRelease(obj uintptr) {
	if obj != 0 {
		comCall(obj, 2)
	}
}

func failed(hr uintptr) bool { return int32(hr) < 0 }

// bstr returns a BSTR's text and frees it.
func bstr(b uintptr) string {
	if b == 0 {
		return ""
	}
	defer procSysFreeStr.Call(b)
	n, _, _ := procSysStringLen.Call(b)
	if n == 0 {
		return ""
	}
	return syscall.UTF16ToString(unsafe.Slice(*(**uint16)(unsafe.Pointer(&b)), n))
}

type uia struct{ auto uintptr }

// withUIA runs fn with a UI Automation client, on one thread that COM is
// initialized on (in the multithreaded apartment, which UI Automation
// clients are best in), and returns what it returns, or false when UI
// Automation is unavailable.
func withUIA(fn func(*uia) bool) bool {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	hr, _, _ := procCoInit.Call(0, 0) // COINIT_MULTITHREADED
	if !failed(hr) {
		defer procCoUninit.Call()
	}
	var auto uintptr
	hr, _, _ = procCoCreate.Call(uintptr(unsafe.Pointer(&clsidCUIAutomation)), 0, 1, // CLSCTX_INPROC_SERVER
		uintptr(unsafe.Pointer(&iidIUIAutomation)), uintptr(unsafe.Pointer(&auto)))
	if failed(hr) || auto == 0 {
		return false
	}
	defer comRelease(auto)
	return fn(&uia{auto})
}

// focused returns the focused element, which the caller releases, or 0.
func (u *uia) focused() uintptr {
	var el uintptr
	if failed(comCall(u.auto, vtGetFocused, uintptr(unsafe.Pointer(&el)))) {
		return 0
	}
	return el
}

// pattern returns the element's pattern id as interface iid, or 0.
func pattern(el, id uintptr, iid *guid) uintptr {
	var p uintptr
	if failed(comCall(el, vtPatternAs, id, uintptr(unsafe.Pointer(iid)), uintptr(unsafe.Pointer(&p)))) {
		return 0
	}
	return p
}

func isPassword(el uintptr) bool {
	var v int32
	return !failed(comCall(el, vtIsPassword, uintptr(unsafe.Pointer(&v)))) && v != 0
}

// uiaText returns the element's text: its Value pattern's value, as edit
// boxes and browsers' text fields offer, or its Text pattern's document,
// as rich editors offer. Password fields give nothing.
func uiaText(el uintptr) (string, bool) {
	s, ok := uiaRawText(el)
	return trimFinalParagraphMark(s), ok
}

// trimFinalParagraphMark drops the paragraph mark that ends every rich edit
// control's text, through both patterns: "hello\rworld\r" is what the user
// sees as two lines. A "\r\n" line break, as edit boxes end a typed line
// with, stays.
func trimFinalParagraphMark(s string) string {
	if strings.HasSuffix(s, "\r") {
		return s[:len(s)-1]
	}
	return s
}

func uiaRawText(el uintptr) (string, bool) {
	if isPassword(el) {
		return "", false
	}
	if vp := pattern(el, uiaValuePatternID, &iidValuePattern); vp != 0 {
		defer comRelease(vp)
		var b uintptr
		if !failed(comCall(vp, vtValue, uintptr(unsafe.Pointer(&b)))) {
			if s := bstr(b); s != "" {
				return s, true
			}
		}
	}
	tp := pattern(el, uiaTextPatternID, &iidTextPattern)
	if tp == 0 {
		return "", false
	}
	defer comRelease(tp)
	var r uintptr
	if failed(comCall(tp, vtTextDocument, uintptr(unsafe.Pointer(&r)))) || r == 0 {
		return "", false
	}
	defer comRelease(r)
	return rangeText(r)
}

func rangeText(r uintptr) (string, bool) {
	var b uintptr
	if failed(comCall(r, vtRangeText, allText, uintptr(unsafe.Pointer(&b)))) {
		return "", false
	}
	return bstr(b), true
}

// uiaSelection returns the text selected in the element, by its Text
// pattern; false when there is none.
func uiaSelection(el uintptr) (string, bool) {
	if isPassword(el) {
		return "", false
	}
	tp := pattern(el, uiaTextPatternID, &iidTextPattern)
	if tp == 0 {
		return "", false
	}
	defer comRelease(tp)
	var arr uintptr
	if failed(comCall(tp, vtTextSelection, uintptr(unsafe.Pointer(&arr)))) || arr == 0 {
		return "", false
	}
	defer comRelease(arr)
	var n int32
	if failed(comCall(arr, vtRangeArrayLength, uintptr(unsafe.Pointer(&n)))) || n < 1 {
		return "", false
	}
	var r uintptr
	if failed(comCall(arr, vtRangeArrayElement, 0, uintptr(unsafe.Pointer(&r)))) || r == 0 {
		return "", false
	}
	defer comRelease(r)
	text, ok := rangeText(r)
	return text, ok && text != ""
}

// uiaBounds returns the element's frame in the screen's pixels.
func uiaBounds(el uintptr) (winRect, bool) {
	var r winRect
	if failed(comCall(el, vtBounds, uintptr(unsafe.Pointer(&r)))) || r.right <= r.left || r.bottom <= r.top {
		return winRect{}, false
	}
	return r, true
}
