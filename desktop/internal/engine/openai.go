package engine

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

const (
	defaultOpenAIURL     = "https://api.openai.com"
	chatCompletionsPath  = "/v1/chat/completions"
	responsesPath        = "/v1/responses"
	browserUserAgent     = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) chatall/1.29.40 Chrome/114.0.5735.134 Safari/537.36"
	edgeBrowserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36 Edg/91.0.864.41"
)

// compat is the OpenAI chat-completions client that most providers share
// (AbstractOpenAI); the fields are what the providers change.
type compat struct {
	provider string
	client   *http.Client
	url      string
	path     string
	key      func() string
	model    string
	thinking bool // settings.thinkingEnabled

	custom, local bool
	// header builds the auth headers; nil means a Bearer key.
	header func(key string) http.Header
	// legacy marks Azure's completions API (no /chat/completions in the path).
	legacy bool
	// baseBody replaces the model-dependent default body (Cerebras).
	baseBody func(model string) map[string]any
	// extend adds the provider's own fields to the body.
	extend func(body map[string]any)
	// effortNone reports whether reasoning_effort "none" may turn thinking off.
	effortNone func(model string) bool
	list       func(ctx context.Context, apiKey string) ([]Model, error)
}

func (e *compat) Provider() string          { return e.provider }
func (e *compat) Model() string             { return e.model }
func (e *compat) IsLocal() bool             { return e.local }
func (e *compat) SupportsCustomModel() bool { return e.custom }

func (e *compat) ListModels(ctx context.Context, apiKey string) ([]Model, error) {
	if e.list == nil {
		return nil, nil
	}
	return e.list(ctx, apiKey)
}

var (
	reGPT34         = regexp.MustCompile(`^gpt-[34]`)
	reOSeries       = regexp.MustCompile(`^o[134]`)
	reGPT5Pro       = regexp.MustCompile(`^gpt-5(\.0)?(-mini|-nano)?-pro\b`)
	reNonReasoning  = regexp.MustCompile(`-chat|-code|instant`)
	reGPT5          = regexp.MustCompile(`^gpt-5`)
	reGPT5Dotted    = regexp.MustCompile(`^gpt-5\.[1-9]`)
	reGPT5Undotted  = regexp.MustCompile(`^gpt-5(-mini|-nano)?(\b|-)`)
	reGPT5AnyDotted = regexp.MustCompile(`^gpt-5\.`)
	reResponsesPath = regexp.MustCompile(`/responses\b`)
	reResponsesOK   = []*regexp.Regexp{
		regexp.MustCompile(`^gpt-5(?:$|[.-])`),
		regexp.MustCompile(`^o\d+(?:$|[.-])`),
		regexp.MustCompile(`^gpt-4o(?:$|[.-])`),
		regexp.MustCompile(`^gpt-4\.1(?:$|[.-])`),
		regexp.MustCompile(`^gpt-4\.5(?:$|[.-])`),
	}
	reMaxCompletion = regexp.MustCompile(`^(?:gpt-4o(?:[-.]|$)|gpt-4\.1(?:[-.]|$)|gpt-5(?:[-.]|$)|o\d(?:[-.]|$))`)
)

// defaultBody is getBaseRequestBody: the parameters each model family accepts.
func defaultBody(model string) map[string]any {
	m := strings.ToLower(model)
	switch {
	case reGPT34.MatchString(m):
		return map[string]any{"model": model, "temperature": 0, "top_p": 1, "frequency_penalty": 1, "presence_penalty": 1, "stream": true}
	case reOSeries.MatchString(m), reGPT5Pro.MatchString(m):
		return map[string]any{"model": model, "stream": true, "reasoning_effort": "low"}
	case reNonReasoning.MatchString(m) && reGPT5.MatchString(m):
		return map[string]any{"model": model, "stream": true}
	case reGPT5Dotted.MatchString(m):
		return map[string]any{"model": model, "stream": true}
	case reGPT5Undotted.MatchString(m) && !reGPT5AnyDotted.MatchString(m):
		return map[string]any{"model": model, "stream": true, "reasoning_effort": "minimal"}
	}
	return map[string]any{"model": model, "stream": true}
}

func gpt51Plus(model string) bool { return reGPT5Dotted.MatchString(strings.ToLower(model)) }

