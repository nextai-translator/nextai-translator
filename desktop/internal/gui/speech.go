package gui

import (
	"context"
	"slices"
	"strings"

	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/lang"
	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
	"github.com/nextai-translator/nextai-translator/desktop/internal/sys"
)

// ttsTestText is ttsLangTestTextMap in src/common/tts/index.ts: what a
// voice reads when tried, and the languages a voice can be set for.
var ttsTestText = map[string]string{
	"en":      "Hello, welcome to NextAI Translator",
	"zh-Hans": "你好，欢迎使用 NextAI Translator",
	"zh-Hant": "你好，歡迎使用 NextAI Translator",
	"yue":     "你好，歡迎使用 NextAI Translator",
	"lzh":     "你好，歡迎使用 NextAI Translator",
	"ja":      "こんにちは、NextAI Translator をご利用いただきありがとうございます",
	"ko":      "안녕하세요, NextAI Translator 를 사용해 주셔서 감사합니다",
	"fr":      "Bonjour, merci d'utiliser NextAI Translator",
	"de":      "Hallo, vielen Dank, dass Sie NextAI Translator verwenden",
	"es":      "Hola, gracias por usar NextAI Translator",
	"it":      "Ciao, grazie per aver utilizzato NextAI Translator",
	"ru":      "Здравствуйте, спасибо за использование NextAI Translator",
	"pt":      "Olá, obrigado por usar o NextAI Translator",
	"nl":      "Hallo, bedankt voor het gebruik van NextAI Translator",
	"pl":      "Cześć, dziękujemy za korzystanie z NextAI Translator",
	"ar":      "مرحبًا ، شكرًا لك على استخدام NextAI Translator",
	"bg":      "Здравейте, благодаря ви, че използвате NextAI Translator",
	"ca":      "Hola, gràcies per utilitzar NextAI Translator",
	"cs":      "Ahoj, děkujeme, že používáte NextAI Translator",
	"da":      "Hej, tak fordi du bruger NextAI Translator",
	"el":      "Γεια σας, ευχαριστούμε που χρησιμοποιείτε το NextAI Translator",
	"fi":      "Hei, kiitos, že käytät NextAI Translator",
	"he":      "שלום, תודה שהשתמשת ב- NextAI Translator",
	"hi":      "नमस्ते, NextAI Translator का उपयोग करने के लिए धन्यवाद",
	"hr":      "Bok, hvala što koristite NextAI Translator",
	"id":      "Halo, terima kasih telah menggunakan NextAI Translator",
	"vi":      "Xin chào, cảm ơn bạn đã sử dụng NextAI Translator",
	"sv":      "Hej, tack för att du använder NextAI Translator",
}

// speechState is what the TTS tab and the speaker buttons keep.
type speechState struct {
	voices    []sys.Voice
	loaded    bool
	loading   bool
	adding    bool   // the language select of a new voice shows
	addLang   string // what it picked
	speaking  string // key of the speaker playing, "" for none
	cancel    context.CancelFunc
	gen       int
	speakErr  string
	errVoices string
}

// loadVoices asks the system for its voices, once.
func (a *App) loadVoices() {
	if a.sp.loaded || a.sp.loading {
		return
	}
	a.sp.loading = true
	go func() {
		vs, err := a.Voices()
		a.post(func() {
			a.sp.voices, a.sp.loaded, a.sp.loading = vs, true, false
			if err != nil {
				a.sp.errVoices = err.Error()
			}
		})
	}()
}

// voicesFor lists the voices that speak the app's language code l, as
// getVoiceOptions does: those of its locale, or of its primary language
// when the code is one.
func voicesFor(voices []sys.Voice, l string) []sys.Voice {
	loc := strings.ToLower(sys.TTSLocale(l))
	var out []sys.Voice
	for _, v := range voices {
		vl := strings.ToLower(strings.ReplaceAll(v.Lang, "_", "-"))
		if vl == loc || strings.SplitN(vl, "-", 2)[0] == strings.ToLower(l) {
			out = append(out, v)
		}
	}
	return out
}

// ttsRate is the speed Speak takes for the setting's 1–20 scale, where 10
// is normal.
func ttsRate(s settings.Settings) float64 {
	if s.TTS.Rate == nil {
		return 1
	}
	return min(max(*s.TTS.Rate, 1), 20) / 10
}

func ttsVolume(s settings.Settings) float64 {
	if s.TTS.Volume == nil {
		return 1
	}
	return min(max(*s.TTS.Volume, 0), 100) / 100
}

func ttsVoice(s settings.Settings, l string) string {
	for _, v := range s.TTS.Voices {
		if v.Lang == l {
			return v.Voice
		}
	}
	return ""
}

