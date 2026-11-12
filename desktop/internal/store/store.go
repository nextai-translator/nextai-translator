// Package store keeps the user's actions and translation history. The Tauri
// app kept them in the webview's IndexedDB; here each is a JSON file next to
// config.json, written atomically on every change.
package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Modes of the built-in actions. "big-bang" is not an action.
const (
	ModeTranslate   = "translate"
	ModePolishing   = "polishing"
	ModeSummarize   = "summarize"
	ModeAnalyze     = "analyze"
	ModeExplainCode = "explain-code"
)

// Action mirrors Action in src/common/internal-services/db.ts.
type Action struct {
	ID                    int64  `json:"id"`
	Idx                   int    `json:"idx"`
	Mode                  string `json:"mode,omitempty"`
	Name                  string `json:"name"`
	Icon                  string `json:"icon,omitempty"`
	RolePrompt            string `json:"rolePrompt,omitempty"`
	CommandPrompt         string `json:"commandPrompt,omitempty"`
	OutputRenderingFormat string `json:"outputRenderingFormat,omitempty"` // text, markdown, latex
	Provider              string `json:"provider,omitempty"`
	APIModel              string `json:"apiModel,omitempty"`
	Thinking              *bool  `json:"thinking,omitempty"`
	ThinkingLevel         string `json:"thinkingLevel,omitempty"`
	CreatedAt             string `json:"createdAt"`
	UpdatedAt             string `json:"updatedAt"`
}

// Builtin reports whether the action is one of the built-in modes, which
// cannot be deleted.
func (a Action) Builtin() bool { return a.Mode != "" }

// BuiltinActions are seeded in this order when missing.
var BuiltinActions = []Action{
	{Name: "Translate", Mode: ModeTranslate, Icon: "MdOutlineGTranslate"},
	{Name: "Polishing", Mode: ModePolishing, Icon: "MdPalette"},
	{Name: "Summarize", Mode: ModeSummarize, Icon: "MdOutlineSummarize"},
	{Name: "Analyze", Mode: ModeAnalyze, Icon: "MdOutlineAnalytics"},
	{Name: "Explain Code", Mode: ModeExplainCode, Icon: "MdCode"},
}

// HistoryItem mirrors HistoryItem in db.ts.
type HistoryItem struct {
	ID             int64  `json:"id"`
	Text           string `json:"text"`
	TranslatedText string `json:"translatedText"`
	SourceLang     string `json:"sourceLang"`
	TargetLang     string `json:"targetLang"`
	ActionID       int64  `json:"actionId,omitempty"`
	ActionName     string `json:"actionName,omitempty"`
	ActionMode     string `json:"actionMode,omitempty"`
	Provider       string `json:"provider,omitempty"`
	EngineModel    string `json:"engineModel,omitempty"`
	Favorite       bool   `json:"favorite"`
	WordMode       bool   `json:"wordMode,omitempty"`
	TokenCount     int    `json:"tokenCount,omitempty"`
	CreatedAt      int64  `json:"createdAt"`
	UpdatedAt      int64  `json:"updatedAt"`
}

// HistoryQuery filters History.List. Zero fields do not filter.
type HistoryQuery struct {
	Search        string
	ActionID      int64
	ActionMode    string
	SourceLang    string
	TargetLang    string
	FavoritesOnly bool
	Limit         int
}

// MaxHistory bounds the history file; the oldest non-favourites go first.
const MaxHistory = 5000

type data struct {
	NextID int64 `json:"nextId"`
	// TauriImport is the exportedAt of the last Tauri export merged in.
	TauriImport int64         `json:"tauriImport,omitempty"`
	Actions     []Action      `json:"actions"`
	History     []HistoryItem `json:"history"`
}

// Store is safe for concurrent use.
type Store struct {
	mu       sync.Mutex
	path     string
	d        data
	now      func() time.Time
	onChange []func()
}

