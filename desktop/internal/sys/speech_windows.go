package sys

import (
	"context"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unicode/utf16"
	"unsafe"
)

// On Windows, Windows.Media.SpeechSynthesis (WinRT, called here without
// cgo through its vtables) renders speech to a WAV stream with the OneCore
// voices that Settings › Time & language › Speech lists, and MyGo's audio
// package plays it, which gives the volume and a stop that is immediate.
// Where WinRT can't be had, System.Speech (SAPI 5) does the same through
// PowerShell, with the desktop voices.

var (
	speechCombase                  = syscall.NewLazyDLL("combase.dll")
	speechRoInitialize             = speechCombase.NewProc("RoInitialize")
	speechRoActivateInstance       = speechCombase.NewProc("RoActivateInstance")
	speechRoGetActivationFactory   = speechCombase.NewProc("RoGetActivationFactory")
	speechWindowsCreateString      = speechCombase.NewProc("WindowsCreateString")
	speechWindowsDeleteString      = speechCombase.NewProc("WindowsDeleteString")
	speechWindowsGetStringRawBuf   = speechCombase.NewProc("WindowsGetStringRawBuffer")
	speechShcore                   = syscall.NewLazyDLL("shcore.dll")
	speechCreateStreamOverRAStream = speechShcore.NewProc("CreateStreamOverRandomAccessStream")
)

type speechGUID struct {
	Data1        uint32
	Data2, Data3 uint16
	Data4        [8]byte
}

// speechIID parses a GUID written as xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.
func speechIID(s string) speechGUID {
	h := strings.ReplaceAll(s, "-", "")
	n := func(i, size int) uint64 {
		v, err := strconv.ParseUint(h[i:i+size], 16, 64)
		if err != nil {
			panic("sys: bad GUID " + s)
		}
		return v
	}
	g := speechGUID{Data1: uint32(n(0, 8)), Data2: uint16(n(8, 4)), Data3: uint16(n(12, 4))}
	for i := range g.Data4 {
		g.Data4[i] = byte(n(16+2*i, 2))
	}
	return g
}

var (
	speechIIDSynthesizer        = speechIID("CE9F7C76-97F4-4CED-AD68-D51C458E45C6")
	speechIIDSynthesizer2       = speechIID("A7C5ECB2-4339-4D6A-BBF8-C7A4F1544C2E")
	speechIIDOptions2           = speechIID("1CBEF60E-119C-4BED-B118-D250C3A25793")
	speechIIDInstalledVoices    = speechIID("7D526ECC-7533-4C3F-85BE-888C2BAEEBDC")
	speechIIDAsyncInfo          = speechIID("00000036-0000-0000-C000-000000000046")
	speechIIDRandomAccessStream = speechIID("905A0FE1-BC53-11DF-8C49-001E4FC686DA")
	speechIIDStream             = speechIID("0000000C-0000-0000-C000-000000000046")
)

const speechSynthesizerClass = "Windows.Media.SpeechSynthesis.SpeechSynthesizer"

// speechCOM calls method i of the COM interface obj. Pointers converted to
// uintptr in the call stay valid until it returns (go:uintptrescapes).
//
//go:uintptrescapes
func speechCOM(obj uintptr, i int, args ...uintptr) uintptr {
	vtbl := *(*uintptr)(speechNative(obj))
	fn := *(*uintptr)(unsafe.Add(speechNative(vtbl), i*int(unsafe.Sizeof(uintptr(0)))))
	var a [16]uintptr
	a[0] = obj
	n := copy(a[1:], args)
	r, _, _ := syscall.SyscallN(fn, a[:n+1]...)
	return r
}

// speechNative converts a native address to a pointer.
func speechNative(addr uintptr) unsafe.Pointer { return *(*unsafe.Pointer)(unsafe.Pointer(&addr)) }

func speechFailed(hr uintptr) bool { return int32(uint32(hr)) < 0 }

func speechHRESULT(what string, hr uintptr) error {
	return fmt.Errorf("sys: %s failed (HRESULT %#08x)", what, uint32(hr))
}

func speechRelease(obj uintptr) {
	if obj != 0 {
		speechCOM(obj, 2)
	}
}

