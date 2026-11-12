package sys

import (
	"context"
	"testing"
)

func TestSpeechParseSay(t *testing.T) {
	out := "Albert              en_US    # Hello! My name is Albert.\n" +
		"Bad News            en_US    # Hello! My name is Bad News.\n" +
		"Eddy (English (US)) en_US    # Hello! My name is Eddy.\n" +
		"Samantha (Enhanced) en_US    # Hello! My name is Samantha.\n" +
		"Tingting            zh_CN    # 你好！我叫婷婷。\n" +
		"Majed               ar_001   # مرحبًا! اسمي ماجد.\n"
	got := speechParseSay(out)
	want := []Voice{
		{"Albert", "Albert", "en-US"},
		{"Bad News", "Bad News", "en-US"},
		{"Eddy (English (US))", "Eddy (English (US))", "en-US"},
		{"Samantha (Enhanced)", "Samantha (Enhanced)", "en-US"},
		{"Tingting", "Tingting", "zh-CN"},
		{"Majed", "Majed", "ar-001"},
	}
	if len(got) != len(want) {
		t.Fatalf("got %v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("voice %d = %+v, want %+v", i, got[i], want[i])
		}
	}
	if v, _ := speechPickVoice(got, "", "en-US", speechSayRank); v.ID != "Samantha (Enhanced)" {
		t.Errorf("picked %q for en-US", v.ID)
	}
}

func TestSpeechVoicesDarwin(t *testing.T) {
	voices, err := Voices()
	if err != nil {
		t.Fatal(err)
	}
	if len(voices) == 0 {
		t.Fatal("no voices")
	}
	t.Logf("%d voices, first %+v", len(voices), voices[0])
	for _, l := range []string{"en", "zh-Hans", "ja"} {
		v, ok := speechPickVoice(voices, "", TTSLocale(l), speechSayRank)
		t.Logf("%s: %+v %v", l, v, ok)
	}
}

func TestSpeechSynthesizeDarwin(t *testing.T) {
	wav, err := speechSynthesize(context.Background(), "Hello, welcome to NextAI Translator.", "")
	if err != nil {
		t.Fatal(err)
	}
	speechCheckWAV(t, wav)
	voices, _ := Voices()
	if v, ok := speechPickVoice(voices, "", "zh-CN", speechSayRank); ok {
		wav, err := speechSynthesize(context.Background(), "你好，欢迎使用 NextAI Translator", v.ID)
		if err != nil {
			t.Fatal(err)
		}
		speechCheckWAV(t, wav)
	}
}
