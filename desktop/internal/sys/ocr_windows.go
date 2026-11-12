package sys

import (
	"errors"
	"fmt"
	"image"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unicode/utf16"
	"unsafe"
)

// Windows.Media.Ocr is a WinRT API. It is called here from Go through
// its ABI: activation factories from combase, and each interface's vtable
// by hand, its slots as the Windows metadata orders the methods, after
// IInspectable's six.

var (
	ocrCombase = syscall.NewLazyDLL("combase.dll")

	ocrProcRoInitialize              = ocrCombase.NewProc("RoInitialize")
	ocrProcRoUninitialize            = ocrCombase.NewProc("RoUninitialize")
	ocrProcRoGetActivationFactory    = ocrCombase.NewProc("RoGetActivationFactory")
	ocrProcWindowsCreateString       = ocrCombase.NewProc("WindowsCreateString")
	ocrProcWindowsDeleteString       = ocrCombase.NewProc("WindowsDeleteString")
	ocrProcWindowsGetStringRawBuffer = ocrCombase.NewProc("WindowsGetStringRawBuffer")
)

type ocrGUID struct {
	Data1        uint32
	Data2, Data3 uint16
	Data4        [8]byte
}

// ocrParseGUID parses "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
func ocrParseGUID(s string) *ocrGUID {
	p := strings.Split(s, "-")
	if len(p) != 5 {
		panic("sys: bad GUID " + s)
	}
	n := func(h string, bits int) uint64 {
		v, err := strconv.ParseUint(h, 16, bits)
		if err != nil {
			panic("sys: bad GUID " + s)
		}
		return v
	}
	g := &ocrGUID{Data1: uint32(n(p[0], 32)), Data2: uint16(n(p[1], 16)), Data3: uint16(n(p[2], 16))}
	rest := p[3] + p[4]
	for i := range g.Data4 {
		g.Data4[i] = byte(n(rest[2*i:2*i+2], 8))
	}
	return g
}

var (
	ocrIIDAsyncInfo            = ocrParseGUID("00000036-0000-0000-c000-000000000046")
	ocrIIDOcrEngineStatics     = ocrParseGUID("5bffa85a-3384-3540-9940-699120d428a8")
	ocrIIDLanguageFactory      = ocrParseGUID("9b0252ac-0c27-44f8-b792-9793fb66c63e")
	ocrIIDSoftwareBitmapStatic = ocrParseGUID("df0385db-672f-4a9d-806e-c2442f343e86")
	ocrIIDCryptoBufferStatics  = ocrParseGUID("320b7e22-3cb0-4cdf-8663-1d28910065eb")
)

// Vtable slots.
const (
	ocrSlotQueryInterface = 0
	ocrSlotRelease        = 2

	ocrSlotVectorGetAt   = 6 // IVectorView<T>.GetAt
	ocrSlotVectorGetSize = 7 // IVectorView<T>.get_Size

	ocrSlotAsyncGetResults = 8 // IAsyncOperation<T>.GetResults
	ocrSlotAsyncStatus     = 7 // IAsyncInfo.get_Status
	ocrSlotAsyncErrorCode  = 8 // IAsyncInfo.get_ErrorCode

	ocrSlotMaxImageDimension = 6  // IOcrEngineStatics.get_MaxImageDimension
	ocrSlotAvailableLangs    = 7  // IOcrEngineStatics.get_AvailableRecognizerLanguages
	ocrSlotTryCreateFromLang = 9  // IOcrEngineStatics.TryCreateFromLanguage
	ocrSlotTryCreateProfile  = 10 // IOcrEngineStatics.TryCreateFromUserProfileLanguages
	ocrSlotRecognizeAsync    = 6  // IOcrEngine.RecognizeAsync
	ocrSlotRecognizerLang    = 7  // IOcrEngine.get_RecognizerLanguage
	ocrSlotResultLines       = 6  // IOcrResult.get_Lines
	ocrSlotLineText          = 7  // IOcrLine.get_Text
	ocrSlotLanguageTag       = 6  // ILanguage.get_LanguageTag
	ocrSlotCreateLanguage    = 6  // ILanguageFactory.CreateLanguage

	ocrSlotCreateFromByteArray  = 9 // ICryptographicBufferStatics.CreateFromByteArray
	ocrSlotCreateCopyFromBuffer = 9 // ISoftwareBitmapStatics.CreateCopyFromBuffer
)

const (
	ocrBitmapBgra8 = 87 // BitmapPixelFormat.Bgra8

	ocrAsyncCompleted = 1
	ocrAsyncCanceled  = 2
	ocrAsyncError     = 3

	ocrChangedMode = 0x80010106 // RPC_E_CHANGED_MODE
)