// IsResponsesCapable reports whether OpenAI serves the model on the
// Responses API.
func IsResponsesCapable(model string) bool {
	m := strings.ToLower(strings.TrimSpace(model))
	for _, re := range reResponsesOK {
		if m != "" && re.MatchString(m) {
			return true
		}
	}
	return false
}

func (e *compat) useResponses(model string) bool {
	if reResponsesPath.MatchString(e.path) {
		return true
	}
	if strings.TrimRight(e.url, "/") != defaultOpenAIURL || e.path != chatCompletionsPath {
		return false
	}
	return IsResponsesCapable(model)
}

func (e *compat) buildBody(req Request, model string, responses bool) map[string]any {
	var body map[string]any
	if e.baseBody != nil {
		body = e.baseBody(model)
	} else {
		body = defaultBody(model)
	}
	if e.extend != nil {
		e.extend(body)
	}
	effortNone := e.effortNone
	if effortNone == nil {
		effortNone = gpt51Plus
	}
	if !e.thinking && effortNone(model) {
		body["reasoning_effort"] = "none"
	}
	switch {
	case responses:
		if effort, ok := body["reasoning_effort"]; ok {
			body["reasoning"] = map[string]any{"effort": effort}
			delete(body, "reasoning_effort")
		}
		for _, k := range []string{"max_completion_tokens", "max_tokens"} {
			if v, ok := body[k]; ok {
				if _, has := body["max_output_tokens"]; !has {
					body["max_output_tokens"] = v
				}
				delete(body, k)
			}
		}
		for _, k := range []string{"temperature", "top_p", "frequency_penalty", "presence_penalty", "messages", "prompt", "stop"} {
			delete(body, k)
		}
		body["input"] = req.CommandPrompt
		if req.RolePrompt != "" {
			body["instructions"] = req.RolePrompt
		}
	case e.legacy:
		if req.RolePrompt != "" {
			body["prompt"] = "<|im_start|>user\n" + req.RolePrompt + "\n\n" + req.CommandPrompt + "\n<|im_end|>\n<|im_start|>assistant\n"
		} else {
			body["prompt"] = "<|im_start|>user\n" + req.CommandPrompt + "\n<|im_end|>\n<|im_start|>assistant\n"
		}
		body["stop"] = []string{"<|im_end|>"}
	default:
		body["messages"] = []map[string]string{{"role": "user", "content": combinedPrompt(req)}}
	}
	return body
}

func (e *compat) headers(key string) http.Header {
	if e.header != nil {
		return e.header(key)
	}
	h := bearer(key)
	h.Set("User-Agent", browserUserAgent)
	return h
}

