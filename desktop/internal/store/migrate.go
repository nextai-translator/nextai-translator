package store

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"slices"
	"sort"
	"strconv"
	"strings"
)

// TauriExportFile is what the last Tauri release writes next to config.json:
// its IndexedDB actions and history (src/tauri/export-local-db.ts).
const TauriExportFile = "tauri-export.json"

type tauriExport struct {
	ExportedAt int64         `json:"exportedAt"`
	Actions    []tauriAction `json:"actions"`
	History    []tauriItem   `json:"history"`
}

// looseString takes a JSON string or number; Dexie rows were written by
// several app versions and not all agree on the timestamp type.
type looseString string

func (l *looseString) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err == nil {
		*l = looseString(s)
		return nil
	}
	var n json.Number
	if err := json.Unmarshal(b, &n); err != nil {
		*l = ""
		return nil
	}
	*l = looseString(n.String())
	return nil
}

// looseInt takes a JSON number or a numeric string.
type looseInt int64

func (l *looseInt) UnmarshalJSON(b []byte) error {
	var f float64
	if err := json.Unmarshal(b, &f); err == nil {
		*l = looseInt(f)
		return nil
	}
	var s string
	if err := json.Unmarshal(b, &s); err == nil {
		n, _ := strconv.ParseInt(strings.TrimSpace(s), 10, 64)
		*l = looseInt(n)
	}
	return nil
}

type tauriAction struct {
	ID                    looseInt    `json:"id"`
	Idx                   looseInt    `json:"idx"`
	Mode                  string      `json:"mode"`
	Name                  string      `json:"name"`
	Icon                  string      `json:"icon"`
	RolePrompt            string      `json:"rolePrompt"`
	CommandPrompt         string      `json:"commandPrompt"`
	OutputRenderingFormat string      `json:"outputRenderingFormat"`
	Provider              string      `json:"provider"`
	APIModel              string      `json:"apiModel"`
	Thinking              *bool       `json:"thinking"`
	ThinkingLevel         string      `json:"thinkingLevel"`
	CreatedAt             looseString `json:"createdAt"`
	UpdatedAt             looseString `json:"updatedAt"`
}

type tauriItem struct {
	Text           string   `json:"text"`
	TranslatedText string   `json:"translatedText"`
	SourceLang     string   `json:"sourceLang"`
	TargetLang     string   `json:"targetLang"`
	ActionID       looseInt `json:"actionId"`
	ActionName     string   `json:"actionName"`
	ActionMode     string   `json:"actionMode"`
	Provider       string   `json:"provider"`
	EngineModel    string   `json:"engineModel"`
	Favorite       bool     `json:"favorite"`
	WordMode       bool     `json:"wordMode"`
	TokenCount     looseInt `json:"tokenCount"`
	CreatedAt      looseInt `json:"createdAt"`
	UpdatedAt      looseInt `json:"updatedAt"`
}

// ImportTauri merges the Tauri app's export at path into the store, once per
// export: built-in actions keep their IDs and take the old provider and
// model, custom actions and history entries are added unless already here.
// It reports whether anything was imported; a missing file is not an error.
func (s *Store) ImportTauri(path string) (bool, error) {
	raw, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	var ex tauriExport
	if err := json.Unmarshal(raw, &ex); err != nil {
		return false, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if ex.ExportedAt != 0 && ex.ExportedAt <= s.d.TauriImport {
		return false, nil
	}

	sort.SliceStable(ex.Actions, func(i, j int) bool { return ex.Actions[i].Idx < ex.Actions[j].Idx })
	ids := map[int64]int64{} // Tauri action ID → ours
	for _, t := range ex.Actions {
		if t.Mode != "" {
			for i, a := range s.d.Actions {
				if a.Mode == t.Mode {
					ids[int64(t.ID)] = a.ID
					if t.Provider != "" {
						s.d.Actions[i].Provider, s.d.Actions[i].APIModel = t.Provider, t.APIModel
						s.d.Actions[i].Thinking, s.d.Actions[i].ThinkingLevel = t.Thinking, t.ThinkingLevel
					}
				}
			}
			continue
		}
		if strings.TrimSpace(t.Name) == "" {
			continue
		}
		if i := slices.IndexFunc(s.d.Actions, func(a Action) bool {
			return a.Mode == "" && a.Name == t.Name && a.RolePrompt == t.RolePrompt && a.CommandPrompt == t.CommandPrompt
		}); i >= 0 {
			ids[int64(t.ID)] = s.d.Actions[i].ID
			continue
		}
		a := Action{
			ID: s.id(), Idx: len(s.d.Actions), Name: t.Name, Icon: t.Icon,
			RolePrompt: t.RolePrompt, CommandPrompt: t.CommandPrompt, OutputRenderingFormat: t.OutputRenderingFormat,
			Provider: t.Provider, APIModel: t.APIModel, Thinking: t.Thinking, ThinkingLevel: t.ThinkingLevel,
			CreatedAt: string(t.CreatedAt), UpdatedAt: string(t.UpdatedAt),
		}
		if a.CreatedAt == "" {
			a.CreatedAt = s.stamp()
		}
		if a.UpdatedAt == "" {
			a.UpdatedAt = a.CreatedAt
		}
		ids[int64(t.ID)] = a.ID
		s.d.Actions = append(s.d.Actions, a)
	}

	type key struct {
		text, translated string
		created          int64
	}
	seen := map[key]bool{}
	for _, h := range s.d.History {
		seen[key{h.Text, h.TranslatedText, h.CreatedAt}] = true
	}
	for _, t := range ex.History {
		k := key{t.Text, t.TranslatedText, int64(t.CreatedAt)}
		if strings.TrimSpace(t.Text) == "" || seen[k] {
			continue
		}
		seen[k] = true
		h := HistoryItem{
			ID: s.id(), Text: t.Text, TranslatedText: t.TranslatedText, SourceLang: t.SourceLang, TargetLang: t.TargetLang,
			ActionName: t.ActionName, ActionMode: t.ActionMode, Provider: t.Provider, EngineModel: t.EngineModel,
			Favorite: t.Favorite, WordMode: t.WordMode, TokenCount: int(t.TokenCount),
			CreatedAt: int64(t.CreatedAt), UpdatedAt: int64(t.UpdatedAt),
		}
		if t.ActionID != 0 {
			h.ActionID = ids[int64(t.ActionID)]
		}
		if h.UpdatedAt == 0 {
			h.UpdatedAt = h.CreatedAt
		}
		s.d.History = append(s.d.History, h)
	}
	sort.SliceStable(s.d.History, func(i, j int) bool { return s.d.History[i].UpdatedAt < s.d.History[j].UpdatedAt })
	s.trim()
	s.d.TauriImport = max(ex.ExportedAt, 1)
	return true, s.commit()
}
