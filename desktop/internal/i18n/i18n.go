// Package i18n translates the interface. The strings are the extension's
// (src/common/i18n/locales), copied here by `go generate`: each file maps the
// English text to its translation, so a missing key shows the English.
package i18n

//go:generate sh -c "for d in ../../../src/common/i18n/locales/*/; do cp \"$d/translation.json\" \"locales/$(basename $d).json\"; done"

import (
	"embed"
	"encoding/json"
	"strings"
	"sync"
	"sync/atomic"
)

//go:embed locales/*.json
var files embed.FS

// Locale is one interface language.
type Locale struct {
	Code string
	Name string
}

// Locales are offered in the settings, in this order.
var Locales = []Locale{
	{"en", "English"},
	{"zh-Hans", "简体中文"},
	{"zh-Hant", "繁體中文"},
	{"ja", "日本語"},
	{"ko", "한국어"},
	{"pt-BR", "Português (Brasil)"},
	{"th", "ไทย"},
	{"tr", "Türkçe"},
}

var (
	current atomic.Pointer[map[string]string]
	loaded  sync.Map // code → map[string]string
)

func load(code string) map[string]string {
	if m, ok := loaded.Load(code); ok {
		return m.(map[string]string)
	}
	m := map[string]string{}
	if b, err := files.ReadFile("locales/" + code + ".json"); err == nil {
		_ = json.Unmarshal(b, &m)
	}
	loaded.Store(code, m)
	return m
}

// Set switches the interface language; an unknown code shows English.
func Set(code string) {
	m := load(code)
	current.Store(&m)
}

// T translates s, replacing {{0}}, {{1}}… (or {{name}} in order) with args.
func T(s string, args ...string) string {
	out := s
	if m := current.Load(); m != nil {
		if v, ok := (*m)[s]; ok && v != "" {
			out = v
		}
	}
	for i, a := range args {
		start := strings.Index(out, "{{")
		if start < 0 {
			break
		}
		end := strings.Index(out[start:], "}}")
		if end < 0 {
			break
		}
		_ = i
		out = out[:start] + a + out[start+end+2:]
	}
	return out
}