func (e *compat) Send(ctx context.Context, req Request, onText func(string)) (string, error) {
	model := req.ModelOverride
	if model == "" {
		model = e.model
	}
	responses := e.useResponses(model)
	path := e.path
	if responses {
		path = responsesPath
	}
	key := ""
	if e.key != nil {
		key = e.key()
	}
	resp, err := postJSON(ctx, e.client, joinURL(e.url, path), e.headers(key), e.buildBody(req, model, responses))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	reason := "stop"
	streamed := false
	var apiErr error
	err = readSSE(resp.Body, func(_, data string) error {
		if strings.TrimSpace(data) == "[DONE]" {
			return errStop
		}
		if responses {
			var ev struct {
				Type     string `json:"type"`
				Delta    string `json:"delta"`
				Text     string `json:"text"`
				Message  string `json:"message"`
				Response struct {
					OutputText *string `json:"output_text"`
					Output     []struct {
						Content []struct {
							Type string `json:"type"`
							Text string `json:"text"`
						} `json:"content"`
					} `json:"output"`
					Incomplete struct {
						Reason string `json:"reason"`
					} `json:"incomplete_details"`
					Error struct {
						Message string `json:"message"`
					} `json:"error"`
				} `json:"response"`
				Error struct {
					Message string `json:"message"`
				} `json:"error"`
			}
			if err := json.Unmarshal([]byte(data), &ev); err != nil {
				return err
			}
			switch ev.Type {
			case "response.output_text.delta":
				streamed = true
				if ev.Delta != "" {
					onText(ev.Delta)
				}
			case "response.output_text.done":
				if !streamed && ev.Text != "" {
					streamed = true
					onText(ev.Text)
				}
			case "response.completed":
				if !streamed {
					if ev.Response.OutputText != nil {
						onText(*ev.Response.OutputText)
					} else {
						var b strings.Builder
						for _, item := range ev.Response.Output {
							for _, part := range item.Content {
								if part.Type == "output_text" {
									b.WriteString(part.Text)
								}
							}
						}
						if b.Len() > 0 {
							onText(b.String())
						}
					}
				}
				return errStop
			case "response.incomplete":
				reason = ev.Response.Incomplete.Reason
				if reason == "" {
					reason = "incomplete"
				}
				return errStop
			case "response.failed", "error":
				msg := ev.Response.Error.Message
				if msg == "" {
					msg = ev.Error.Message
				}
				if msg == "" {
					msg = ev.Message
				}
				if msg == "" {
					msg = "Unknown error"
				}
				apiErr = &APIError{Message: msg}
				return errStop
			}
			return nil
		}

		var chunk struct {
			XGroq *struct {
				Error string `json:"error"`
			} `json:"x_groq"`
			Choices []struct {
				FinishReason *string `json:"finish_reason"`
				Text         string  `json:"text"`
				Delta        struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
			Error *struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			return err
		}
		if chunk.XGroq != nil && chunk.XGroq.Error != "" {
			apiErr = &APIError{Message: chunk.XGroq.Error}
		}
		if chunk.Error != nil && chunk.Error.Message != "" {
			apiErr = &APIError{Message: chunk.Error.Message}
			return errStop
		}
		if len(chunk.Choices) == 0 {
			return nil
		}
		c := chunk.Choices[0]
		// Some proxies send the last text together with finish_reason, so
		// the text goes out first.
		if e.legacy {
			if c.Text != "" {
				onText(c.Text)
			}
		} else if c.Delta.Content != "" {
			onText(c.Delta.Content)
		}
		if c.FinishReason != nil && *c.FinishReason != "" {
			reason = *c.FinishReason
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

// listOpenAIModels GETs <base>/v1/models (or path) and maps the ids.
func listOpenAIModels(ctx context.Context, client *http.Client, url, key string, keep func(id string) bool, name func(id, ownedBy, name string) string) ([]Model, error) {
	var out struct {
		Data []struct {
			ID          string `json:"id"`
			OwnedBy     string `json:"owned_by"`
			Name        string `json:"name"`
			Description string `json:"description"`
		} `json:"data"`
	}
	if err := getJSON(ctx, client, url, bearer(key), &out); err != nil {
		return nil, err
	}
	var models []Model
	for _, m := range out.Data {
		if keep != nil && !keep(m.ID) {
			continue
		}
		n := m.ID
		if name != nil {
			n = name(m.ID, m.OwnedBy, m.Name)
		}
		desc, _, _ := strings.Cut(m.Description, "\n")
		if r := []rune(desc); len(r) > 120 {
			desc = string(r[:120])
		}
		models = append(models, Model{ID: m.ID, Name: n, Description: desc})
	}
	return models, nil
}

func staticModels(ids ...string) []Model {
	out := make([]Model, len(ids))
	for i, id := range ids {
		out[i] = Model{ID: id, Name: id}
	}
	return out
}

var openAIStaticModels = staticModels(
	"gpt-5.6", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini",
	"gpt-3.5-turbo-1106", "gpt-3.5-turbo", "gpt-3.5-turbo-0613", "gpt-3.5-turbo-0301", "gpt-3.5-turbo-16k",
	"gpt-3.5-turbo-16k-0613", "gpt-4", "gpt-4o", "gpt-4-turbo", "gpt-4-turbo-2024-04-09", "gpt-4-turbo-preview",
	"gpt-4-0125-preview", "gpt-4-1106-preview", "gpt-4-0314", "gpt-4-0613", "gpt-4-32k", "gpt-4-32k-0314", "gpt-4-32k-0613",
)

func newOpenAI(s settings.Settings, client *http.Client) *compat {
	e := &compat{
		provider: OpenAI, client: client, url: s.APIURL, path: s.APIURLPath,
		key:   func() string { return pickKey(s.APIKeys) },
		model: customOr(s.APIModel, s.CustomModelName), thinking: s.ThinkingEnabled, custom: true,
	}
	e.list = func(ctx context.Context, apiKey string) ([]Model, error) {
		if apiKey == "" {
			return nil, nil
		}
		if s.NoModelsAPISupport {
			return openAIStaticModels, nil
		}
		official := strings.TrimRight(e.url, "/") == defaultOpenAIURL
		return listOpenAIModels(ctx, client, joinURL(e.url, "/v1/models"), firstKey(apiKey), func(id string) bool {
			if official {
				return strings.Contains(id, "gpt")
			}
			for _, p := range []string{"text-", "dall-", "tts-", "winsper-", "davinci", "babbage"} {
				if strings.HasPrefix(id, p) {
					return false
				}
			}
			return true
		}, nil)
	}
	return e
}

// UsesMaxCompletionTokens reports whether Azure wants max_completion_tokens
// instead of max_tokens for the model.
func UsesMaxCompletionTokens(model, apiURL string) bool {
	if u, err := url.Parse(apiURL); err == nil && strings.HasSuffix(u.Hostname(), ".services.ai.azure.com") {
		return true
	}
	return reMaxCompletion.MatchString(strings.ToLower(strings.TrimSpace(model)))
}

func newAzure(s settings.Settings, client *http.Client) *compat {
	return &compat{
		provider: Azure, client: client, url: s.AzureAPIURL, path: s.AzureAPIURLPath,
		key:   func() string { return pickKey(s.AzureAPIKeys) },
		model: s.AzureAPIModel, thinking: s.ThinkingEnabled,
		legacy: s.AzureAPIURLPath != "" && !strings.Contains(s.AzureAPIURLPath, "/chat/completions"),
		header: func(key string) http.Header {
			h := http.Header{}
			h.Set("api-key", key)
			return h
		},
		extend: func(body map[string]any) {
			if UsesMaxCompletionTokens(s.AzureAPIModel, s.AzureAPIURL) {
				body["max_completion_tokens"] = s.AzMaxWords
			} else {
				body["max_tokens"] = s.AzMaxWords
			}
		},
		list: func(context.Context, string) ([]Model, error) {
			return staticModels("gpt-3.5-turbo-1106", "gpt-3.5-turbo", "gpt-3.5-turbo-0613", "gpt-3.5-turbo-0301",
				"gpt-3.5-turbo-16k", "gpt-3.5-turbo-16k-0613", "gpt-4", "gpt-4o", "gpt-4-turbo", "gpt-4-turbo-2024-04-09",
				"gpt-4-turbo-preview", "gpt-4-0125-preview", "gpt-4-1106-preview", "gpt-4-0314", "gpt-4-0613", "gpt-4-32k",
				"gpt-4-32k-0314", "gpt-4-32k-0613"), nil
		},
	}
}

func newOllama(s settings.Settings, client *http.Client) *compat {
	e := &compat{
		provider: Ollama, client: client, url: s.OllamaAPIURL, path: chatCompletionsPath,
		key:   func() string { return "donotneed" },
		model: customOr(s.OllamaAPIModel, s.OllamaCustomModelName), thinking: s.ThinkingEnabled,
		custom: true, local: true,
		extend:     func(body map[string]any) { body["keep_alive"] = s.OllamaModelLifetimeInMemory },
		effortNone: func(string) bool { return true },
	}
	e.list = func(ctx context.Context, _ string) ([]Model, error) {
		// The models the user has pulled; the TS engine's fixed list is the
		// fallback when the server is not running.
		var tags struct {
			Models []struct {
				Name string `json:"name"`
			} `json:"models"`
		}
		if err := getJSON(ctx, client, joinURL(e.url, "/api/tags"), nil, &tags); err == nil && len(tags.Models) > 0 {
			out := make([]Model, len(tags.Models))
			for i, m := range tags.Models {
				out[i] = Model{ID: m.Name, Name: m.Name}
			}
			return out, nil
		}
		return []Model{
			{ID: "llama2", Name: "Llama 2"}, {ID: "mistral", Name: "Mistral"}, {ID: "dolphin-phi", Name: "Dolphin Phi"},
			{ID: "phi", Name: "Phi-2"}, {ID: "neural-chat", Name: "Neural Chat"}, {ID: "starling-lm", Name: "Starling"},
			{ID: "codellama", Name: "Code Llama"}, {ID: "llama2-uncensored", Name: "Llama 2 Uncensored"},
			{ID: "llama2:13b", Name: "Llama 2 13B"}, {ID: "llama2:70b", Name: "Llama 2 70B"}, {ID: "orca-mini", Name: "Orca Mini"},
			{ID: "vicuna", Name: "Vicuna"}, {ID: "llava", Name: "LLaVA"}, {ID: "gemma:2b", Name: "Gemma 2B"}, {ID: "gemma:7b", Name: "Gemma 7B"},
		}, nil
	}
	return e
}

func newGroq(s settings.Settings, client *http.Client) *compat {
	return &compat{
		provider: Groq, client: client, url: s.GroqAPIURL, path: s.GroqAPIURLPath,
		key:   func() string { return s.GroqAPIKey },
		model: customOr(s.GroqAPIModel, s.GroqCustomModelName), thinking: s.ThinkingEnabled, custom: true,
		list: func(ctx context.Context, apiKey string) ([]Model, error) {
			if apiKey == "" {
				return nil, nil
			}
			return listOpenAIModels(ctx, client, joinURL(s.GroqAPIURL, "/openai/v1/models"), apiKey, nil,
				func(id, owner, _ string) string { return id + " (" + owner + ")" })
		},
	}
}

// newFixedURL is a provider with a fixed endpoint and a /v1/models list that
// needs the key (DeepSeek, Moonshot, TeamoRouter).
func newFixedURL(provider, base, key, model string, s settings.Settings, client *http.Client) *compat {
	return &compat{
		provider: provider, client: client, url: base, path: chatCompletionsPath,
		key: func() string { return key }, model: model, thinking: s.ThinkingEnabled,
		list: func(ctx context.Context, apiKey string) ([]Model, error) {
			if apiKey == "" {
				apiKey = key
			}
			if apiKey == "" {
				return nil, nil
			}
			return listOpenAIModels(ctx, client, joinURL(base, "/v1/models"), apiKey, nil, nil)
		},
	}
}

func newMiniMax(s settings.Settings, client *http.Client) *compat {
	return &compat{
		provider: MiniMax, client: client, url: "https://api.minimax.io", path: chatCompletionsPath,
		key: func() string { return s.MiniMaxAPIKey }, model: s.MiniMaxAPIModel, thinking: s.ThinkingEnabled,
		list: func(context.Context, string) ([]Model, error) {
			return staticModels("MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.7-highspeed"), nil
		},
	}
}

func newCerebras(s settings.Settings, client *http.Client) *compat {
	return &compat{
		provider: Cerebras, client: client, url: "https://api.cerebras.ai", path: chatCompletionsPath,
		key: func() string { return s.CerebrasAPIKey }, model: s.CerebrasAPIModel, thinking: s.ThinkingEnabled,
		baseBody: func(model string) map[string]any {
			return map[string]any{"model": model, "temperature": 0, "top_p": 1, "stream": true}
		},
		list: func(ctx context.Context, apiKey string) ([]Model, error) {
			if apiKey == "" {
				return nil, nil
			}
			return listOpenAIModels(ctx, client, "https://api.cerebras.ai/v1/models", apiKey, nil, nil)
		},
	}
}

func newOpenRouter(s settings.Settings, client *http.Client) *compat {
	return &compat{
		provider: OpenRouter, client: client, url: "https://openrouter.ai/api", path: chatCompletionsPath,
		key: func() string { return s.OpenRouterAPIKey }, model: s.OpenRouterAPIModel, thinking: s.ThinkingEnabled,
		list: func(ctx context.Context, apiKey string) ([]Model, error) {
			if apiKey == "" {
				apiKey = s.OpenRouterAPIKey
			}
			// The list is public; the key is sent when there is one.
			return listOpenAIModels(ctx, client, "https://openrouter.ai/api/v1/models", apiKey, nil,
				func(id, _, name string) string {
					if name != "" {
						return name
					}
					return id
				})
		},
	}
}

func newLiteLLM(s settings.Settings, client *http.Client) *compat {
	return &compat{
		provider: LiteLLM, client: client, url: s.LiteLLMAPIURL, path: chatCompletionsPath,
		key: func() string { return s.LiteLLMAPIKey }, model: s.LiteLLMAPIModel, thinking: s.ThinkingEnabled,
		list: func(ctx context.Context, apiKey string) ([]Model, error) {
			if apiKey == "" {
				apiKey = s.LiteLLMAPIKey
			}
			if s.LiteLLMAPIURL == "" {
				return nil, nil
			}
			return listOpenAIModels(ctx, client, joinURL(s.LiteLLMAPIURL, "/v1/models"), apiKey, nil, nil)
		},
	}
}
