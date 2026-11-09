package engine

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

type claude struct {
	client *http.Client
	url    string
	key    string
	model  string
}

func newClaude(s settings.Settings, client *http.Client) *claude {
	return &claude{
		client: client,
		url:    joinURL(s.ClaudeAPIURL, s.ClaudeAPIURLPath),
		key:    s.ClaudeAPIKey,
		model:  customOr(s.ClaudeAPIModel, s.ClaudeCustomModelName),
	}
}

func (e *claude) Provider() string          { return Claude }
func (e *claude) Model() string             { return e.model }
func (e *claude) IsLocal() bool             { return false }
func (e *claude) SupportsCustomModel() bool { return true }

func (e *claude) ListModels(context.Context, string) ([]Model, error) {
	return []Model{
		{ID: "claude-opus-5-5", Name: "Claude Opus 5.5"},
		{ID: "claude-sonnet-5-5", Name: "Claude Sonnet 5.5"},
		{ID: "claude-haiku-5-5", Name: "Claude Haiku 5.5"},
		{ID: "claude-opus-4-6", Name: "Claude Opus 4.6"},
		{ID: "claude-sonnet-4-6", Name: "Claude Sonnet 4.6"},
		{ID: "claude-haiku-4-5-20251001", Name: "Claude Haiku 4.5"},
		{ID: "claude-sonnet-4-20250514", Name: "Claude Sonnet 4"},
		{ID: "claude-3-7-sonnet-20250219", Name: "Claude 3.7 Sonnet"},
		{ID: "claude-3-5-sonnet-20241022", Name: "Claude 3.5 Sonnet"},
		{ID: "claude-3-5-haiku-20241022", Name: "Claude 3.5 Haiku"},
	}, nil
}

var reClaudeFamily = regexp.MustCompile(`(?i)claude-(?:opus|sonnet|haiku|fable|mythos)-`)

// claudeVersion reads major.minor from ids such as claude-opus-4-7,
// claude-haiku-4-5-20251001 and anthropic/claude-sonnet-4.5. Each part is one
// digit; a longer run of digits is a date (claude-opus-4-20250514 is 4.0).
func claudeVersion(model string) (major, minor int, ok bool) {
	for _, loc := range reClaudeFamily.FindAllStringIndex(model, -1) {
		rest := model[loc[1]:]
		if len(rest) == 0 || !isDigit(rest[0]) || (len(rest) > 1 && isDigit(rest[1])) {
			continue
		}
		major = int(rest[0] - '0')
		rest = rest[1:]
		if len(rest) >= 2 && (rest[0] == '-' || rest[0] == '.') && isDigit(rest[1]) && (len(rest) == 2 || !isDigit(rest[2])) {
			minor = int(rest[1] - '0')
		}
		return major, minor, true
	}
	return 0, 0, false
}

func isDigit(b byte) bool { return b >= '0' && b <= '9' }

// AdaptiveThinkingOnly reports whether the model refuses temperature and
// thinking budgets (Claude 4.7 and later) and takes adaptive thinking.
func AdaptiveThinkingOnly(model string) bool {
	major, minor, ok := claudeVersion(model)
	return ok && (major > 4 || (major == 4 && minor >= 7))
}

// EffortForBudget maps the thinking budgets of the levels (5000, 10000,
// 20000) to an effort.
func EffortForBudget(budget int) string {
	switch {
	case budget <= 5000:
		return "low"
	case budget >= 20000:
		return "high"
	}
	return "medium"
}

func claudeBody(req Request, model string) map[string]any {
	body := map[string]any{
		"model":    model,
		"stream":   true,
		"messages": []map[string]string{{"role": "user", "content": combinedPrompt(req)}},
	}
	switch {
	case AdaptiveThinkingOnly(model):
		if req.ThinkingBudget > 0 {
			body["thinking"] = map[string]any{"type": "adaptive"}
			body["output_config"] = map[string]any{"effort": EffortForBudget(req.ThinkingBudget)}
			body["max_tokens"] = 32000
		} else {
			// Some of these models refuse thinking "disabled"; a low effort
			// keeps the thinking short instead.
			body["output_config"] = map[string]any{"effort": "low"}
			body["max_tokens"] = 16000
		}
	case req.ThinkingBudget > 0:
		body["thinking"] = map[string]any{"type": "enabled", "budget_tokens": req.ThinkingBudget}
		body["max_tokens"] = max(16384, req.ThinkingBudget+4096)
	default:
		body["temperature"] = 0
		body["max_tokens"] = 4096
	}
	return body
}

func (e *claude) Send(ctx context.Context, req Request, onText func(string)) (string, error) {
	model := req.ModelOverride
	if model == "" {
		model = e.model
	}
	h := http.Header{}
	h.Set("User-Agent", edgeBrowserUserAgent)
	h.Set("anthropic-version", "2023-06-01")
	h.Set("anthropic-dangerous-direct-browser-access", "true")
	h.Set("anthropic-beta", "messages-2023-12-15")
	h.Set("x-api-key", e.key)
	resp, err := postJSON(ctx, e.client, e.url, h, claudeBody(req, model))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var apiErr error
	reason := "stop"
	err = readSSE(resp.Body, func(_, data string) error {
		var ev struct {
			Type  string `json:"type"`
			Delta struct {
				Type       string  `json:"type"`
				Text       *string `json:"text"`
				StopReason string  `json:"stop_reason"`
			} `json:"delta"`
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.Unmarshal([]byte(data), &ev); err != nil {
			return err
		}
		switch ev.Type {
		case "content_block_delta":
			// Thinking deltas and the signature that ends a thinking block
			// carry no answer text.
			if ev.Delta.Type != "thinking_delta" && ev.Delta.Text != nil {
				onText(*ev.Delta.Text)
			}
		case "message_delta":
			if ev.Delta.StopReason != "" && ev.Delta.StopReason != "end_turn" {
				reason = ev.Delta.StopReason
			}
		case "message_stop":
			return errStop
		case "error":
			apiErr = &APIError{Message: "Claude API response: " + strings.TrimSpace(ev.Error.Message)}
			return errStop
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	if apiErr != nil {
		return "error", apiErr
	}
	return reason, nil
}
