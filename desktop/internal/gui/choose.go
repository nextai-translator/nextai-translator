package gui

import "github.com/egoist/mygo/ui"

// choices shows values by their labels in ui.Select, which writes the label
// chosen into a string that must outlive the frame: one per key.
type choices map[string]*choice

type choice struct {
	label  string // what the select shows and writes
	synced string // the value label was last taken from
	init   bool
}

// choose shows a select of labels for *value, one of values, and reports a
// new choice, which it has written to *value.
func (ch choices) choose(c *ui.Context, key string, value *string, values, labels []string) bool {
	st, ok := ch[key]
	if !ok {
		st = &choice{}
		ch[key] = st
	}
	labelOf := func(v string) string {
		for i := range values {
			if values[i] == v {
				return labels[i]
			}
		}
		if len(labels) > 0 {
			return labels[0]
		}
		return ""
	}
	// Changed elsewhere, as by a swap: show the new value.
	if !st.init || st.synced != *value {
		st.label, st.synced, st.init = labelOf(*value), *value, true
	}
	if !ui.Select(c.Key(key), &st.label, labels).Changed() {
		return false
	}
	for i, l := range labels {
		if l == st.label {
			st.synced = values[i]
			if values[i] != *value {
				*value = values[i]
				return true
			}
		}
	}
	return false
}