func speechQI(obj uintptr, iid *speechGUID, what string) (uintptr, error) {
	var out uintptr
	if hr := speechCOM(obj, 0, uintptr(unsafe.Pointer(iid)), uintptr(unsafe.Pointer(&out))); speechFailed(hr) {
		return 0, speechHRESULT("QueryInterface("+what+")", hr)
	}
	return out, nil
}

// speechHString makes an HSTRING of s, which speechFreeHString frees.
func speechHString(s string) (uintptr, error) {
	s = strings.ReplaceAll(s, "\x00", "")
	if s == "" {
		return 0, nil // NULL is the empty HSTRING
	}
	u, err := syscall.UTF16FromString(s)
	if err != nil {
		return 0, err
	}
	var h uintptr
	if hr, _, _ := speechWindowsCreateString.Call(uintptr(unsafe.Pointer(&u[0])), uintptr(len(u)-1), uintptr(unsafe.Pointer(&h))); speechFailed(hr) {
		return 0, speechHRESULT("WindowsCreateString", hr)
	}
	return h, nil
}

func speechFreeHString(h uintptr) {
	if h != 0 {
		speechWindowsDeleteString.Call(h)
	}
}

// speechGoString returns the text of an HSTRING.
func speechGoString(h uintptr) string {
	if h == 0 {
		return ""
	}
	var n uint32
	p, _, _ := speechWindowsGetStringRawBuf.Call(h, uintptr(unsafe.Pointer(&n)))
	if p == 0 || n == 0 {
		return ""
	}
	return syscall.UTF16ToString(unsafe.Slice((*uint16)(speechNative(p)), n))
}

// speechGetString calls a property getter (method i of obj) that returns
// an HSTRING.
func speechGetString(obj uintptr, i int) string {
	var h uintptr
	if speechFailed(speechCOM(obj, i, uintptr(unsafe.Pointer(&h)))) {
		return ""
	}
	defer speechFreeHString(h)
	return speechGoString(h)
}

// speechWinRT runs fn on the thread that calls the Windows Runtime: one
// of its own, in the multithreaded apartment for as long as the process
// lives, since leaving the apartment after each call makes the next
// activation fail while COM winds it down (CO_E_SERVER_STOPPING).
func speechWinRT(fn func() error) error {
	speechThread.once.Do(func() {
		speechThread.calls = make(chan func())
		ready := make(chan struct{})
		go func() {
			runtime.LockOSThread() // for good: the thread holds the apartment
			if err := speechCombase.Load(); err != nil {
				speechThread.err = err
			} else if hr, _, _ := speechRoInitialize.Call(1); speechFailed(hr) && uint32(hr) != 0x80010106 { // RO_INIT_MULTITHREADED; RPC_E_CHANGED_MODE serves too
				speechThread.err = speechHRESULT("RoInitialize", hr)
			}
			close(ready)
			for call := range speechThread.calls {
				call()
			}
		}()
		<-ready
	})
	if speechThread.err != nil {
		return speechThread.err
	}
	done := make(chan error, 1)
	speechThread.calls <- func() { done <- fn() }
	return <-done
}

var speechThread struct {
	once  sync.Once
	calls chan func()
	err   error
}

// speechInstalled returns the class's IInstalledVoicesStatic.
func speechInstalled() (uintptr, error) {
	class, err := speechHString(speechSynthesizerClass)
	if err != nil {
		return 0, err
	}
	defer speechFreeHString(class)
	var f uintptr
	if hr, _, _ := speechRoGetActivationFactory.Call(class, uintptr(unsafe.Pointer(&speechIIDInstalledVoices)), uintptr(unsafe.Pointer(&f))); speechFailed(hr) {
		return 0, speechHRESULT("RoGetActivationFactory(SpeechSynthesizer)", hr)
	}
	return f, nil
}

// speechVoiceInfo describes a VoiceInformation.
func speechVoiceInfo(v uintptr) Voice {
	return Voice{ID: speechGetString(v, 7), Name: speechGetString(v, 6), Lang: speechGetString(v, 8)}
}

