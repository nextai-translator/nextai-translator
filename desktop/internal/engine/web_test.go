package engine

import (
	"context"
	"crypto/sha3"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
)

func collect(t *testing.T, e Engine, req Request) (string, error) {
	t.Helper()
	var out strings.Builder
	_, err := e.Send(context.Background(), req, func(s string) { out.WriteString(s) })
	return out.String(), err
}

func saved(t *testing.T) *settings.Settings {
	t.Helper()
	var s settings.Settings
	old := SaveTokens
	SaveTokens = func(fn func(*settings.Settings)) { fn(&s) }
	t.Cleanup(func() { SaveTokens = old })
	return &s
}

func TestKimiRenewsAndStreams(t *testing.T) {
	got := saved(t)
	var prompt string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		switch {
		case r.URL.Path == "/api/chat" && auth == "Bearer old":
			w.WriteHeader(401)
			fmt.Fprint(w, `{"message":"expired"}`)
		case r.URL.Path == "/api/auth/token/refresh" && auth == "Bearer rt":
			fmt.Fprint(w, `{"access_token":"new","refresh_token":"rt2"}`)
		case r.URL.Path == "/api/chat" && auth == "Bearer new":
			fmt.Fprint(w, `{"id":"c1"}`)
		case r.URL.Path == "/api/chat/c1/completion/stream" && auth == "Bearer new":
			var body struct {
				Messages []struct{ Content string } `json:"messages"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			prompt = body.Messages[0].Content
			fmt.Fprint(w, "data: {\"event\":\"resp\"}\n\ndata: {\"event\":\"cmpl\",\"text\":\"Bon\"}\n\ndata: {\"event\":\"cmpl\",\"text\":\"jour\"}\n\ndata: {\"event\":\"all_done\"}\n\ndata: {\"event\":\"cmpl\",\"text\":\"!\"}\n\n")
		default:
			http.Error(w, "unexpected "+r.URL.Path+" "+auth, 400)
		}
	}))
	defer srv.Close()
	e := &kimi{client: srv.Client(), base: srv.URL, access: "old", refresh: "rt"}
	out, err := collect(t, e, Request{RolePrompt: "role", CommandPrompt: "cmd"})
	if err != nil || out != "Bonjour" || prompt != "role\n\ncmd" {
		t.Fatalf("%q %v %q", out, err, prompt)
	}
	if got.KimiAccessToken != "new" || got.KimiRefreshToken != "rt2" {
		t.Fatalf("tokens not saved: %+v", got)
	}
}

func TestKimiError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(401)
		fmt.Fprint(w, `{"message":"auth.token.invalid"}`)
	}))
	defer srv.Close()
	_, err := collect(t, &kimi{client: srv.Client(), base: srv.URL, access: "x"}, Request{CommandPrompt: "hi"})
	if err == nil || err.Error() != "Kimi: auth.token.invalid" {
		t.Fatalf("err = %v", err)
	}
}

func TestChatGLMCreatesConversationAndStreams(t *testing.T) {
	got := saved(t)
	streams := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		switch {
		case r.URL.Path == "/assistant/conversation/list" && auth == "Bearer old":
			w.WriteHeader(401)
		case r.URL.Path == "/v1/user/refresh" && auth == "Bearer rt":
			fmt.Fprint(w, `{"message":"success","result":{"accessToken":"new"}}`)
		case r.URL.Path == "/assistant/conversation/list" && auth == "Bearer new":
			if r.URL.Query().Get("assistant_id") != chatglmAssistant {
				http.Error(w, "assistant", 400)
				return
			}
			fmt.Fprint(w, `{"result":{"conversation_list":[{"id":"x","title":"other"}]}}`)
		case r.URL.Path == "/assistant/stream" && auth == "Bearer new":
			var body struct {
				ConversationID string `json:"conversation_id"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			streams++
			if body.ConversationID == "" {
				fmt.Fprint(w, "data: {\"conversation_id\":\"conv\",\"status\":\"init\",\"parts\":[]}\n\n")
				return
			}
			if body.ConversationID != "conv" {
				http.Error(w, "conversation", 400)
				return
			}
			for _, s := range []string{"Bon", "Bonjour"} {
				fmt.Fprintf(w, "data: {\"status\":\"init\",\"parts\":[{\"status\":\"init\",\"content\":[{\"type\":\"text\",\"text\":%q}]}]}\n\n", s)
			}
			fmt.Fprint(w, "data: {\"status\":\"finish\",\"parts\":[{\"status\":\"finish\",\"content\":[{\"type\":\"text\",\"text\":\"Bonjour !\"}]}]}\n\n")
		default:
			http.Error(w, "unexpected "+r.URL.Path+" "+auth, 400)
		}
	}))
	defer srv.Close()
	e := &chatglm{client: srv.Client(), base: srv.URL, access: "old", refresh: "rt"}
	out, err := collect(t, e, Request{CommandPrompt: "hi"})
	if err != nil || out != "Bonjour !" || streams != 2 {
		t.Fatalf("%q %v streams=%d", out, err, streams)
	}
	if got.ChatGLMAccessToken != "new" {
		t.Fatalf("token not saved: %+v", got)
	}
}

