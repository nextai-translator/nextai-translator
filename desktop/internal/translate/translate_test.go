package translate

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
)

func TestLangName(t *testing.T) {
	for code, want := range map[string]string{
		"en": "English", "fr": "French", "zh-Hans": "简体中文", "en-US": "American English",
		"jw": "Jawa", "yue": "粤语", "gd": "Gaelic", "xx-YY": "xx-YY",
	} {
		if got := LangName(code); got != want {
			t.Errorf("LangName(%q) = %q, want %q", code, got, want)
		}
	}
}

func TestIsAWord(t *testing.T) {
	for text, want := range map[string]bool{
		"hello": true, "don't": true, "café": true, "hello world": false, "hi!": false,
		"你好": true, "你好世界的人们": false, "": false, "Привет": true,
	} {
		if got := IsAWord(text); got != want {
			t.Errorf("IsAWord(%q) = %v, want %v", text, got, want)
		}
	}
}

var translateAction = store.Action{Mode: store.ModeTranslate}

func TestBuildTranslate(t *testing.T) {
	p := Build(Query{Text: "The quick brown fox.", Source: "en", Target: "fr", Action: translateAction})
	if p.WordMode {
		t.Fatal("sentence in word mode")
	}
	if p.RolePrompt != "You are a professional translator." {
		t.Fatalf("role %q", p.RolePrompt)
	}
	want := "Only reply the result and nothing else. Please translate to Français:\n\nThe quick brown fox."
	if p.CommandPrompt != want {
		t.Fatalf("command %q", p.CommandPrompt)
	}
}

func TestBuildWordMode(t *testing.T) {
	p := Build(Query{Text: "serendipity", Source: "en", Target: "fr", Action: translateAction})
	if !p.WordMode || !strings.Contains(p.RolePrompt, "English-French dictionary") ||
		!strings.HasSuffix(p.CommandPrompt, "Please give me the word.:\n\nThe word is: serendipity") {
		t.Fatalf("%+v", p)
	}
	zh := Build(Query{Text: "serendipity", Source: "en", Target: "zh-Hans", Action: translateAction})
	if !zh.WordMode || !strings.HasPrefix(zh.RolePrompt, "你是一个翻译引擎，请翻译给出的文本") ||
		!strings.HasSuffix(zh.CommandPrompt, "单词是：serendipity") {
		t.Fatalf("%+v", zh)
	}
	w := Build(Query{Text: "serendipity", Source: "en", Target: "fr", Action: translateAction, Writing: true})
	if w.WordMode {
		t.Fatal("writing in word mode")
	}
}

func TestBuildCustomAction(t *testing.T) {
	a := store.Action{RolePrompt: "Act as ${targetLang} poet", CommandPrompt: "Rewrite ${text} from ${sourceLang}", OutputRenderingFormat: "markdown"}
	p := Build(Query{Text: "rain", Source: "en", Target: "de", Action: a})
	if p.RolePrompt != "Act as German poet" {
		t.Fatalf("role %q", p.RolePrompt)
	}
	if p.CommandPrompt != "(Requirements: The output format must be markdown) Rewrite rain from English" {
		t.Fatalf("command %q", p.CommandPrompt)
	}
	b := Build(Query{Text: "rain", Source: "en", Target: "de", Action: store.Action{CommandPrompt: "Do it"}})
	if b.CommandPrompt != "Only reply the result and nothing else. Do it:\n\nrain" {
		t.Fatalf("command %q", b.CommandPrompt)
	}
}

func TestBuildExplainCode(t *testing.T) {
	p := Build(Query{Text: "x := 1\n", Source: "en", Target: "en", Action: store.Action{Mode: store.ModeExplainCode}})
	if !strings.HasSuffix(p.CommandPrompt, ":\n\n```\nx := 1\n\n```") {
		t.Fatalf("%q", p.CommandPrompt)
	}
}

func TestResolve(t *testing.T) {
	s := settings.Defaults()
	s.Provider = engine.OpenAI
	s.ClaudeThinking = true
	yes := false
	prov, req := Resolve(Query{Action: store.Action{Provider: engine.Claude, APIModel: "claude-x", ThinkingLevel: "high"}}, s)
	if prov != engine.Claude || req.ModelOverride != "claude-x" || req.ThinkingBudget != 20000 {
		t.Fatalf("%s %+v", prov, req)
	}
	_, req = Resolve(Query{Action: store.Action{Provider: engine.Claude, Thinking: &yes}}, s)
	if req.ThinkingBudget != 0 {
		t.Fatalf("thinking off by action: %+v", req)
	}
	prov, _ = Resolve(Query{ArticlePrompt: "a story", Action: store.Action{Provider: engine.Claude}}, s)
	if prov != engine.OpenAI {
		t.Fatal("big-bang used the action provider")
	}
}

func TestRunOpenAI(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer k" {
			http.Error(w, `{"error":{"message":"bad key"}}`, 401)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		for _, d := range []string{"Bon", "jour"} {
			fmt.Fprintf(w, "data: {\"choices\":[{\"delta\":{\"content\":%q}}]}\n\n", d)
		}
		fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n")
	}))
	defer srv.Close()
	s := settings.Defaults()
	s.Provider = engine.OpenAI
	s.APIURL = srv.URL
	s.APIURLPath = "/v1/chat/completions"
	s.APIKeys = "k"
	s.APIModel = "gpt-4o-mini"
	var out strings.Builder
	res, err := Run(context.Background(), Query{Text: "Hello", Source: "en", Target: "fr", Action: translateAction}, s, srv.Client(), func(t string) { out.WriteString(t) })
	if err != nil {
		t.Fatal(err)
	}
	if out.String() != "Bonjour" || res.Provider != engine.OpenAI || res.Model != "gpt-4o-mini" {
		t.Fatalf("%q %+v", out.String(), res)
	}
	s.APIKeys = "wrong"
	_, err = Run(context.Background(), Query{Text: "Hello", Source: "en", Target: "fr", Action: translateAction}, s, srv.Client(), func(string) {})
	if err == nil || !strings.Contains(err.Error(), "bad key") {
		t.Fatalf("err = %v", err)
	}
}