// speechWinRTVoices lists the OneCore voices. With want set, it also
// returns that voice's VoiceInformation (its ID, or the default voice
// for ""), which the caller releases.
func speechWinRTVoices(want *string) (voices []Voice, chosen uintptr, err error) {
	f, err := speechInstalled()
	if err != nil {
		return nil, 0, err
	}
	defer speechRelease(f)
	var all uintptr
	if hr := speechCOM(f, 6, uintptr(unsafe.Pointer(&all))); speechFailed(hr) {
		return nil, 0, speechHRESULT("InstalledVoices.AllVoices", hr)
	}
	defer speechRelease(all)
	var n uint32
	if hr := speechCOM(all, 7, uintptr(unsafe.Pointer(&n))); speechFailed(hr) {
		return nil, 0, speechHRESULT("IVectorView.Size", hr)
	}
	for i := uint32(0); i < n; i++ {
		var v uintptr
		if hr := speechCOM(all, 6, uintptr(i), uintptr(unsafe.Pointer(&v))); speechFailed(hr) {
			return nil, 0, speechHRESULT("IVectorView.GetAt", hr)
		}
		info := speechVoiceInfo(v)
		voices = append(voices, info)
		if want != nil && *want != "" && chosen == 0 && info.ID == *want {
			chosen = v
			continue
		}
		speechRelease(v)
	}
	return voices, chosen, nil
}

// speechDefaultVoice returns the system's default OneCore voice.
func speechDefaultVoice() (Voice, error) {
	var def Voice
	err := speechWinRT(func() error {
		f, err := speechInstalled()
		if err != nil {
			return err
		}
		defer speechRelease(f)
		var v uintptr
		if hr := speechCOM(f, 7, uintptr(unsafe.Pointer(&v))); speechFailed(hr) || v == 0 {
			return speechHRESULT("InstalledVoices.DefaultVoice", hr)
		}
		defer speechRelease(v)
		def = speechVoiceInfo(v)
		return nil
	})
	return def, err
}

// speechSynthesizeWinRT renders text in the OneCore voice voiceID ("" for
// the default) at rate (0.5 to 6; 0 leaves it) to a WAV file's bytes.
func speechSynthesizeWinRT(ctx context.Context, text, voiceID string, rate float64) ([]byte, error) {
	var wav []byte
	err := speechWinRT(func() error {
		class, err := speechHString(speechSynthesizerClass)
		if err != nil {
			return err
		}
		defer speechFreeHString(class)
		var insp uintptr
		if hr, _, _ := speechRoActivateInstance.Call(class, uintptr(unsafe.Pointer(&insp))); speechFailed(hr) {
			return speechHRESULT("RoActivateInstance(SpeechSynthesizer)", hr)
		}
		defer speechRelease(insp)
		synth, err := speechQI(insp, &speechIIDSynthesizer, "ISpeechSynthesizer")
		if err != nil {
			return err
		}
		defer speechRelease(synth)

		if voiceID != "" {
			_, v, err := speechWinRTVoices(&voiceID)
			if err != nil {
				return err
			}
			if v != 0 {
				hr := speechCOM(synth, 8, v) // put_Voice
				speechRelease(v)
				if speechFailed(hr) {
					return speechHRESULT("SpeechSynthesizer.Voice", hr)
				}
			}
		}
		// The speaking rate is a double, which the x64 calling convention
		// passes in XMM1, where the syscall puts the second argument too.
		if rate > 0 && runtime.GOARCH == "amd64" {
			speechSetRate(synth, rate)
		}

		h, err := speechHString(text)
		if err != nil {
			return err
		}
		defer speechFreeHString(h)
		var op uintptr
		if hr := speechCOM(synth, 6, h, uintptr(unsafe.Pointer(&op))); speechFailed(hr) {
			return speechHRESULT("SynthesizeTextToStreamAsync", hr)
		}
		defer speechRelease(op)
		info, err := speechQI(op, &speechIIDAsyncInfo, "IAsyncInfo")
		if err != nil {
			return err
		}
		defer speechRelease(info)
		defer speechCOM(info, 10) // Close
		for {
			var status int32
			if hr := speechCOM(info, 7, uintptr(unsafe.Pointer(&status))); speechFailed(hr) {
				return speechHRESULT("IAsyncInfo.Status", hr)
			}
			if status == 1 { // Completed
				break
			}
			if status == 2 { // Canceled
				return context.Canceled
			}
			if status == 3 { // Error
				var code uintptr
				speechCOM(info, 8, uintptr(unsafe.Pointer(&code)))
				return speechHRESULT("SynthesizeTextToStreamAsync", code)
			}
			if ctx.Err() != nil {
				speechCOM(info, 9) // Cancel
				return ctx.Err()
			}
			time.Sleep(5 * time.Millisecond)
		}
		var result uintptr
		if hr := speechCOM(op, 8, uintptr(unsafe.Pointer(&result))); speechFailed(hr) {
			return speechHRESULT("IAsyncOperation.GetResults", hr)
		}
		defer speechRelease(result)
		wav, err = speechReadStream(result)
		return err
	})
	return wav, err
}

