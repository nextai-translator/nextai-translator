package engine

import (
	"context"
	"encoding/json"
	"errors"
	"math/rand/v2"
	"net/http"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

// kimi is Kimi's free web chat (src/common/engines/kimi.ts), signed in with
// the tokens from the site's local storage.
type kimi struct {
	client  *http.Client
	base    string
	access  string
	refresh string
}

func newKimi(s settings.Settings, client *http.Client) *kimi {
	return &kimi{client: client, base: "https://kimi.moonshot.cn", access: s.KimiAccessToken, refresh: s.KimiRefreshToken}
}

func (e *kimi) Provider() string          { return Kimi }
func (e *kimi) Model() string             { return "" }
func (e *kimi) IsLocal() bool             { return false }
func (e *kimi) SupportsCustomModel() bool { return false }

func (e *kimi) ListModels(context.Context, string) ([]Model, error) { return nil, nil }

func (e *kimi) header(token string) http.Header {
	const digits = "0123456789abcdefghijklmnopqrstuvwxyz"
	traffic := make([]byte, 20)
	for i := range traffic {
		traffic[i] = digits[rand.IntN(len(digits))]
	}
	h := bearer(token)
	h.Set("User-Agent", browserUA)
	h.Set("Origin", "https://kimi.moonshot.cn")
	h.Set("Referer", "https://kimi.moonshot.cn/")
	h.Set("X-Traffic-Id", string(traffic))
	return h
}

func (e *kimi) Send(ctx context.Context, req Request, onText func(string)) (string, error) {
	if e.access == "" && e.refresh == "" {
		return "", errors.New("Kimi: set the access and refresh tokens in the settings")
	}
	newChat := map[string]any{"name": "Kimi", "is_example": false}
	resp, err := do(ctx, e.client, http.MethodPost, e.base+"/api/chat", e.header(e.access), newChat)
	if err != nil {
		return "", err
	}
	if resp.StatusCode == http.StatusUnauthorized && e.refresh != "" {
		resp.Body.Close()
		if err := e.renew(ctx); err != nil {
			return "", err
		}
		if resp, err = do(ctx, e.client, http.MethodPost, e.base+"/api/chat", e.header(e.access), newChat); err != nil {
			return "", err
		}
	}
	var chat struct {
		ID string `json:"id"`
	}
	if err := decode(resp, &chat); err != nil {
		return "", prefixErr("Kimi: ", err)
	}
	resp, err = postJSON(ctx, e.client, e.base+"/api/chat/"+chat.ID+"/completion/stream", e.header(e.access), map[string]any{
		"messages":    []any{map[string]string{"role": "user", "content": combinedPrompt(req)}},
		"refs":        []any{},
		"user_search": true,
	})
	if err != nil {
		return "", prefixErr("Kimi: ", err)
	}
	defer resp.Body.Close()
	return "stop", readSSE(resp.Body, func(_, data string) error {
		var ev struct {
			Event string `json:"event"`
			Text  string `json:"text"`
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.Unmarshal([]byte(data), &ev); err != nil {
			return err
		}
		switch ev.Event {
		case "cmpl":
			onText(ev.Text)
		case "all_done":
			return errStop
		case "error":
			return errors.New("Kimi: " + ev.Error.Message)
		}
		return nil
	})
}

// renew trades the refresh token for new tokens and saves them.
func (e *kimi) renew(ctx context.Context) error {
	resp, err := do(ctx, e.client, http.MethodGet, e.base+"/api/auth/token/refresh", e.header(e.refresh), nil)
	if err != nil {
		return err
	}
	var out struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	}
	if err := decode(resp, &out); err != nil {
		return prefixErr("Kimi: ", err)
	}
	e.access, e.refresh = out.AccessToken, out.RefreshToken
	SaveTokens(func(s *settings.Settings) { s.KimiAccessToken, s.KimiRefreshToken = out.AccessToken, out.RefreshToken })
	return nil
}

func prefixErr(prefix string, err error) error {
	var api *APIError
	if errors.As(err, &api) {
		return &APIError{Status: api.Status, Message: prefix + api.Error()}
	}
	return err
}