// ocrObj is a COM object: a pointer to its vtable.
type ocrObj struct{ vtbl *[64]uintptr }

type ocrHRESULT uint32

func (e ocrHRESULT) Error() string { return fmt.Sprintf("sys: WinRT error 0x%08X", uint32(e)) }

func ocrHR(r uintptr) error {
	if int32(r) < 0 {
		return ocrHRESULT(uint32(r))
	}
	return nil
}

// call calls method slot of o with args.
//
//go:uintptrescapes
func (o *ocrObj) call(slot int, args ...uintptr) error {
	r, _, _ := syscall.SyscallN(o.vtbl[slot], append([]uintptr{uintptr(unsafe.Pointer(o))}, args...)...)
	return ocrHR(r)
}

func (o *ocrObj) release() {
	if o != nil {
		syscall.SyscallN(o.vtbl[ocrSlotRelease], uintptr(unsafe.Pointer(o)))
	}
}

// ocrHString returns a new HSTRING of s; ocrFreeHString frees it.
func ocrHString(s string) (uintptr, error) {
	if s == "" {
		return 0, nil
	}
	u := utf16.Encode([]rune(s))
	var h uintptr
	r, _, _ := ocrProcWindowsCreateString.Call(uintptr(unsafe.Pointer(&u[0])), uintptr(len(u)), uintptr(unsafe.Pointer(&h)))
	return h, ocrHR(r)
}

func ocrFreeHString(h uintptr) {
	if h != 0 {
		ocrProcWindowsDeleteString.Call(h)
	}
}

// ocrGoString copies an HSTRING and frees it.
func ocrGoString(h uintptr) string {
	if h == 0 {
		return ""
	}
	defer ocrFreeHString(h)
	var n uint32
	p, _, _ := ocrProcWindowsGetStringRawBuffer.Call(h, uintptr(unsafe.Pointer(&n)))
	if p == 0 || n == 0 {
		return ""
	}
	return string(utf16.Decode(unsafe.Slice(*(**uint16)(unsafe.Pointer(&p)), n)))
}

// ocrFactory returns the activation factory of a runtime class, as iid.
func ocrFactory(class string, iid *ocrGUID) (*ocrObj, error) {
	h, err := ocrHString(class)
	if err != nil {
		return nil, err
	}
	defer ocrFreeHString(h)
	var f *ocrObj
	r, _, _ := ocrProcRoGetActivationFactory.Call(h, uintptr(unsafe.Pointer(iid)), uintptr(unsafe.Pointer(&f)))
	if err := ocrHR(r); err != nil {
		return nil, fmt.Errorf("sys: activate %s: %w", class, err)
	}
	return f, nil
}

// ocrAwait waits for an IAsyncOperation<T> and returns its result.
func ocrAwait(op *ocrObj, timeout time.Duration) (*ocrObj, error) {
	var info *ocrObj
	if err := op.call(ocrSlotQueryInterface, uintptr(unsafe.Pointer(ocrIIDAsyncInfo)), uintptr(unsafe.Pointer(&info))); err != nil {
		return nil, err
	}
	defer info.release()
	for deadline := time.Now().Add(timeout); ; {
		var status int32
		if err := info.call(ocrSlotAsyncStatus, uintptr(unsafe.Pointer(&status))); err != nil {
			return nil, err
		}
		switch status {
		case ocrAsyncCompleted:
			var res *ocrObj
			if err := op.call(ocrSlotAsyncGetResults, uintptr(unsafe.Pointer(&res))); err != nil {
				return nil, err
			}
			return res, nil
		case ocrAsyncCanceled:
			return nil, errors.New("sys: OCR was canceled")
		case ocrAsyncError:
			var hr int32
			_ = info.call(ocrSlotAsyncErrorCode, uintptr(unsafe.Pointer(&hr)))
			return nil, ocrHRESULT(uint32(hr))
		}
		if time.Now().After(deadline) {
			return nil, errors.New("sys: OCR timed out")
		}
		time.Sleep(5 * time.Millisecond)
	}
}

// ocrOnThread runs fn on an OS thread of its own, in the multithreaded
// apartment, so that the caller's thread, such as an STA UI thread, is
// left as it was. The thread exits with fn.
func ocrOnThread(fn func() (string, error)) (string, error) {
	type result struct {
		text string
		err  error
	}
	ch := make(chan result, 1)
	go func() {
		// Never unlocked: the goroutine's end takes the thread, and the
		// apartment it joined, with it.
		runtime.LockOSThread()
		r, _, _ := ocrProcRoInitialize.Call(1) // RO_INIT_MULTITHREADED
		if err := ocrHR(r); err == nil {
			defer ocrProcRoUninitialize.Call()
		} else if uint32(r) != ocrChangedMode {
			ch <- result{err: fmt.Errorf("sys: RoInitialize: %w", err)}
			return
		}
		text, err := fn()
		ch <- result{text, err}
	}()
	r := <-ch
	return r.text, r.err
}

