package sys

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

// On macOS, say(1) speaks with the voices installed in System Settings ›
// Accessibility › Spoken Content. It renders the speech to a WAV file that
// MyGo's audio package plays, which gives the volume, the speed and a stop
// that is immediate.

// speechSayLine is a line of `say -v '?'`: the name (which may hold spaces
// and parentheses), the locale, and a sample sentence.
var speechSayLine = regexp.MustCompile(`^(.+?)\s+([a-z]{2,3}(?:[_-][A-Za-z0-9]+)*)\s+#`)

func speechVoices() ([]Voice, error) {
	out, err := exec.Command("/usr/bin/say", "-v", "?").Output()
	if err != nil {
		return nil, fmt.Errorf("say -v ?: %w", err)
	}
	return speechParseSay(string(out)), nil
}

func speechParseSay(out string) []Voice {
	var voices []Voice
	for _, line := range strings.Split(out, "\n") {
		m := speechSayLine.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		name := strings.TrimSpace(m[1])
		voices = append(voices, Voice{ID: name, Name: name, Lang: strings.ReplaceAll(m[2], "_", "-")})
	}
	return voices
}

// speechNovelty are macOS's novelty and Eloquence voices, which aren't
// picked for a language unless the user picks them.
var speechNovelty = map[string]int{
	"Albert": -100, "Bad News": -100, "Bahh": -100, "Bells": -100, "Boing": -100,
	"Bubbles": -100, "Cellos": -100, "Good News": -100, "Jester": -100,
	"Organ": -100, "Superstar": -100, "Trinoids": -100, "Whisper": -100,
	"Wobble": -100, "Zarvox": -100, "Junior": -50, "Ralph": -50, "Fred": -50,
	"Kathy": -50, "Deranged": -100, "Hysterical": -100, "Pipe Organ": -100,
	"Princess": -100,
}

// speechSayRank orders a language's voices: premium and enhanced voices
// first, then the classic ones (Samantha for English), the Eloquence
// voices (Eddy, Flo, …, named with their language) and the novelty ones
// last.
func speechSayRank(v Voice) int {
	base, _, _ := strings.Cut(v.Name, " (")
	if r, ok := speechNovelty[base]; ok {
		return r
	}
	switch {
	case strings.Contains(v.Name, "(Premium)"):
		return 30
	case strings.Contains(v.Name, "(Enhanced)"):
		return 20
	case strings.Contains(v.Name, "("):
		return -10 // Eloquence: "Eddy (English (US))"
	case base == "Samantha" || base == "Tingting" || base == "Meijia" || base == "Sinji":
		return 10
	}
	return 0
}

// speechSynthesize renders text in voice (a name of say's; "" for the
// system's voice) to a WAV file's bytes.
func speechSynthesize(ctx context.Context, text, voice string) ([]byte, error) {
	dir, err := os.MkdirTemp("", "nextai-speech-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	file := filepath.Join(dir, "speech.wav")
	args := []string{"-o", file, "--file-format=WAVE", "--data-format=LEI16"}
	if voice != "" {
		args = append(args, "-v", voice)
	}
	cmd := exec.CommandContext(ctx, "/usr/bin/say", args...)
	cmd.Stdin = strings.NewReader(text)
	if out, err := cmd.CombinedOutput(); err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("say: %w: %s", err, strings.TrimSpace(string(out)))
	}
	return os.ReadFile(file)
}

func speechSpeak(ctx context.Context, text, locale, voiceID string, rate, volume float64) error {
	voices, err := speechVoices()
	if err != nil {
		return err
	}
	voice := ""
	if v, ok := speechPickVoice(voices, voiceID, locale, speechSayRank); ok {
		voice = v.ID
	}
	wav, err := speechSynthesize(ctx, text, voice)
	if err != nil {
		return err
	}
	return speechPlay(ctx, wav, rate, volume)
}
