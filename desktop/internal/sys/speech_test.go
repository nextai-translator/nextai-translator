package sys

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/egoist/mygo/audio"
)

func TestTTSLocale(t *testing.T) {
	for lang, want := range map[string]string{
		"en":      "en-US",
		"zh-Hans": "zh-CN",
		"zh-Hant": "zh-TW",
		"yue":     "zh-HK",
		"lzh":     "zh-CN",
		"ja":      "ja-JP",
		"ko":      "ko-KR",
		"pt":      "pt-PT",
		"ar":      "ar-001",
		"sv":      "sv-SE",
		"tlh":     "en-US",
		"":        "en-US",
	} {
		if got := TTSLocale(lang); got != want {
			t.Errorf("TTSLocale(%q) = %q, want %q", lang, got, want)
		}
	}
}

func TestSpeechPickVoice(t *testing.T) {
	voices := []Voice{
		{ID: "a", Lang: "en-GB"},
		{ID: "b", Lang: "en-US"},
		{ID: "c", Lang: "en_US"},
		{ID: "d", Lang: "zh-CN"},
		{ID: "e", Lang: "cmn"},
		{ID: "f", Lang: "fr-CA"},
	}
	rankC := func(v Voice) int {
		if v.ID == "c" {
			return 5
		}
		return 0
	}
	for _, tc := range []struct {
		id, locale string
		rank       func(Voice) int
		want       string
		ok         bool
	}{
		{"", "en-US", nil, "b", true},
		{"", "en-US", rankC, "c", true},
		{"a", "en-US", nil, "a", true},
		{"gone", "en-US", nil, "b", true},
		{"", "zh-TW", nil, "d", true},
		{"", "fr-FR", nil, "f", true},
		{"", "ja-JP", nil, "", false},
		{"f", "ja-JP", nil, "f", true},
	} {
		v, ok := speechPickVoice(voices, tc.id, tc.locale, tc.rank)
		if v.ID != tc.want || ok != tc.ok {
			t.Errorf("speechPickVoice(%q, %q) = %q, %v; want %q, %v", tc.id, tc.locale, v.ID, ok, tc.want, tc.ok)
		}
	}
}

// speechCheckWAV fails t unless wav is audio of some length.
func speechCheckWAV(t *testing.T, wav []byte) {
	t.Helper()
	s, err := audio.DecodeSound(wav)
	if err != nil {
		t.Fatalf("decode %d bytes: %v", len(wav), err)
	}
	if s.Duration() < 300*time.Millisecond {
		t.Fatalf("speech lasts %v", s.Duration())
	}
	t.Logf("%d bytes, %v", len(wav), s.Duration())
}

func TestSpeakEmpty(t *testing.T) {
	if err := Speak(context.Background(), "  ", "en", "", 1, 1); err != nil {
		t.Fatal(err)
	}
}

// TestSpeak plays a sentence silently, and stops one when its context is
// cancelled.
func TestSpeak(t *testing.T) {
	if _, err := Voices(); errors.Is(err, ErrSpeechUnavailable) {
		t.Skip(err)
	}
	start := time.Now()
	if err := Speak(context.Background(), "Hello.", "en", "", 2, 0); err != nil {
		t.Fatal(err)
	}
	t.Logf("spoke in %v", time.Since(start))

	ctx, cancel := context.WithTimeout(context.Background(), 1500*time.Millisecond)
	defer cancel()
	start = time.Now()
	err := Speak(ctx, "This is a much longer sentence, which goes on for quite a while so that it is still being spoken when the context is cancelled.", "en", "", 1, 0)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("Speak = %v, want the deadline", err)
	}
	if d := time.Since(start); d > 2500*time.Millisecond {
		t.Fatalf("cancelled Speak returned after %v", d)
	}
}