func TestChatGLMIntervene(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/assistant/conversation/list" {
			fmt.Fprint(w, `{"result":{"conversation_list":[{"id":"conv","title":"NextAI Translator"}]}}`)
			return
		}
		fmt.Fprint(w, "data: {\"status\":\"init\",\"parts\":[{\"status\":\"intervene\",\"content\":[],\"error\":{\"intervene_text\":\"blocked\"}}]}\n\n")
	}))
	defer srv.Close()
	_, err := collect(t, &chatglm{client: srv.Client(), base: srv.URL, access: "a"}, Request{CommandPrompt: "hi"})
	if err == nil || err.Error() != "ChatGLM: blocked" {
		t.Fatalf("err = %v", err)
	}
}

func TestChatGPTStreams(t *testing.T) {
	var seed = "0.123"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			w.WriteHeader(401)
			return
		}
		switch r.URL.Path {
		case "/sentinel/chat-requirements":
			fmt.Fprintf(w, `{"token":"req","proofofwork":{"required":true,"seed":%q,"difficulty":"0fffff"},"arkose":{"required":false}}`, seed)
		case "/conversation":
			proof := r.Header.Get("Openai-Sentinel-Proof-Token")
			b64, ok := strings.CutPrefix(proof, "gAAAAAB")
			sum := sha3.Sum512([]byte(seed + b64))
			if r.Header.Get("Openai-Sentinel-Chat-Requirements-Token") != "req" || !ok || hex.EncodeToString(sum[:])[:3] > "0ff" {
				http.Error(w, `{"detail":"bad proof"}`, 403)
				return
			}
			var body struct {
				Model    string `json:"model"`
				Messages []struct {
					Content struct{ Parts []string } `json:"content"`
				} `json:"messages"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			if body.Model != "gpt-x" || body.Messages[0].Content.Parts[0] != "hi" {
				http.Error(w, "body", 400)
				return
			}
			for _, s := range []string{"Bon", "Bonjour"} {
				fmt.Fprintf(w, "data: {\"message\":{\"author\":{\"role\":\"assistant\"},\"content\":{\"content_type\":\"text\",\"parts\":[%q]}}}\n\n", s)
			}
			fmt.Fprint(w, "data: [DONE]\n\n")
		case "/models":
			fmt.Fprint(w, `{"models":[{"slug":"gpt-x","title":"GPT X","tags":["fast"]}]}`)
		}
	}))
	defer srv.Close()
	e := &chatgpt{client: srv.Client(), base: srv.URL, token: "tok", model: "gpt-x"}
	out, err := collect(t, e, Request{CommandPrompt: "hi"})
	if err != nil || out != "Bonjour" {
		t.Fatalf("%q %v", out, err)
	}
	ms, err := e.ListModels(context.Background(), "")
	if err != nil || len(ms) != 1 || ms[0].Name != "GPT X (fast)" {
		t.Fatalf("%+v %v", ms, err)
	}
	e.token = "expired"
	if _, err := collect(t, e, Request{CommandPrompt: "hi"}); err == nil || !strings.Contains(err.Error(), "expired") {
		t.Fatalf("err = %v", err)
	}
	if _, err := collect(t, &chatgpt{client: srv.Client(), base: srv.URL}, Request{}); err != ErrChatGPTToken {
		t.Fatalf("err = %v", err)
	}
}

// The proof matches the JS: base64 of the JSON config, hashed after the seed.
func TestProofToken(t *testing.T) {
	now := time.Date(2026, 11, 10, 12, 0, 0, 0, time.UTC)
	tok := proofToken("s", "00ffff", "UA", now)
	b64 := strings.TrimPrefix(tok, "gAAAAAB")
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		t.Fatal(err)
	}
	var cfg []any
	if err := json.Unmarshal(raw, &cfg); err != nil || len(cfg) != 5 {
		t.Fatalf("%s %v", raw, err)
	}
	if cfg[1] != "Tue, 10 Nov 2026 04:00:00 GMT-0500 (Eastern Time)" || cfg[4] != "UA" {
		t.Fatalf("%s", raw)
	}
	sum := sha3.Sum512([]byte("s" + b64))
	if hex.EncodeToString(sum[:])[:3] > "00f" {
		t.Fatalf("does not meet the difficulty: %s", raw)
	}
	_ = io.Discard
}

func TestNewWebEngines(t *testing.T) {
	for _, p := range []string{Kimi, ChatGLM, ChatGPT} {
		if e, err := New(p, settings.Defaults(), nil); err != nil || e.Provider() != p {
			t.Fatalf("%s: %v", p, err)
		}
	}
}
