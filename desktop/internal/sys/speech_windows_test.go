package sys

import (
	"context"
	"strings"
	"testing"
)

func TestSpeechVoicesWindows(t *testing.T) {
	err := speechWinRT(func() error {
		v, _, err := speechWinRTVoices(nil)
		t.Logf("WinRT voices: %d", len(v))
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	voices, err := Voices()
	if err != nil {
		t.Fatal(err)
	}
	if len(voices) == 0 {
		t.Fatal("no voices")
	}
	for _, v := range voices {
		t.Logf("%+v", v)
	}
	def, err := speechDefaultVoice()
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("default %+v", def)
}

func TestSpeechSynthesizeWinRT(t *testing.T) {
	wav, err := speechSynthesizeWinRT(context.Background(), "Hello, welcome to NextAI Translator.", "", 1.5)
	if err != nil {
		t.Fatal(err)
	}
	speechCheckWAV(t, wav)
	voices, err := Voices()
	if err != nil {
		t.Fatal(err)
	}
	last := voices[len(voices)-1]
	wav, err = speechSynthesizeWinRT(context.Background(), "Hello.", last.ID, 0)
	if err != nil {
		t.Fatalf("%s: %v", last.ID, err)
	}
	speechCheckWAV(t, wav)
	for _, v := range voices {
		if !strings.HasPrefix(v.ID, `HKEY_LOCAL_MACHINE\`) {
			t.Fatalf("not a OneCore voice: %+v", v)
		}
	}
	// The voice Speak picks for each language.
	for _, l := range []string{"en", "zh-Hans", "zh-Hant", "ja"} {
		wav, speed, err := speechSynthesize(context.Background(), "Hello. 你好", TTSLocale(l), "", 0.3)
		if err != nil {
			t.Fatalf("%s: %v", l, err)
		}
		if speed != 0.6 {
			t.Errorf("%s: speed %v", l, speed)
		}
		speechCheckWAV(t, wav)
	}
}

func TestSpeechSAPI(t *testing.T) {
	voices, err := speechSAPIVoices()
	if err != nil {
		t.Fatal(err)
	}
	if len(voices) == 0 {
		t.Skip("no System.Speech voices")
	}
	t.Logf("%+v", voices)
	wav, err := speechSynthesizeSAPI(context.Background(), "Hello, welcome to NextAI Translator.", voices[0].ID)
	if err != nil {
		t.Fatal(err)
	}
	speechCheckWAV(t, wav)
}
