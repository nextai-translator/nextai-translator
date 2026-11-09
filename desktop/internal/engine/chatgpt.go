package engine

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha3"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	mrand "math/rand/v2"
	"net/http"
	"strings"
	"time"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

// chatgpt is ChatGPT (Web) (src/common/engines/chatgpt.ts). The extension
// borrows the browser's session; the desktop app takes the session's access
// token from the settings.
type chatgpt struct {
	client *http.Client
	base   string
	token  string
	model  string
}

// ErrChatGPTToken explains where the token comes from.
var ErrChatGPTToken = errors.New("ChatGPT: paste the accessToken from https://chatgpt.com/api/auth/session into the settings")

func newChatGPT(s settings.Settings, client *http.Client) *chatgpt {
	return &chatgpt{client: client, base: "https://chatgpt.com/backend-api", token: s.ChatGPTAccessToken, model: s.ChatGPTModel}
}

func (e *chatgpt) Provider() string          { return ChatGPT }
func (e *chatgpt) Model() string             { return e.model }
func (e *chatgpt) IsLocal() bool             { return false }
func (e *chatgpt) SupportsCustomModel() bool { return false }

func (e *chatgpt) header(token string) http.Header {
	h := bearer(token)
	h.Set("User-Agent", browserUA)
	return h
}

func (e *chatgpt) ListModels(ctx context.Context, token string) ([]Model, error) {
	if token == "" {
		token = e.token
	}
	if token == "" {
		return nil, ErrChatGPTToken
	}
	var out struct {
		Models []struct {
			Slug        string   `json:"slug"`
			Title       string   `json:"title"`
			Description string   `json:"description"`
			Tags        []string `json:"tags"`
		} `json:"models"`
	}
	if err := getJSON(ctx, e.client, e.base+"/models", e.header(token), &out); err != nil {
		return nil, err
	}
	models := make([]Model, 0, len(out.Models))
	for _, m := range out.Models {
		name := m.Title
		if len(m.Tags) > 0 {
			name += " (" + strings.Join(m.Tags, ", ") + ")"
		}
		models = append(models, Model{ID: m.Slug, Name: name, Description: m.Description})
	}
	return models, nil
}

func (e *chatgpt) Send(ctx context.Context, req Request, onText func(string)) (string, error) {
	if e.token == "" {
		return "", ErrChatGPTToken
	}
	model := req.ModelOverride
	if model == "" {
		model = e.model
	}
	h := e.header(e.token)
	resp, err := postJSON(ctx, e.client, e.base+"/sentinel/chat-requirements", h, map[string]any{"conversation_mode_kind": "primary_assistant"})
	if err != nil {
		return "", chatgptErr(err)
	}
	var reqs struct {
		Token       string `json:"token"`
		ProofOfWork struct {
			Required   bool   `json:"required"`
			Seed       string `json:"seed"`
			Difficulty string `json:"difficulty"`
		} `json:"proofofwork"`
		Arkose struct {
			Required bool `json:"required"`
		} `json:"arkose"`
	}
	if err := decode(resp, &reqs); err != nil {
		return "", chatgptErr(err)
	}
	if reqs.Arkose.Required {
		return "", errors.New("ChatGPT: this account is asked for a captcha, which only the browser extension can solve")
	}
	h.Set("Openai-Sentinel-Chat-Requirements-Token", reqs.Token)
	if reqs.ProofOfWork.Required {
		h.Set("Openai-Sentinel-Proof-Token", proofToken(reqs.ProofOfWork.Seed, reqs.ProofOfWork.Difficulty, browserUA, time.Now()))
	}
	h.Set("Accept", "text/event-stream")
	resp, err = postJSON(ctx, e.client, e.base+"/conversation", h, map[string]any{
		"action": "next",
		"messages": []any{map[string]any{
			"id":      uuid(),
			"role":    "user",
			"content": map[string]any{"content_type": "text", "parts": []string{combinedPrompt(req)}},
		}},
		"model":                         model,
		"parent_message_id":             uuid(),
		"conversation_mode":             map[string]string{"kind": "primary_assistant"},
		"history_and_training_disabled": false,
		"force_paragen":                 false,
		"force_paragen_model_slug":      "",
		"force_rate_limit":              false,
		"suggestions":                   []any{},
	})
	if err != nil {
		return "", chatgptErr(err)
	}
	defer resp.Body.Close()
	var sent string
	return "stop", readSSE(resp.Body, func(_, data string) error {
		if data == "[DONE]" {
			return errStop
		}
		var ev struct {
			IsCompletion bool            `json:"is_completion"`
			Error        json.RawMessage `json:"error"`
			Message      *struct {
				Author struct {
					Role string `json:"role"`
				} `json:"author"`
				Content struct {
					Parts []json.RawMessage `json:"parts"`
				} `json:"content"`
			} `json:"message"`
		}
		if json.Unmarshal([]byte(data), &ev) != nil {
			return nil // a delta-encoded event this port does not read
		}
		if ev.IsCompletion {
			return errStop
		}
		if ev.Message == nil {
			if len(ev.Error) > 0 && string(ev.Error) != "null" {
				return fmt.Errorf("ChatGPT Web error: %s", errorMessage(ev.Error))
			}
			return nil
		}
		if ev.Message.Author.Role != "assistant" {
			return nil
		}
		var full strings.Builder
		for _, p := range ev.Message.Content.Parts {
			var s string
			if json.Unmarshal(p, &s) == nil {
				full.WriteString(s)
			}
		}
		if d := prefixDelta(&sent, full.String()); d != "" {
			onText(d)
		}
		return nil
	})
}

func chatgptErr(err error) error {
	var api *APIError
	if errors.As(err, &api) && api.Status == http.StatusUnauthorized {
		return &APIError{Status: api.Status, Message: "ChatGPT: the access token has expired. Get a new one from https://chatgpt.com/api/auth/session"}
	}
	return prefixErr("ChatGPT Web: ", err)
}

// proofToken solves the sentinel proof of work: find the config whose
// SHA3-512 with the seed starts at or below the difficulty.
func proofToken(seed, difficulty, userAgent string, now time.Time) string {
	cores := []int{8, 12, 16, 24}
	screens := []int{3000, 4000, 6000}
	parseTime := now.Add(-8*time.Hour).UTC().Format("Mon, 02 Jan 2006 15:04:05 ") + "GMT-0500 (Eastern Time)"
	config := []any{cores[mrand.IntN(len(cores))] + screens[mrand.IntN(len(screens))], parseTime, 4294705152, 0, userAgent}
	n := len(difficulty) / 2
	for i := range 100000 {
		config[3] = i
		var buf bytes.Buffer
		enc := json.NewEncoder(&buf)
		enc.SetEscapeHTML(false)
		_ = enc.Encode(config)
		b := base64.StdEncoding.EncodeToString(bytes.TrimRight(buf.Bytes(), "\n"))
		sum := sha3.Sum512([]byte(seed + b))
		if hex.EncodeToString(sum[:])[:n] <= difficulty {
			return "gAAAAAB" + b
		}
	}
	return "gAAAAABwQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D" + base64.StdEncoding.EncodeToString([]byte(`"`+seed+`"`))
}

func uuid() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
