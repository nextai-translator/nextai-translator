// Package engine talks to the translation providers (src/common/engines).
// Every engine streams its answer: Send calls onText with each piece of
// text as it arrives and returns when the answer is complete.
package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"strings"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

// Request is one prompt to send.
type Request struct {
	RolePrompt    string
	CommandPrompt string
	// ModelOverride replaces the provider's configured model (an action's
	// own model).
	ModelOverride string
	// ThinkingBudget is the Claude thinking budget in tokens; 0 is off.
	ThinkingBudget int
}

// Model is one entry in a provider's model list.
type Model struct {
	ID          string
	Name        string
	Description string
}

// Engine is one provider, configured from the settings.
type Engine interface {
	Provider() string
	// Model is the model the engine uses when the request does not override it.
	Model() string
	IsLocal() bool
	SupportsCustomModel() bool
	// ListModels lists the provider's models; apiKey may be one the user has
	// typed but not saved yet.
	ListModels(ctx context.Context, apiKey string) ([]Model, error)
	// Send streams the answer to onText and returns the finish reason.
	Send(ctx context.Context, req Request, onText func(string)) (string, error)
}

// Provider names, as stored in settings.provider.
const (
	OpenAI      = "OpenAI"
	ChatGPT     = "ChatGPT"
	Azure       = "Azure"
	MiniMax     = "MiniMax"
	Moonshot    = "Moonshot"
	Gemini      = "Gemini"
	Ollama      = "Ollama"
	Groq        = "Groq"
	Claude      = "Claude"
	Kimi        = "Kimi"
	ChatGLM     = "ChatGLM"
	Cohere      = "Cohere"
	DeepSeek    = "DeepSeek"
	Cerebras    = "Cerebras"
	TeamoRouter = "TeamoRouter"
	OpenRouter  = "OpenRouter"
	LiteLLM     = "LiteLLM"
)

// Providers are the providers the desktop app offers, in the Tauri app's
// menu order.
var Providers = []string{
	OpenAI, TeamoRouter, OpenRouter, LiteLLM, Claude, Kimi, ChatGLM, Cohere,
	Ollama, Gemini, ChatGPT, Azure, MiniMax, Moonshot, Groq, DeepSeek, Cerebras,
}

// SaveTokens stores tokens an engine renewed (Kimi, ChatGLM); main points it
// at the settings store.
var SaveTokens = func(func(*settings.Settings)) {}

// New returns the engine for provider, configured from s.
func New(provider string, s settings.Settings, client *http.Client) (Engine, error) {
	if client == nil {
		client = http.DefaultClient
	}
	switch provider {
	case OpenAI, "":
		return newOpenAI(s, client), nil
	case Azure:
		return newAzure(s, client), nil
	case Ollama:
		return newOllama(s, client), nil
	case Groq:
		return newGroq(s, client), nil
	case DeepSeek:
		return newFixedURL(DeepSeek, "https://api.deepseek.com", s.DeepSeekAPIKey, s.DeepSeekAPIModel, s, client), nil
	case Moonshot:
		return newFixedURL(Moonshot, "https://api.moonshot.cn", s.MoonshotAPIKey, s.MoonshotAPIModel, s, client), nil
	case TeamoRouter:
		return newFixedURL(TeamoRouter, "https://api.teamorouter.com", s.TeamoRouterAPIKey, s.TeamoRouterAPIModel, s, client), nil
	case MiniMax:
		return newMiniMax(s, client), nil
	case Cerebras:
		return newCerebras(s, client), nil
	case OpenRouter:
		return newOpenRouter(s, client), nil
	case LiteLLM:
		return newLiteLLM(s, client), nil
	case Claude:
		return newClaude(s, client), nil
	case Gemini:
		return newGemini(s, client), nil
	case Cohere:
		return newCohere(s, client), nil
	case Kimi:
		return newKimi(s, client), nil
	case ChatGLM:
		return newChatGLM(s, client), nil
	case ChatGPT:
		return newChatGPT(s, client), nil
	}
	return nil, fmt.Errorf("unknown provider %q", provider)
}

// pickKey picks one key from a comma-separated list, at random, as the TS
// engines do to spread the load.
func pickKey(keys string) string {
	parts := strings.Split(keys, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts[rand.IntN(len(parts))]
}

func firstKey(keys string) string {
	k, _, _ := strings.Cut(keys, ",")
	return strings.TrimSpace(k)
}

func customOr(model, custom string) string {
	if model == settings.CustomModelID {
		return custom
	}
	return model
}

// joinURL joins a base URL and a path with exactly one slash between them.
func joinURL(base string, parts ...string) string {
	out := strings.TrimRight(base, "/")
	for _, p := range parts {
		p = strings.Trim(p, "/")
		if p != "" {
			out += "/" + p
		}
	}
	return out
}

func combinedPrompt(req Request) string {
	if req.RolePrompt != "" {
		return req.RolePrompt + "\n\n" + req.CommandPrompt
	}
	return req.CommandPrompt
}

// APIError is a non-2xx answer from a provider.
type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return fmt.Sprintf("HTTP %d %s", e.Status, http.StatusText(e.Status))
}

// errorFromResponse reads the error message a provider put in its body.
func errorFromResponse(resp *http.Response) error {
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	return &APIError{Status: resp.StatusCode, Message: errorMessage(data)}
}

// errorMessage finds the message in the common error shapes:
// {"error":{"message"}}, {"error":"..."}, {"detail":...}, {"message"} and
// [{"error":{"message"}}] (Gemini).
func errorMessage(data []byte) string {
	var v any
	if json.Unmarshal(data, &v) != nil {
		return strings.TrimSpace(string(data))
	}
	if arr, ok := v.([]any); ok && len(arr) > 0 {
		v = arr[0]
	}
	m, ok := v.(map[string]any)
	if !ok {
		return strings.TrimSpace(string(data))
	}
	str := func(x any) string {
		switch x := x.(type) {
		case string:
			return x
		case nil:
			return ""
		default:
			b, _ := json.Marshal(x)
			return string(b)
		}
	}
	if d, ok := m["detail"]; ok && d != nil {
		if dm, ok := d.(map[string]any); ok && dm["message"] != nil {
			return str(dm["message"])
		}
		return str(d)
	}
	if e, ok := m["error"]; ok && e != nil {
		if em, ok := e.(map[string]any); ok && em["message"] != nil {
			return str(em["message"])
		}
		return str(e)
	}
	if msg, ok := m["message"]; ok {
		return str(msg)
	}
	return strings.TrimSpace(string(data))
}

func postJSON(ctx context.Context, client *http.Client, url string, header http.Header, body any) (*http.Response, error) {
	data, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, strings.NewReader(string(data)))
	if err != nil {
		return nil, err
	}
	req.Header = header.Clone()
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode/100 != 2 {
		defer resp.Body.Close()
		return nil, errorFromResponse(resp)
	}
	return resp, nil
}

func getJSON(ctx context.Context, client *http.Client, url string, header http.Header, v any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	if header != nil {
		req.Header = header.Clone()
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		switch resp.StatusCode {
		case http.StatusUnauthorized, http.StatusForbidden:
			return &APIError{Status: resp.StatusCode, Message: "Invalid API key"}
		case http.StatusNotFound:
			return &APIError{Status: resp.StatusCode, Message: "Invalid API URL"}
		}
		return errorFromResponse(resp)
	}
	return json.NewDecoder(resp.Body).Decode(v)
}

func bearer(key string) http.Header {
	h := http.Header{}
	if key != "" {
		h.Set("Authorization", "Bearer "+key)
	}
	return h
}
