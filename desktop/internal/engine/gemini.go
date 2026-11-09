package engine

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

type gemini struct {
	client   *http.Client
	url      string
	key      string
	model    string
	thinking bool
}

func newGemini(s settings.Settings, client *http.Client) *gemini {
	return &gemini{client: client, url: s.GeminiAPIURL, key: s.GeminiAPIKey, model: s.GeminiAPIModel, thinking: s.ThinkingEnabled}
}

func (e *gemini) Provider() string          { return Gemini }
func (e *gemini) Model() string             { return e.model }
func (e *gemini) IsLocal() bool             { return false }
func (e *gemini) SupportsCustomModel() bool { return false }

// geminiThinking caches the "thinking" flag the models API reports for each
// model; false means the model rejects thinkingConfig.
var geminiThinking struct {
	sync.Mutex
	m map[string]bool
}

func (e *gemini) ListModels(ctx context.Context, apiKey string) ([]Model, error) {
	if apiKey == "" {
		return nil, nil
	}
	u := joinURL(e.url, "/v1beta/models") + "?" + url.Values{"key": {apiKey}, "pageSize": {"1000"}}.Encode()
	var out struct {
		Models []struct {
			Name    string   `json:"name"`
			Methods []string `json:"supportedGenerationMethods"`
			Think   bool     `json:"thinking"`
		} `json:"models"`
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	resp, err := e.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		// The API's own reason (bad key, region, quota) beats an empty list.
		return nil, errorFromResponse(resp)
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	caps := map[string]bool{}
	var models []Model
	for _, m := range out.Models {
		name := m.Name[strings.LastIndex(m.Name, "/")+1:]
		caps[name] = m.Think
		if m.Methods != nil && !containsStr(m.Methods, "generateContent") {
			continue
		}
		models = append(models, Model{ID: name, Name: name})
	}
	geminiThinking.Lock()
	geminiThinking.m = caps
	geminiThinking.Unlock()
	return models, nil
}

func containsStr(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

var (
	reGemma       = regexp.MustCompile(`(?i)^gemma-`)
	reGeminiMajor = regexp.MustCompile(`(?i)^gemini-(\d+)`)
	reRoboticsER2 = regexp.MustCompile(`(?i)robotics-er-2`)
	reLatest      = regexp.MustCompile(`(?i)-latest$`)
	reFlashLite   = regexp.MustCompile(`(?i)flash-lite`)
	reFlashMin    = regexp.MustCompile(`(?i)^gemini-3(?:-flash|\.6-flash)`)
	rePro         = regexp.MustCompile(`(?i)-pro($|[-:])`)
)

// GeminiThinkingConfig is resolveGeminiThinkingConfig: the thinkingConfig
// for a model, or nil to send none. known/capable is the models API flag.
func GeminiThinkingConfig(model string, thinkingEnabled bool, known, capable bool) map[string]any {
	if known && !capable {
		return nil
	}
	isGemma := reGemma.MatchString(model)
	major := -1
	if m := reGeminiMajor.FindStringSubmatch(model); m != nil {
		major, _ = strconv.Atoi(m[1])
	}
	usesLevel := isGemma || reRoboticsER2.MatchString(model) || reLatest.MatchString(model) || major >= 3
	usesBudget := major >= 0 && major < 3
	supportsMinimal := isGemma || reFlashLite.MatchString(model) || reFlashMin.MatchString(model)
	if thinkingEnabled {
		switch {
		case isGemma:
			return map[string]any{"thinkingLevel": "high"}
		case usesLevel:
			return map[string]any{}
		case usesBudget:
			return map[string]any{"thinkingBudget": -1}
		}
		return nil
	}
	switch {
	case usesLevel:
		if supportsMinimal {
			return map[string]any{"thinkingLevel": "minimal"}
		}
		return map[string]any{"thinkingLevel": "low"}
	case usesBudget:
		if rePro.MatchString(model) {
			return map[string]any{"thinkingBudget": 128}
		}
		return map[string]any{"thinkingBudget": 0}
	}
	return nil
}

var geminiSafety = []map[string]string{
	{"category": "HARM_CATEGORY_HARASSMENT", "threshold": "OFF"},
	{"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "OFF"},
	{"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "OFF"},
	{"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "OFF"},
}

func (e *gemini) Send(ctx context.Context, req Request, onText func(string)) (string, error) {
	model := req.ModelOverride
	if model == "" {
		model = e.model
	}
	u := joinURL(e.url, "/v1beta/models/", model+":streamGenerateContent") + "?" + url.Values{"key": {e.key}, "alt": {"sse"}}.Encode()
	geminiThinking.Lock()
	capable, known := geminiThinking.m[model]
	geminiThinking.Unlock()
	gen := map[string]any{}
	if tc := GeminiThinkingConfig(model, e.thinking, known, capable); tc != nil {
		gen["thinkingConfig"] = tc
	}
	body := map[string]any{
		"contents":         []any{map[string]any{"role": "user", "parts": []any{map[string]string{"text": combinedPrompt(req)}}}},
		"safetySettings":   geminiSafety,
		"generationConfig": gen,
	}
	h := http.Header{}
	h.Set("User-Agent", edgeBrowserUserAgent)
	resp, err := postJSON(ctx, e.client, u, h, body)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	reason := "stop"
	var apiErr error
	err = readSSE(resp.Body, func(_, data string) error {
		var ev struct {
			Candidates []struct {
				FinishReason string `json:"finishReason"`
				Content      struct {
					Parts []struct {
						Text    string `json:"text"`
						Thought bool   `json:"thought"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}
		if err := json.Unmarshal([]byte(data), &ev); err != nil {
			return err
		}
		if len(ev.Candidates) == 0 {
			apiErr = &APIError{Message: "no candidates"}
			return errStop
		}
		c := ev.Candidates[0]
		for _, p := range c.Content.Parts {
			if !p.Thought && p.Text != "" {
				onText(p.Text)
			}
		}
		if c.FinishReason != "" && c.FinishReason != "STOP" {
			reason = c.FinishReason
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
