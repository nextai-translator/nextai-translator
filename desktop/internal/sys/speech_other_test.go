//go:build !darwin && !windows

package sys

import (
	"context"
	"errors"
	"testing"
)

const ttsTestText = "你好，欢迎使用 NextAI Translator"

func TestSpeechParseEspeak(t *testing.T) {
	out := "Pty Language       Age/Gender VoiceName          File                 Other Languages\n" +
		" 5  af              --/M      Afrikaans          gmw/af\n" +
		" 5  cmn             --/M      Chinese_(Mandarin) sit/cmn              (zh-cmn 5)(zh 5)\n" +
		" 2  en-us           --/M      English_(America)  gmw/en-US            (en 3)\n"
	got := speechParseEspeak(out)
	want := []Voice{
		{"gmw/af", "Afrikaans", "af"},
		{"sit/cmn", "Chinese (Mandarin)", "zh-CN"},
		{"gmw/en-US", "English (America)", "en-US"},
	}
	if len(got) != len(want) {
		t.Fatalf("got %v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("voice %d = %+v, want %+v", i, got[i], want[i])
		}
	}
}

func TestSpeechSynthesizeEspeak(t *testing.T) {
	engine, err := speechEngine()
	if errors.Is(err, ErrSpeechUnavailable) || speechIsSpd(engine) {
		t.Skip("no eSpeak")
	}
	voices, err := Voices()
	if err != nil || len(voices) == 0 {
		t.Fatal(voices, err)
	}
	t.Logf("%d voices", len(voices))
	wav, err := speechSynthesize(context.Background(), engine, "Hello, welcome to NextAI Translator.", "", 1)
	if err != nil {
		t.Fatal(err)
	}
	speechCheckWAV(t, wav)
	for _, l := range []string{"en", "zh-Hans", "yue", "ja"} {
		v, ok := speechPickVoice(voices, "", TTSLocale(l), nil)
		if !ok {
			t.Fatalf("no voice for %s", l)
		}
		wav, err := speechSynthesize(context.Background(), engine, ttsTestText, v.ID, 0.5)
		if err != nil {
			t.Fatalf("%s %+v: %v", l, v, err)
		}
		t.Logf("%s: %+v", l, v)
		speechCheckWAV(t, wav)
	}
}