// Open reads the store at path, creating it when missing, and seeds the
// built-in actions. A file that does not parse is moved aside.
func Open(path string) (*Store, error) {
	s := &Store{path: path, now: time.Now}
	raw, err := os.ReadFile(path)
	switch {
	case errors.Is(err, fs.ErrNotExist):
	case err != nil:
		return nil, err
	default:
		if err := json.Unmarshal(raw, &s.d); err != nil {
			_ = os.Rename(path, path+".corrupted")
			s.d = data{}
		}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.seed() {
		if err := s.save(); err != nil {
			return nil, err
		}
	}
	return s, nil
}

// OnChange registers fn to run after every change.
func (s *Store) OnChange(fn func()) {
	s.mu.Lock()
	s.onChange = append(s.onChange, fn)
	s.mu.Unlock()
}

func (s *Store) stamp() string { return strconv.FormatInt(s.now().UnixMilli(), 10) }

func (s *Store) id() int64 {
	if s.d.NextID == 0 {
		for _, a := range s.d.Actions {
			s.d.NextID = max(s.d.NextID, a.ID)
		}
		for _, h := range s.d.History {
			s.d.NextID = max(s.d.NextID, h.ID)
		}
	}
	s.d.NextID++
	return s.d.NextID
}

// seed adds missing built-in actions and makes idx dense; it reports
// whether anything changed.
func (s *Store) seed() bool {
	changed := false
	for _, b := range BuiltinActions {
		if slices.ContainsFunc(s.d.Actions, func(a Action) bool { return a.Mode == b.Mode }) {
			continue
		}
		a := b
		a.ID = s.id()
		a.Idx = len(s.d.Actions)
		a.CreatedAt, a.UpdatedAt = s.stamp(), s.stamp()
		s.d.Actions = append(s.d.Actions, a)
		changed = true
	}
	sort.SliceStable(s.d.Actions, func(i, j int) bool { return s.d.Actions[i].Idx < s.d.Actions[j].Idx })
	for i := range s.d.Actions {
		if s.d.Actions[i].Idx != i {
			s.d.Actions[i].Idx = i
			changed = true
		}
	}
	return changed
}

func (s *Store) save() error {
	b, err := json.Marshal(s.d)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(s.path), ".store-*")
	if err != nil {
		return err
	}
	if _, err := tmp.Write(b); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	if err := os.Rename(tmp.Name(), s.path); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	return nil
}

// commit saves and then runs the change listeners outside the lock.
func (s *Store) commit() error {
	err := s.save()
	fns := slices.Clone(s.onChange)
	s.mu.Unlock()
	for _, fn := range fns {
		fn()
	}
	s.mu.Lock()
	return err
}

// Actions returns the actions in display order.
func (s *Store) Actions() []Action {
	s.mu.Lock()
	defer s.mu.Unlock()
	return slices.Clone(s.d.Actions)
}

// Action returns the action with the id.
func (s *Store) Action(id int64) (Action, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	i := s.actionIndex(id)
	if i < 0 {
		return Action{}, false
	}
	return s.d.Actions[i], true
}

// ActionByMode returns the built-in action of the mode.
func (s *Store) ActionByMode(mode string) (Action, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, a := range s.d.Actions {
		if a.Mode == mode {
			return a, true
		}
	}
	return Action{}, false
}

func (s *Store) actionIndex(id int64) int {
	return slices.IndexFunc(s.d.Actions, func(a Action) bool { return a.ID == id })
}

