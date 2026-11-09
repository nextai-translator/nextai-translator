package engine

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

type cohere struct {
	client *http.Client
	key    string
	model  string
}

func newCohere(s settings.Settings, client *http.Client) *cohere {
	return &cohere{client: client, key: s.CohereAPIKey, model: s.CohereAPIModel}
}

func (e *cohere) Provider() string          { return Cohere }
func (e *cohere) Model() string             { return e.model }
func (e *cohere) IsLocal() bool             { return false }
func (e *cohere) SupportsCustomModel() bool { return false }

func (e *cohere) ListModels(ctx context.Context, apiKey string) ([]Model, error) {
	if apiKey == "" {
		return nil, nil
	}
	var out struct {
		Models []struct {
			Name      string   `json:"name"`
			Endpoints []string `json:"endpoints"`
		} `json:"models"`
	}
	if err := getJSON(ctx, e.client, "https://api.cohere.ai/v1/models", bearer(apiKey), &out); err != nil {
		return nil, err
	}
	var models []Model
	for _, m := range out.Models {
		if containsStr(m.Endpoints, "chat") {
			models = append(models, Model{ID: m.Name, Name: m.Name})
		}
	}
	return models, nil
}

func (e *cohere) Send(ctx context.Context, req Request, onText func(string)) (string, error) {
	model := req.ModelOverride
	if model == "" {
		model = e.model
	}
	h := bearer(e.key)
	h.Set("Accept", "application/json")
	resp, err := postJSON(ctx, e.client, "https://api.cohere.ai/v1/chat", h, map[string]any{
		"stream":       true,
		"model":        model,
		"chat_history": []any{},
		"message":      combinedPrompt(req),
	})
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	err = readJSONStream(resp.Body, func(raw json.RawMessage) error {
		var ev struct {
			EventType  string `json:"event_type"`
			Text       string `json:"text"`
			IsFinished bool   `json:"is_finished"`
		}
		if err := json.Unmarshal(raw, &ev); err != nil {
			return err
		}
		if ev.IsFinished {
			return errStop
		}
		if ev.EventType == "text-generation" {
			onText(ev.Text)
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	return "stop", nil
}