// ocrLanguageTag returns an engine's recognizer language, as "en-US".
func ocrLanguageTag(engine *ocrObj) string {
	var lang *ocrObj
	if engine.call(ocrSlotRecognizerLang, uintptr(unsafe.Pointer(&lang))) != nil || lang == nil {
		return ""
	}
	defer lang.release()
	var h uintptr
	if lang.call(ocrSlotLanguageTag, uintptr(unsafe.Pointer(&h))) != nil {
		return ""
	}
	return ocrGoString(h)
}

// ocrEngines returns every OCR engine installed, the user-profile one
// first.
//
// TryCreateFromUserProfileLanguages only uses the first profile language
// that has an OCR pack. When that is English, a Chinese screen comes back
// as just its digits and Latin words, or as nothing at all (#1902), even
// though a Chinese pack is installed. So every installed recognizer
// language runs, and ocrPickResult keeps the one that read the most.
func ocrEngines(statics *ocrObj) ([]*ocrObj, error) {
	var engines []*ocrObj
	profileTag := ""
	var profile *ocrObj
	if statics.call(ocrSlotTryCreateProfile, uintptr(unsafe.Pointer(&profile))) == nil && profile != nil {
		profileTag = ocrLanguageTag(profile)
		engines = append(engines, profile)
	}
	var langs *ocrObj
	if statics.call(ocrSlotAvailableLangs, uintptr(unsafe.Pointer(&langs))) == nil && langs != nil {
		defer langs.release()
		var n uint32
		_ = langs.call(ocrSlotVectorGetSize, uintptr(unsafe.Pointer(&n)))
		for i := range n {
			var lang *ocrObj
			if langs.call(ocrSlotVectorGetAt, uintptr(i), uintptr(unsafe.Pointer(&lang))) != nil || lang == nil {
				continue
			}
			var h uintptr
			tag := ""
			if lang.call(ocrSlotLanguageTag, uintptr(unsafe.Pointer(&h))) == nil {
				tag = ocrGoString(h)
			}
			if tag == "" || tag != profileTag {
				var engine *ocrObj
				if statics.call(ocrSlotTryCreateFromLang, uintptr(unsafe.Pointer(lang)), uintptr(unsafe.Pointer(&engine))) == nil && engine != nil {
					engines = append(engines, engine)
				}
			}
			lang.release()
		}
	}
	if len(engines) == 0 {
		return nil, errors.New("Language package not installed!\n\nSee: https://learn.microsoft.com/zh-cn/windows/powertoys/text-extractor#supported-languages")
	}
	return engines, nil
}

// ocrEnginesFor returns the engines for language tags, in their order.
func ocrEnginesFor(statics *ocrObj, tags []string) ([]*ocrObj, error) {
	factory, err := ocrFactory("Windows.Globalization.Language", ocrIIDLanguageFactory)
	if err != nil {
		return nil, err
	}
	defer factory.release()
	var engines []*ocrObj
	for _, tag := range tags {
		h, err := ocrHString(tag)
		if err != nil {
			return nil, err
		}
		var lang *ocrObj
		err = factory.call(ocrSlotCreateLanguage, h, uintptr(unsafe.Pointer(&lang)))
		ocrFreeHString(h)
		if err != nil {
			return nil, fmt.Errorf("sys: language %s: %w", tag, err)
		}
		var engine *ocrObj
		err = statics.call(ocrSlotTryCreateFromLang, uintptr(unsafe.Pointer(lang)), uintptr(unsafe.Pointer(&engine)))
		lang.release()
		if err != nil || engine == nil {
			for _, e := range engines {
				e.release()
			}
			return nil, fmt.Errorf("sys: no OCR engine for %s", tag)
		}
		engines = append(engines, engine)
	}
	return engines, nil
}

