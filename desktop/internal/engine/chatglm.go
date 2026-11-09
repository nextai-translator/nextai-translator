package engine

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

// chatglm is ChatGLM's free web chat (src/common/engines/chatglm.ts). It
// keeps one conversation, titled after the app, with the GLM-4 assistant.
type chatglm struct {
	client  *http.Client
	base    string
	access  string
	refresh string
	// settle is how long a new conversation takes to be usable.
	settle time.Duration
}

const (
	chatglmAssistant = "65940acff94777010aa6b796"
	chatglmTitle     = "NextAI Translator"
)

func newChatGLM(s settings.Settings, client *http.Client) *chatglm {
	return &chatglm{client: client, base: "https://chatglm.cn/chatglm/backend-api", access: s.ChatGLMAccessToken, refresh: s.ChatGLMRefreshToken, settle: 2 * time.Second}
}

func (e *chatglm) Provider() string          { return ChatGLM }
func (e *chatglm) Model() string             { return "" }
func (e *chatglm) IsLocal() bool             { return false }
func (e *chatglm) SupportsCustomModel() bool { return false }

func (e *chatglm) ListModels(context.Context, string) ([]Model, error) { return nil, nil }

func (e *chatglm) header(token string) http.Header {
	h := bearer(token)
	h.Set("User-Agent", browserUA)
	h.Set("Origin", "https://chatglm.cn")
	h.Set("Referer", "https://chatglm.cn/main/alltoolsdetail")
	return h
}

func (e *chatglm) message(text, conversation string) map[string]any {
	return map[string]any{
		"assistant_id":    chatglmAssistant,
		"conversation_id": conversation,
		"messages": []any{map[string]any{
			"role":    "user",
			"content": []any{map[string]string{"type": "text", "text": text}},
		}},
		"meta_data": map[string]any{"mention_conversation_id": "", "is_test": false, "input_question_type": "xxxx", "channel": "", "draft_id": ""},
	}
}

func (e *chatglm) Send(ctx context.Context, req Request, onText func(string)) (string, error) {
	if e.access == "" && e.refresh == "" {
		return "", errors.New("ChatGLM: set the tokens in the settings")
	}
	conv, err := e.conversation(ctx, true)
	if err != nil {
		return "", err
	}
	resp, err := postJSON(ctx, e.client, e.base+"/assistant/stream", e.header(e.access), e.message(combinedPrompt(req), conv))
	if err != nil {
		return "", prefixErr("ChatGLM: ", err)
	}
	defer resp.Body.Close()
	var sent string
	return "stop", readSSE(resp.Body, func(_, data string) error {
		var ev struct {
			Status string `json:"status"`
			Parts  []struct {
				Status  string `json:"status"`
				Content []struct {
					Type string `json:"type"`
					Text string `json:"text"`
				} `json:"content"`
				Error struct {
					InterveneText string `json:"intervene_text"`
				} `json:"error"`
			} `json:"parts"`
		}
		if err := json.Unmarshal([]byte(data), &ev); err != nil {
			return err
		}
		var full strings.Builder
		for _, p := range ev.Parts {
			if p.Status == "intervene" {
				return errors.New("ChatGLM: " + p.Error.InterveneText)
			}
			for _, c := range p.Content {
				if c.Type == "" || c.Type == "text" {
					full.WriteString(c.Text)
				}
			}
		}
		if len(ev.Parts) > 0 {
			if d := prefixDelta(&sent, full.String()); d != "" {
				onText(d)
			}
		}
		if ev.Status == "finish" {
			return errStop
		}
		return nil
	})
}

// conversation finds the app's conversation, or starts it.
func (e *chatglm) conversation(ctx context.Context, mayRenew bool) (string, error) {
	q := url.Values{"assistant_id": {chatglmAssistant}, "page": {"1"}, "page_size": {"25"}}
	resp, err := do(ctx, e.client, http.MethodGet, e.base+"/assistant/conversation/list?"+q.Encode(), e.header(e.access), nil)
	if err != nil {
		return "", err
	}
	if (resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusUnprocessableEntity) && e.refresh != "" && mayRenew {
		resp.Body.Close()
		if err := e.renew(ctx); err != nil {
			return "", err
		}
		return e.conversation(ctx, false)
	}
	var list struct {
		Result struct {
			ConversationList []struct {
				ID    string `json:"id"`
				Title string `json:"title"`
			} `json:"conversation_list"`
		} `json:"result"`
	}
	if err := decode(resp, &list); err != nil {
		return "", prefixErr("ChatGLM: ", err)
	}
	for _, c := range list.Result.ConversationList {
		if c.Title == chatglmTitle {
			return c.ID, nil
		}
	}
	// The first message names the new conversation; its id comes with the
	// first event.
	cctx, cancel := context.WithCancel(ctx)
	defer cancel()
	resp, err = postJSON(cctx, e.client, e.base+"/assistant/stream", e.header(e.access), e.message(chatglmTitle, ""))
	if err != nil {
		return "", prefixErr("ChatGLM: ", err)
	}
	var id string
	_ = readSSE(resp.Body, func(_, data string) error {
		var ev struct {
			ConversationID string `json:"conversation_id"`
		}
		if json.Unmarshal([]byte(data), &ev) == nil && ev.ConversationID != "" {
			id = ev.ConversationID
			return errStop
		}
		return nil
	})
	cancel()
	resp.Body.Close()
	if id == "" {
		return "", errors.New("ChatGLM: failed to create conversation")
	}
	select {
	case <-time.After(e.settle):
	case <-ctx.Done():
		return "", ctx.Err()
	}
	return id, nil
}

func (e *chatglm) renew(ctx context.Context) error {
	resp, err := do(ctx, e.client, http.MethodPost, e.base+"/v1/user/refresh", e.header(e.refresh), map[string]any{})
	if err != nil {
		return err
	}
	var out struct {
		Message string `json:"message"`
		Result  struct {
			AccessToken string `json:"accessToken"`
		} `json:"result"`
	}
	if err := decode(resp, &out); err != nil {
		return prefixErr("Failed to refresh ChatGLM access token: ", err)
	}
	if out.Message != "success" {
		return errors.New("Failed to refresh ChatGLM access token: " + out.Message)
	}
	e.access = out.Result.AccessToken
	SaveTokens(func(s *settings.Settings) { s.ChatGLMAccessToken = out.Result.AccessToken })
	return nil
}
