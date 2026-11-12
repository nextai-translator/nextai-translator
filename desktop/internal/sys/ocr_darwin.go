package sys

import (
	"bytes"
	"fmt"
	"image"
	"image/png"
	"runtime"
	"strings"
	"sync"
	"unsafe"

	"github.com/ebitengine/purego"
	"github.com/ebitengine/purego/objc"
)

var ocrVisionLib struct {
	once sync.Once
	err  error
}

func ocrLoadVision() error {
	ocrVisionLib.once.Do(func() {
		for _, fw := range []string{"Foundation", "Vision"} {
			if _, err := purego.Dlopen("/System/Library/Frameworks/"+fw+".framework/"+fw, purego.RTLD_LAZY|purego.RTLD_GLOBAL); err != nil {
				ocrVisionLib.err = fmt.Errorf("sys: load %s: %w", fw, err)
				return
			}
		}
		if objc.GetClass("VNRecognizeTextRequest") == 0 {
			ocrVisionLib.err = ErrUnsupported
		}
	})
	return ocrVisionLib.err
}

func ocrSel(name string) objc.SEL { return objc.RegisterName(name) }

func ocrClass(name string) objc.ID { return objc.ID(objc.GetClass(name)) }

// ocrNSString returns an autoreleased NSString of s.
func ocrNSString(s string) objc.ID {
	b := append([]byte(s), 0)
	id := ocrClass("NSString").Send(ocrSel("stringWithUTF8String:"), unsafe.Pointer(&b[0]))
	runtime.KeepAlive(b)
	return id
}

// ocrGoString copies an NSString.
func ocrGoString(s objc.ID) string {
	if s == 0 {
		return ""
	}
	p := objc.Send[uintptr](s, ocrSel("UTF8String"))
	if p == 0 {
		return ""
	}
	n := objc.Send[uintptr](s, ocrSel("lengthOfBytesUsingEncoding:"), uintptr(4)) // NSUTF8StringEncoding
	return string(unsafe.Slice(*(**byte)(unsafe.Pointer(&p)), n))
}

// RecognizeText returns the text in img, one line of it per line, joined
// by "\n". On macOS it is the Vision framework's accurate recognizer, for
// simplified and traditional Chinese and English with language correction,
// as the old app read it.
func RecognizeText(img image.Image) (string, error) {
	if err := ocrLoadVision(); err != nil {
		return "", err
	}
	if img.Bounds().Empty() {
		return "", nil
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return "", err
	}
	data := buf.Bytes()

	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	pool := ocrClass("NSAutoreleasePool").Send(ocrSel("new"))
	defer pool.Send(ocrSel("drain"))

	nsData := ocrClass("NSData").Send(ocrSel("dataWithBytes:length:"), unsafe.Pointer(&data[0]), uintptr(len(data)))
	runtime.KeepAlive(data)
	options := ocrClass("NSDictionary").Send(ocrSel("dictionary"))
	handler := ocrClass("VNImageRequestHandler").Send(ocrSel("alloc")).Send(ocrSel("initWithData:options:"), nsData, options)
	if handler == 0 {
		return "", fmt.Errorf("sys: failed to create Vision image request handler")
	}
	defer handler.Send(ocrSel("release"))
	request := ocrClass("VNRecognizeTextRequest").Send(ocrSel("alloc")).Send(ocrSel("init"))
	if request == 0 {
		return "", fmt.Errorf("sys: failed to create Vision text recognition request")
	}
	defer request.Send(ocrSel("release"))

	langs := []objc.ID{ocrNSString("zh-Hans"), ocrNSString("zh-Hant"), ocrNSString("en-US")}
	languages := ocrClass("NSArray").Send(ocrSel("arrayWithObjects:count:"), unsafe.Pointer(&langs[0]), uintptr(len(langs)))
	runtime.KeepAlive(langs)
	request.Send(ocrSel("setRecognitionLanguages:"), languages)
	request.Send(ocrSel("setUsesLanguageCorrection:"), true)

	requests := ocrClass("NSArray").Send(ocrSel("arrayWithObject:"), request)
	errOut := new(objc.ID)
	if !objc.Send[bool](handler, ocrSel("performRequests:error:"), requests, unsafe.Pointer(errOut)) {
		msg := "unknown Vision error"
		if *errOut != 0 {
			msg = ocrGoString(errOut.Send(ocrSel("localizedDescription")))
		}
		return "", fmt.Errorf("sys: Vision OCR failed: %s", msg)
	}

	results := request.Send(ocrSel("results"))
	count := objc.Send[uintptr](results, ocrSel("count"))
	lines := make([]string, 0, count)
	for i := range count {
		observation := results.Send(ocrSel("objectAtIndex:"), i)
		candidates := observation.Send(ocrSel("topCandidates:"), uintptr(1))
		if objc.Send[uintptr](candidates, ocrSel("count")) == 0 {
			continue
		}
		candidate := candidates.Send(ocrSel("objectAtIndex:"), uintptr(0))
		lines = append(lines, strings.TrimSpace(ocrGoString(candidate.Send(ocrSel("string")))))
	}
	return strings.Join(lines, "\n"), nil
}
