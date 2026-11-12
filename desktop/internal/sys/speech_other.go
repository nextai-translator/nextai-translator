//go:build !darwin && !windows

package sys

import (
	"context"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

// Elsewhere (Linux), eSpeak NG (or eSpeak) renders speech to a WAV file
// that MyGo's audio package plays; without either, speech-dispatcher's
// spd-say speaks by itself.

// speechEngine returns the first speech program on PATH: espeak-ng,
// espeak, or spd-say.
func speechEngine() (string, error) {
	for _, name := range []string{"espeak-ng", "espeak", "spd-say"} {
		if path, err := exec.LookPath(name); err == nil {
			return path, nil
		}
	}
	return "", ErrSpeechUnavailable
}

func speechIsSpd(engine string) bool { return filepath.Base(engine) == "spd-say" }

func speechVoices() ([]Voice, error) {
	engine, err := speechEngine()
	if err != nil {
		return nil, err
	}
	if speechIsSpd(engine) {
		out, err := exec.Command(engine, "-L").Output()
		if err != nil {
			return nil, fmt.Errorf("spd-say -L: %w", err)
		}
		return speechParseSpd(string(out)), nil
	}
	out, err := exec.Command(engine, "--voices").Output()
	if err != nil {
		return nil, fmt.Errorf("%s --voices: %w", filepath.Base(engine), err)
	}
	return speechParseEspeak(string(out)), nil
}

// speechParseEspeak parses `espeak-ng --voices`:
//
//	Pty Language       Age/Gender VoiceName          File                 Other Languages
//	 5  af              --/M      Afrikaans          gmw/af
//
// A voice's ID is its file, which -v takes as it takes a language, and
// which, unlike the language, no two voices share.
func speechParseEspeak(out string) []Voice {
	var voices []Voice
	for _, line := range strings.Split(out, "\n") {
		f := strings.Fields(line)
		if len(f) < 4 || f[0] == "Pty" {
			continue
		}
		id := f[1]
		if len(f) >= 5 {
			id = f[4]
		}
		voices = append(voices, Voice{ID: id, Name: strings.ReplaceAll(f[3], "_", " "), Lang: speechBCP47(f[1])})
	}
	return voices
}

// speechParseSpd parses `spd-say -L`:
//
//	NAME                 LANGUAGE             VARIANT
//	afrikaans            af                   none
func speechParseSpd(out string) []Voice {
	var voices []Voice
	for _, line := range strings.Split(out, "\n") {
		f := strings.Fields(line)
		if len(f) < 2 || f[0] == "NAME" {
			continue
		}
		voices = append(voices, Voice{ID: f[0], Name: f[0], Lang: speechBCP47(f[1])})
	}
	return voices
}

// speechBCP47 turns eSpeak's language names (en-us, cmn, yue) into
// BCP-47 tags (en-US, zh-CN, zh-HK).
func speechBCP47(lang string) string {
	switch strings.ToLower(lang) {
	case "cmn":
		return "zh-CN"
	case "yue":
		return "zh-HK"
	}
	parts := strings.Split(lang, "-")
	parts[0] = strings.ToLower(parts[0])
	for i := 1; i < len(parts); i++ {
		if len(parts[i]) == 2 {
			parts[i] = strings.ToUpper(parts[i])
		}
	}
	return strings.Join(parts, "-")
}

// speechSynthesize renders text with eSpeak in voice (an ID of Voices; ""
// for its default) at rate to a WAV file's bytes.
func speechSynthesize(ctx context.Context, engine, text, voice string, rate float64) ([]byte, error) {
	dir, err := os.MkdirTemp("", "nextai-speech-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)
	file := filepath.Join(dir, "speech.wav")
	// 175 words a minute is eSpeak's normal speed; it takes 80 to 450.
	wpm := int(math.Round(min(max(175*rate, 80), 450)))
	args := []string{"-w", file, "-s", strconv.Itoa(wpm), "-b", "1", "--stdin"}
	if voice != "" {
		args = append(args, "-v", voice)
	}
	cmd := exec.CommandContext(ctx, engine, args...)
	cmd.Stdin = strings.NewReader(text)
	if out, err := cmd.CombinedOutput(); err != nil {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, fmt.Errorf("%s: %w: %s", filepath.Base(engine), err, strings.TrimSpace(string(out)))
	}
	return os.ReadFile(file)
}

func speechSpeak(ctx context.Context, text, locale, voiceID string, rate, volume float64) error {
	engine, err := speechEngine()
	if err != nil {
		return err
	}
	voices, _ := speechVoices()
	voice := ""
	if v, ok := speechPickVoice(voices, voiceID, locale, nil); ok {
		voice = v.ID
	}
	if speechIsSpd(engine) {
		return speechSpd(ctx, engine, text, locale, voice, rate, volume)
	}
	wav, err := speechSynthesize(ctx, engine, text, voice, rate)
	if err != nil {
		return err
	}
	// eSpeak spoke at the rate where it could; the player makes up the rest.
	speed := rate / (min(max(175*rate, 80), 450) / 175)
	if math.Abs(speed-1) < 0.01 {
		speed = 1
	}
	return speechPlay(ctx, wav, speed, volume)
}

// speechSpd speaks with spd-say, which waits (-w) until it has spoken;
// cancelling kills it and stops what speech-dispatcher is saying.
func speechSpd(ctx context.Context, engine, text, locale, voice string, rate, volume float64) error {
	r := int(math.Round(min(max((rate-1)*100, -100), 100)))
	v := int(math.Round(volume*200 - 100))
	args := []string{"-w", "-e", "-r", strconv.Itoa(r), "-i", strconv.Itoa(v), "-l", speechPrimary(locale)}
	if voice != "" {
		args = append(args, "-y", voice)
	}
	cmd := exec.CommandContext(ctx, engine, args...)
	cmd.Stdin = strings.NewReader(text)
	err := cmd.Run()
	if ctx.Err() != nil {
		_ = exec.Command(engine, "-S").Run()
		return ctx.Err()
	}
	if err != nil {
		return fmt.Errorf("spd-say: %w", err)
	}
	return nil
}
