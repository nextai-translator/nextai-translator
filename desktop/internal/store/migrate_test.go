package store

import (
	"os"
	"path/filepath"
	"testing"
)

const tauriExportSample = `{"version":1,"exportedAt":1700000000000,
"actions":[
 {"id":1,"idx":0,"mode":"translate","name":"Translate","icon":"MdOutlineGTranslate","provider":"Gemini","apiModel":"gemini-2.5-flash","createdAt":"2023-01-01T00:00:00Z","updatedAt":"2023-01-01T00:00:00Z"},
 {"id":2,"idx":1,"mode":"polishing","name":"Polishing","createdAt":"1","updatedAt":"1"},
 {"id":9,"idx":2,"name":"Pirate","icon":"GiPirateHat","rolePrompt":"You are a pirate","commandPrompt":"Say: ${text}","outputRenderingFormat":"markdown","createdAt":1690000000000,"updatedAt":"1690000000001"}
],
"history":[
 {"id":3,"text":"hello","translatedText":"你好","sourceLang":"en","targetLang":"zh-Hans","actionId":1,"actionMode":"translate","favorite":true,"createdAt":1690000000100,"updatedAt":1690000000100},
 {"id":4,"text":"ahoy","translatedText":"Arr","sourceLang":"en","targetLang":"en","actionId":9,"actionName":"Pirate","favorite":false,"createdAt":1690000000200,"updatedAt":1690000000300}
]}`

func TestImportTauri(t *testing.T) {
	s, path := open(t)
	export := filepath.Join(filepath.Dir(path), TauriExportFile)

	if ok, err := s.ImportTauri(export); ok || err != nil {
		t.Fatalf("missing file: %v %v", ok, err)
	}
	if err := os.WriteFile(export, []byte(tauriExportSample), 0o644); err != nil {
		t.Fatal(err)
	}
	if ok, err := s.ImportTauri(export); !ok || err != nil {
		t.Fatalf("import: %v %v", ok, err)
	}

	tr, _ := s.ActionByMode(ModeTranslate)
	if tr.Provider != "Gemini" || tr.APIModel != "gemini-2.5-flash" {
		t.Fatalf("built-in translate = %+v", tr)
	}
	acts := s.Actions()
	pirate := acts[len(acts)-1]
	if pirate.Name != "Pirate" || pirate.CommandPrompt != "Say: ${text}" || pirate.CreatedAt != "1690000000000" ||
		pirate.OutputRenderingFormat != "markdown" || len(acts) != len(BuiltinActions)+1 {
		t.Fatalf("actions = %+v", acts)
	}

	hist := s.History(HistoryQuery{})
	if len(hist) != 2 {
		t.Fatalf("history = %+v", hist)
	}
	byText := map[string]HistoryItem{}
	for _, h := range hist {
		byText[h.Text] = h
	}
	if h := byText["hello"]; h.ActionID != tr.ID || !h.Favorite || h.CreatedAt != 1690000000100 {
		t.Fatalf("hello = %+v", h)
	}
	if h := byText["ahoy"]; h.ActionID != pirate.ID || h.UpdatedAt != 1690000000300 {
		t.Fatalf("ahoy = %+v", h)
	}

	// The same export again changes nothing, and so does reopening.
	if ok, err := s.ImportTauri(export); ok || err != nil {
		t.Fatalf("second import: %v %v", ok, err)
	}
	s2, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if ok, _ := s2.ImportTauri(export); ok {
		t.Fatal("imported again after reopening")
	}
	if len(s2.History(HistoryQuery{})) != 2 || len(s2.Actions()) != len(BuiltinActions)+1 {
		t.Fatal("reopened store lost the import")
	}
}