// speak reads text in the app's language l with the voice the settings
// give it; key names the button that started it, and speaking again with
// the same key stops it.
func (a *App) speak(key, text, l string, s settings.Settings) {
	if a.sp.speaking != "" {
		was := a.sp.speaking
		a.stopSpeaking()
		if was == key {
			return
		}
	}
	if strings.TrimSpace(text) == "" {
		return
	}
	if l == "" {
		l = "en"
	}
	ctx, cancel := context.WithCancel(context.Background())
	a.sp.gen++
	gen := a.sp.gen
	a.sp.cancel, a.sp.speaking, a.sp.speakErr = cancel, key, ""
	voice, rate, vol := ttsVoice(s, l), ttsRate(s), ttsVolume(s)
	go func() {
		err := a.Say(ctx, text, l, voice, rate, vol)
		canceled := ctx.Err() != nil
		cancel()
		a.post(func() {
			if gen != a.sp.gen {
				return
			}
			a.sp.cancel, a.sp.speaking = nil, ""
			if err != nil && !canceled {
				a.sp.speakErr = err.Error()
			}
		})
	}()
}

// stopSpeaking ends what is being read.
func (a *App) stopSpeaking() {
	if a.sp.cancel != nil {
		a.sp.cancel()
	}
	a.sp.gen++
	a.sp.cancel, a.sp.speaking = nil, ""
}

// speakerButton is the round speaker of the Tauri app: it reads text, and
// spins while it does; a second click stops it.
func (a *App) speakerButton(c *ui.Context, p palette, key, text, l string, size float32) {
	label := T("Speak")
	b := ui.Row(c.Key("speak-"+key)).Size(size+12, size+12).Center().Radius((size + 12) / 2).
		Cursor(ui.CursorPointer).TextColor(p.text).Role(ui.RoleButton).Label(label).Tooltip(label)
	if b.Hovered() {
		b.Background(p.hover)
	}
	b.Children(func() {
		if a.sp.speaking == key {
			ui.Spinner(c).Size(size, size)
		} else {
			ui.Icon(c, riRxSpeakerLoud).Size(size, size)
		}
	})
	if b.Clicked() {
		a.speak(key, text, l, a.Settings.Get())
	}
}

func (a *App) ttsSettings(c *ui.Context, p palette, d *settings.Settings) {
	a.loadVoices()
	formItem(c, p, T("Read the selected words in input"), false, nil, func() {
		formCheckbox(c, p, "read-selected", &d.ReadSelectedWordsFromInputElementsText)
	})
	formItem(c, p, T("TTS"), false, nil, func() {
		ui.Column(c).Gap(20).Margin(12, 0, 0, 0).Children(func() {
			ttsSlider(c, p, "rate", T("Rate"), &d.TTS.Rate, 10, 1, 20, T("Slow"), T("Fast"))
			ttsSlider(c, p, "volume", T("Volume"), &d.TTS.Volume, 100, 0, 100, T("Quiet"), T("Loud"))
			ui.Column(c).Gap(10).Children(func() {
				ui.Text(c, T("Voice")).FontSize(14).FontWeight(500).TextColor(p.text)
				a.voiceRows(c, p, d)
			})
		})
	})
}

func ttsSlider(c *ui.Context, p palette, key, label string, value **float64, def, lo, hi float64, left, right string) {
	v := def
	if *value != nil {
		v = **value
	}
	ui.Column(c).Gap(10).Children(func() {
		ui.Text(c, label).FontSize(14).FontWeight(500).TextColor(p.text)
		s := ui.SliderBase(c.Key(key), &v, lo, hi).Step(1).Height(24).PaddingX(12)
		frac := float32((v - lo) / (hi - lo))
		track, fill := p.control, p.primaryBg
		s.Draw(func(pt *ui.Painter, r ui.Rect) {
			w := r.W - 24
			pt.Fill(ui.Rect{X: r.X + 12, Y: r.Y + 10, W: w, H: 4}, track, 0)
			pt.Fill(ui.Rect{X: r.X + 12, Y: r.Y + 10, W: w * frac, H: 4}, fill, 0)
			pt.Fill(ui.Rect{X: r.X + 12 + w*frac - 12, Y: r.Y, W: 24, H: 24}, fill, 12)
		})
		if s.Changed() {
			nv := v
			*value = &nv
		}
		ui.Row(c).Padding(0, 16).Children(func() {
			ui.Text(c, left).FontSize(14).TextColor(p.text)
			ui.Spacer(c)
			ui.Text(c, right).FontSize(14).TextColor(p.text)
		})
	})
}