// CreateAction appends a new action. ID, Idx and the timestamps are set here.
func (s *Store) CreateAction(a Action) (Action, error) {
	if strings.TrimSpace(a.Name) == "" {
		return Action{}, errors.New("name is required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	a.ID = s.id()
	a.Idx = len(s.d.Actions)
	a.CreatedAt, a.UpdatedAt = s.stamp(), s.stamp()
	s.d.Actions = append(s.d.Actions, a)
	return a, s.commit()
}

// UpdateAction replaces the fields of the action with a.ID; Idx, Mode and
// CreatedAt are kept (use MoveAction to reorder).
func (s *Store) UpdateAction(a Action) (Action, error) {
	if strings.TrimSpace(a.Name) == "" {
		return Action{}, errors.New("name is required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	i := s.actionIndex(a.ID)
	if i < 0 {
		return Action{}, fmt.Errorf("action %d not found", a.ID)
	}
	old := s.d.Actions[i]
	a.Idx, a.Mode, a.CreatedAt = old.Idx, old.Mode, old.CreatedAt
	a.UpdatedAt = s.stamp()
	s.d.Actions[i] = a
	return a, s.commit()
}

// MoveAction moves the action to position to.
func (s *Store) MoveAction(id int64, to int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	i := s.actionIndex(id)
	if i < 0 {
		return fmt.Errorf("action %d not found", id)
	}
	to = max(0, min(to, len(s.d.Actions)-1))
	if i == to {
		return nil
	}
	a := s.d.Actions[i]
	s.d.Actions = slices.Delete(s.d.Actions, i, i+1)
	s.d.Actions = slices.Insert(s.d.Actions, to, a)
	for k := range s.d.Actions {
		s.d.Actions[k].Idx = k
	}
	return s.commit()
}

// DeleteAction removes a custom action; built-in actions stay.
func (s *Store) DeleteAction(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	i := s.actionIndex(id)
	if i < 0 || s.d.Actions[i].Builtin() {
		return nil
	}
	s.d.Actions = slices.Delete(s.d.Actions, i, i+1)
	for k := range s.d.Actions {
		s.d.Actions[k].Idx = k
	}
	return s.commit()
}

// ImportActions imports actions (from an export file): custom actions are
// added, built-ins keep theirs.
func (s *Store) ImportActions(in []Action) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, a := range in {
		if a.Mode != "" || strings.TrimSpace(a.Name) == "" {
			continue
		}
		a.ID = s.id()
		a.Idx = len(s.d.Actions)
		if a.CreatedAt == "" {
			a.CreatedAt = s.stamp()
		}
		a.UpdatedAt = s.stamp()
		s.d.Actions = append(s.d.Actions, a)
	}
	return s.commit()
}

// RecordHistory saves a finished translation. The same text translated the
// same way again replaces the earlier entry instead of adding one.
func (s *Store) RecordHistory(h HistoryItem) (HistoryItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now().UnixMilli()
	for i, old := range s.d.History {
		if old.Text == h.Text && old.SourceLang == h.SourceLang && old.TargetLang == h.TargetLang &&
			old.ActionID == h.ActionID && old.ActionMode == h.ActionMode {
			h.ID, h.CreatedAt, h.Favorite = old.ID, old.CreatedAt, old.Favorite || h.Favorite
			h.UpdatedAt = now
			s.d.History = slices.Delete(s.d.History, i, i+1)
			s.d.History = append(s.d.History, h)
			return h, s.commit()
		}
	}
	h.ID = s.id()
	h.CreatedAt, h.UpdatedAt = now, now
	s.d.History = append(s.d.History, h)
	s.trim()
	return h, s.commit()
}

func (s *Store) trim() {
	for len(s.d.History) > MaxHistory {
		i := slices.IndexFunc(s.d.History, func(h HistoryItem) bool { return !h.Favorite })
		if i < 0 {
			return
		}
		s.d.History = slices.Delete(s.d.History, i, i+1)
	}
}

func (s *Store) historyIndex(id int64) int {
	return slices.IndexFunc(s.d.History, func(h HistoryItem) bool { return h.ID == id })
}

// SetFavorite stars or unstars a history item.
func (s *Store) SetFavorite(id int64, fav bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	i := s.historyIndex(id)
	if i < 0 {
		return nil
	}
	s.d.History[i].Favorite = fav
	return s.commit()
}

// DeleteHistory removes one history item.
func (s *Store) DeleteHistory(id int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	i := s.historyIndex(id)
	if i < 0 {
		return nil
	}
	s.d.History = slices.Delete(s.d.History, i, i+1)
	return s.commit()
}

// ClearHistory removes every history item.
func (s *Store) ClearHistory() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.d.History = nil
	return s.commit()
}

// History lists history items, most recently used first.
func (s *Store) History(q HistoryQuery) []HistoryItem {
	s.mu.Lock()
	defer s.mu.Unlock()
	search := strings.ToLower(strings.TrimSpace(q.Search))
	var out []HistoryItem
	for i := len(s.d.History) - 1; i >= 0; i-- {
		h := s.d.History[i]
		switch {
		case q.FavoritesOnly && !h.Favorite,
			q.ActionID != 0 && h.ActionID != q.ActionID,
			q.ActionID == 0 && q.ActionMode != "" && h.ActionMode != q.ActionMode,
			q.SourceLang != "" && h.SourceLang != q.SourceLang,
			q.TargetLang != "" && h.TargetLang != q.TargetLang:
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(h.Text), search) &&
			!strings.Contains(strings.ToLower(h.TranslatedText), search) &&
			!strings.Contains(strings.ToLower(h.ActionName), search) {
			continue
		}
		out = append(out, h)
		if q.Limit > 0 && len(out) == q.Limit {
			break
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].UpdatedAt > out[j].UpdatedAt })
	return out
}