// speechSetRate sets the synthesizer's speaking rate, where Windows has
// ISpeechSynthesizerOptions2 (version 1709 on).
func speechSetRate(synth uintptr, rate float64) {
	s2, err := speechQI(synth, &speechIIDSynthesizer2, "ISpeechSynthesizer2")
	if err != nil {
		return
	}
	defer speechRelease(s2)
	var opts uintptr
	if speechFailed(speechCOM(s2, 6, uintptr(unsafe.Pointer(&opts)))) || opts == 0 {
		return
	}
	defer speechRelease(opts)
	o2, err := speechQI(opts, &speechIIDOptions2, "ISpeechSynthesizerOptions2")
	if err != nil {
		return
	}
	defer speechRelease(o2)
	speechCOM(o2, 9, uintptr(math.Float64bits(rate))) // put_SpeakingRate
}

// speechReadStream reads a SpeechSynthesisStream through an IStream over it.
func speechReadStream(obj uintptr) ([]byte, error) {
	ras, err := speechQI(obj, &speechIIDRandomAccessStream, "IRandomAccessStream")
	if err != nil {
		return nil, err
	}
	defer speechRelease(ras)
	if err := speechShcore.Load(); err != nil {
		return nil, err
	}
	var stream uintptr
	if hr, _, _ := speechCreateStreamOverRAStream.Call(ras, uintptr(unsafe.Pointer(&speechIIDStream)), uintptr(unsafe.Pointer(&stream))); speechFailed(hr) {
		return nil, speechHRESULT("CreateStreamOverRandomAccessStream", hr)
	}
	defer speechRelease(stream)
	var data []byte
	buf := make([]byte, 64<<10)
	for {
		var n uint32
		hr := speechCOM(stream, 3, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)), uintptr(unsafe.Pointer(&n)))
		if speechFailed(hr) {
			return nil, speechHRESULT("IStream.Read", hr)
		}
		data = append(data, buf[:n]...)
		if n == 0 || hr == 1 { // S_FALSE: the end
			break
		}
	}
	if len(data) == 0 {
		return nil, errors.New("sys: the speech synthesizer returned no audio")
	}
	return data, nil
}

// speechSAPI is the PowerShell that drives System.Speech: it lists the
// voices, or with NEXTAI_SPEECH_OUT set renders NEXTAI_SPEECH_TEXT's file
// in NEXTAI_SPEECH_VOICE to that WAV file.
const speechSAPI = `$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  if ($env:NEXTAI_SPEECH_OUT) {
    if ($env:NEXTAI_SPEECH_VOICE) { $s.SelectVoice($env:NEXTAI_SPEECH_VOICE) }
    $s.SetOutputToWaveFile($env:NEXTAI_SPEECH_OUT)
    $s.Speak([IO.File]::ReadAllText($env:NEXTAI_SPEECH_TEXT, [Text.Encoding]::UTF8))
  } else {
    foreach ($v in $s.GetInstalledVoices()) {
      if ($v.Enabled) { $v.VoiceInfo.Name + [char]9 + $v.VoiceInfo.Culture.Name }
    }
  }
} finally { $s.Dispose() }
`

// speechSAPIEncoded returns speechSAPI as -EncodedCommand takes it:
// base64 of UTF-16LE.
func speechSAPIEncoded() string {
	u := utf16.Encode([]rune(speechSAPI))
	b := make([]byte, 2*len(u))
	for i, c := range u {
		binary.LittleEndian.PutUint16(b[2*i:], c)
	}
	return base64.StdEncoding.EncodeToString(b)
}