// voiceRows lists a voice per language, as TTSVoicesSettings does.
func (a *App) voiceRows(c *ui.Context, p palette, d *settings.Settings) {
	if a.sp.loading {
		ui.Spinner(c).Size(16, 16)
		return
	}
	if a.sp.errVoices != "" {
		ui.Text(c, a.sp.errVoices).FontSize(12).TextColor(p.errText).Wrap()
	}
	mini := selectLook{height: 28, fontSize: 12}
	langCodes := func(keep string) ([]string, []string) {
		var codes, names []string
		for _, l := range lang.Targets() {
			if _, ok := ttsTestText[l.Code]; !ok {
				continue
			}
			if l.Code != keep && slices.ContainsFunc(d.TTS.Voices, func(v settings.TTSVoice) bool { return v.Lang == l.Code }) {
				continue
			}
			codes, names = append(codes, l.Code), append(names, l.Name)
		}
		return codes, names
	}
	remove := -1
	for i := range d.TTS.Voices {
		v := &d.TTS.Voices[i]
		ui.Row(c.Key("voice-" + v.Lang)).Gap(6).AlignItems(ui.Center).Children(func() {
			codes, names := langCodes(v.Lang)
			ui.Column(c).Width(115).Shrink(0).Children(func() {
				look := mini
				look.placeholder = T("Please select a language")
				formSelectLook(c, p, "lang", &v.Lang, codes, names, nil, look)
			})
			ui.Column(c).Grow(1).Shrink(1).MinWidth(0).Children(func() {
				var ids, labels []string
				for _, sv := range voicesFor(a.sp.voices, v.Lang) {
					ids, labels = append(ids, sv.ID), append(labels, sv.Name)
				}
				look := mini
				look.placeholder = T("Please select a voice")
				formSelectLook(c, p, "voice", &v.Voice, ids, labels, nil, look)
			})
			a.speakerButton(c, p, "voice-"+v.Lang, ttsTestText[v.Lang], v.Lang, 12)
			del := ui.Row(c.Key("del")).Size(28, 28).Shrink(0).Center().Radius(14).Background(p.secondaryBtn).
				Cursor(ui.CursorPointer).TextColor(p.text).Role(ui.RoleButton).Label(T("Delete"))
			del.Children(func() { ui.Icon(c, riRiDeleteBin5Line).Size(12, 12) })
			if del.Clicked() {
				remove = i
			}
		})
	}
	if remove >= 0 {
		d.TTS.Voices = slices.Delete(slices.Clone(d.TTS.Voices), remove, remove+1)
	}
	ui.Row(c).Gap(10).Margin(10, 0, 0, 0).AlignItems(ui.Center).Children(func() {
		if a.sp.adding {
			codes, names := langCodes("")
			ui.Column(c).Width(160).Children(func() {
				look := mini
				look.placeholder = T("Please select a language")
				if formSelectLook(c, p, "add-lang", &a.sp.addLang, codes, names, nil, look) && a.sp.addLang != "" {
					voice := ""
					if vs := voicesFor(a.sp.voices, a.sp.addLang); len(vs) > 0 {
						voice = vs[0].ID
					}
					d.TTS.Voices = append(slices.Clone(d.TTS.Voices), settings.TTSVoice{Lang: a.sp.addLang, Voice: voice})
					a.sp.adding, a.sp.addLang = false, ""
				}
			})
		}
		add := ui.Row(c.Key("add")).Height(28).Padding(0, 10).Gap(6).Radius(8).AlignItems(ui.Center).
			Background(p.secondaryBtn).Cursor(ui.CursorPointer).TextColor(p.text).Role(ui.RoleButton)
		add.Children(func() {
			ui.Icon(c, riIoMdAdd).Size(12, 12)
			ui.Text(c, T("Add")).FontSize(12).FontWeight(500)
		})
		if add.Clicked() {
			a.sp.adding = true
		}
	})
}

func (a *App) writingSettings(c *ui.Context, p palette, d *settings.Settings) {
	tc, tn := langOptions(lang.Targets(), "")
	formItem(c, p, T("Writing target language"), false, nil, func() {
		formSelect(c, p, "writing-target", &d.WritingTargetLanguage, tc[1:], tn[1:], nil, false)
	})
	a.hotkeyItem(c, p, T("Writing Hotkey"), "writingHotkey", &d.WritingHotkey,
		T("Press this shortcut key in the input box of any application, and the text already entered in the input box will be automatically translated into the writing target language."))
	a.hotkeyItem(c, p, T("Writing line break shortcut"), "writingNewlineHotkey", &d.WritingNewlineHotkey,
		T("When writing, which key should be pressed when encountering a line break?"))
}
