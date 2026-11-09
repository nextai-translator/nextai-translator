package store

import (
	"path/filepath"
	"testing"
	"time"
)

func open(t *testing.T) (*Store, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "data.json")
	s, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	return s, path
}

func TestSeedAndPersist(t *testing.T) {
	s, path := open(t)
	acts := s.Actions()
	if len(acts) != len(BuiltinActions) {
		t.Fatalf("got %d actions", len(acts))
	}
	for i, a := range acts {
		if a.Idx != i || a.Mode != BuiltinActions[i].Mode || a.ID == 0 {
			t.Fatalf("action %d = %+v", i, a)
		}
	}
	c, err := s.CreateAction(Action{Name: "Mine", RolePrompt: "r ${text}"})
	if err != nil {
		t.Fatal(err)
	}
	s2, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	got, ok := s2.Action(c.ID)
	if !ok || got.RolePrompt != "r ${text}" || got.Idx != len(BuiltinActions) {
		t.Fatalf("reopened %+v %v", got, ok)
	}
}

func TestMoveAndDelete(t *testing.T) {
	s, _ := open(t)
	c, _ := s.CreateAction(Action{Name: "Mine"})
	if err := s.MoveAction(c.ID, 0); err != nil {
		t.Fatal(err)
	}
	acts := s.Actions()
	if acts[0].ID != c.ID || acts[1].Mode != ModeTranslate || acts[1].Idx != 1 {
		t.Fatalf("after move %+v", acts[:2])
	}
	tr, _ := s.ActionByMode(ModeTranslate)
	_ = s.DeleteAction(tr.ID)
	if _, ok := s.Action(tr.ID); !ok {
		t.Fatal("built-in action deleted")
	}
	_ = s.DeleteAction(c.ID)
	if _, ok := s.Action(c.ID); ok {
		t.Fatal("custom action kept")
	}
	for i, a := range s.Actions() {
		if a.Idx != i {
			t.Fatalf("idx gap at %d", i)
		}
	}
}

func TestHistory(t *testing.T) {
	s, _ := open(t)
	clock := int64(1000)
	s.now = func() time.Time { clock++; return time.UnixMilli(clock) }
	a, _ := s.RecordHistory(HistoryItem{Text: "hello", TranslatedText: "你好", SourceLang: "en", TargetLang: "zh-Hans", ActionMode: ModeTranslate})
	_, _ = s.RecordHistory(HistoryItem{Text: "world", TranslatedText: "世界", SourceLang: "en", TargetLang: "zh-Hans", ActionMode: ModeTranslate})
	_ = s.SetFavorite(a.ID, true)
	again, _ := s.RecordHistory(HistoryItem{Text: "hello", TranslatedText: "您好", SourceLang: "en", TargetLang: "zh-Hans", ActionMode: ModeTranslate})
	if again.ID != a.ID || !again.Favorite {
		t.Fatalf("dedup lost id or star: %+v", again)
	}
	all := s.History(HistoryQuery{})
	if len(all) != 2 || all[0].Text != "hello" || all[0].TranslatedText != "您好" {
		t.Fatalf("list %+v", all)
	}
	if got := s.History(HistoryQuery{Search: "世界"}); len(got) != 1 || got[0].Text != "world" {
		t.Fatalf("search %+v", got)
	}
	if got := s.History(HistoryQuery{FavoritesOnly: true}); len(got) != 1 {
		t.Fatalf("favorites %+v", got)
	}
	_ = s.ClearHistory()
	if len(s.History(HistoryQuery{})) != 0 {
		t.Fatal("not cleared")
	}
}