func speechPowerShell(ctx context.Context, env ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", speechSAPIEncoded())
	cmd.Env = append(os.Environ(), env...)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // CREATE_NO_WINDOW
	out, err := cmd.Output()
	if err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		var ee *exec.ExitError
		if errors.As(err, &ee) {
			return nil, fmt.Errorf("sys: System.Speech: %w: %s", err, strings.TrimSpace(string(ee.Stderr)))
		}
		return nil, fmt.Errorf("sys: System.Speech: %w", err)
	}
	return out, nil
}

func speechSAPIVoices() ([]Voice, error) {
	out, err := speechPowerShell(context.Background())
	if err != nil {
		return nil, err
	}
	var voices []Voice
	for _, line := range strings.Split(string(out), "\n") {
		name, lang, ok := strings.Cut(strings.TrimSpace(line), "\t")
		if ok && name != "" {
			voices = append(voices, Voice{ID: name, Name: name, Lang: lang})
		}
	}
	return voices, nil
}

func speechSynthesizeSAPI(ctx context.Context, text, voice string) ([]byte, error) {
	dir, err := os.MkdirTemp("", "nextai-speech-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	in, out := filepath.Join(dir, "text.txt"), filepath.Join(dir, "speech.wav")
	if err := os.WriteFile(in, []byte(text), 0o600); err != nil {
		return nil, err
	}
	if _, err := speechPowerShell(ctx, "NEXTAI_SPEECH_TEXT="+in, "NEXTAI_SPEECH_OUT="+out, "NEXTAI_SPEECH_VOICE="+voice); err != nil {
		return nil, err
	}
	return os.ReadFile(out)
}

// speechWinRTList lists the OneCore voices.
func speechWinRTList() ([]Voice, error) {
	var voices []Voice
	err := speechWinRT(func() error {
		var err error
		voices, _, err = speechWinRTVoices(nil)
		return err
	})
	return voices, err
}

func speechVoices() ([]Voice, error) {
	if voices, err := speechWinRTList(); err == nil && len(voices) > 0 {
		return voices, nil
	}
	voices, err := speechSAPIVoices()
	if err != nil {
		return nil, err
	}
	if len(voices) == 0 {
		return nil, ErrSpeechUnavailable
	}
	return voices, nil
}

// speechSynthesize renders text in the voice that best suits voiceID and
// locale to a WAV file's bytes, and returns the speed to play it at to
// make up the rate where the engine didn't.
func speechSynthesize(ctx context.Context, text, locale, voiceID string, rate float64) ([]byte, float64, error) {
	// WinRT's voices, when it has any, are those Voices lists; where its
	// synthesis fails all the same, System.Speech speaks in the voice it
	// has for the language.
	voices, err := speechWinRTList()
	if err == nil && len(voices) > 0 {
		def, _ := speechDefaultVoice()
		v, _ := speechPickVoice(voices, voiceID, locale, func(v Voice) int {
			if v.ID == def.ID {
				return 1
			}
			return 0
		})
		native, speed := 0.0, rate
		if runtime.GOARCH == "amd64" {
			native = min(max(rate, 0.5), 6)
			speed = rate / native
		}
		var wav []byte
		if wav, err = speechSynthesizeWinRT(ctx, text, v.ID, native); err == nil || ctx.Err() != nil {
			return wav, speed, err
		}
	}
	voices, sapiErr := speechSAPIVoices()
	if sapiErr != nil || len(voices) == 0 {
		if err == nil {
			err = sapiErr
		}
		if err == nil {
			err = ErrSpeechUnavailable
		}
		return nil, 0, err
	}
	v, _ := speechPickVoice(voices, voiceID, locale, nil)
	wav, err := speechSynthesizeSAPI(ctx, text, v.ID)
	return wav, rate, err
}

func speechSpeak(ctx context.Context, text, locale, voiceID string, rate, volume float64) error {
	wav, speed, err := speechSynthesize(ctx, text, locale, voiceID, rate)
	if err != nil {
		return err
	}
	if math.Abs(speed-1) < 0.01 {
		speed = 1
	}
	return speechPlay(ctx, wav, speed, volume)
}