// ocrBitmap returns a SoftwareBitmap of img in BGRA8, scaled down to fit
// in maxDim, the largest image the engines take.
func ocrBitmap(img image.Image, maxDim int) (*ocrObj, error) {
	rgba := ocrOpaque(img, maxDim)
	w, h := rgba.Rect.Dx(), rgba.Rect.Dy()
	pix := make([]byte, len(rgba.Pix))
	for i := 0; i < len(pix); i += 4 {
		pix[i], pix[i+1], pix[i+2], pix[i+3] = rgba.Pix[i+2], rgba.Pix[i+1], rgba.Pix[i], 0xff
	}
	crypto, err := ocrFactory("Windows.Security.Cryptography.CryptographicBuffer", ocrIIDCryptoBufferStatics)
	if err != nil {
		return nil, err
	}
	defer crypto.release()
	var buffer *ocrObj
	if err := crypto.call(ocrSlotCreateFromByteArray, uintptr(len(pix)), uintptr(unsafe.Pointer(&pix[0])), uintptr(unsafe.Pointer(&buffer))); err != nil {
		return nil, fmt.Errorf("sys: create buffer: %w", err)
	}
	defer buffer.release()
	statics, err := ocrFactory("Windows.Graphics.Imaging.SoftwareBitmap", ocrIIDSoftwareBitmapStatic)
	if err != nil {
		return nil, err
	}
	defer statics.release()
	var bitmap *ocrObj
	if err := statics.call(ocrSlotCreateCopyFromBuffer, uintptr(unsafe.Pointer(buffer)), ocrBitmapBgra8, uintptr(w), uintptr(h), uintptr(unsafe.Pointer(&bitmap))); err != nil {
		return nil, fmt.Errorf("sys: create bitmap: %w", err)
	}
	return bitmap, nil
}

// ocrRecognizeBitmap returns the lines one engine reads in bitmap.
func ocrRecognizeBitmap(engine, bitmap *ocrObj) (string, error) {
	var op *ocrObj
	if err := engine.call(ocrSlotRecognizeAsync, uintptr(unsafe.Pointer(bitmap)), uintptr(unsafe.Pointer(&op))); err != nil {
		return "", fmt.Errorf("sys: failed to recognize: %w", err)
	}
	defer op.release()
	result, err := ocrAwait(op, time.Minute)
	if err != nil {
		return "", fmt.Errorf("sys: failed to recognize: %w", err)
	}
	defer result.release()
	var lines *ocrObj
	if err := result.call(ocrSlotResultLines, uintptr(unsafe.Pointer(&lines))); err != nil {
		return "", fmt.Errorf("sys: failed to read lines: %w", err)
	}
	defer lines.release()
	var n uint32
	if err := lines.call(ocrSlotVectorGetSize, uintptr(unsafe.Pointer(&n))); err != nil {
		return "", fmt.Errorf("sys: failed to read lines: %w", err)
	}
	out := make([]string, 0, n)
	for i := range n {
		var line *ocrObj
		if lines.call(ocrSlotVectorGetAt, uintptr(i), uintptr(unsafe.Pointer(&line))) != nil || line == nil {
			continue
		}
		var h uintptr
		if line.call(ocrSlotLineText, uintptr(unsafe.Pointer(&h))) == nil {
			out = append(out, ocrJoinCJKSpaces(strings.TrimSpace(ocrGoString(h))))
		}
		line.release()
	}
	return strings.Join(out, "\n"), nil
}

// ocrRecognizeWith runs every engine on img and keeps the result
// ocrPickResult picks; engines nil means every installed engine.
func ocrRecognizeWith(img image.Image, tags []string) (string, error) {
	if img.Bounds().Empty() {
		return "", nil
	}
	return ocrOnThread(func() (string, error) {
		statics, err := ocrFactory("Windows.Media.Ocr.OcrEngine", ocrIIDOcrEngineStatics)
		if err != nil {
			return "", err
		}
		defer statics.release()
		var engines []*ocrObj
		if tags == nil {
			engines, err = ocrEngines(statics)
		} else {
			engines, err = ocrEnginesFor(statics, tags)
		}
		if err != nil {
			return "", err
		}
		defer func() {
			for _, e := range engines {
				e.release()
			}
		}()
		var maxDim uint32
		_ = statics.call(ocrSlotMaxImageDimension, uintptr(unsafe.Pointer(&maxDim)))
		bitmap, err := ocrBitmap(img, int(maxDim))
		if err != nil {
			return "", err
		}
		defer bitmap.release()

		var results []string
		var firstErr error
		for _, engine := range engines {
			text, err := ocrRecognizeBitmap(engine, bitmap)
			if err != nil {
				if firstErr == nil {
					firstErr = err
				}
				continue
			}
			results = append(results, text)
		}
		if len(results) == 0 {
			if firstErr == nil {
				firstErr = errors.New("sys: no OCR engine produced a result")
			}
			return "", firstErr
		}
		return results[ocrPickResult(results)], nil
	})
}

// RecognizeText returns the text in img, one line of it per line, joined
// by "\n". On Windows it runs Windows.Media.Ocr with the engine of the
// user's profile languages and every other installed recognizer language,
// keeps the result of the profile one unless another read clearly more,
// and drops the spaces Windows puts between Chinese and Japanese
// characters. It fails when no OCR language pack is installed.
func RecognizeText(img image.Image) (string, error) {
	return ocrRecognizeWith(img, nil)
}
