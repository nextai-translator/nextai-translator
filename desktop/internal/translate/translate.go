// Package translate turns a query (text, languages, action) into a prompt
// and streams the answer from the configured provider. It ports
// src/common/translate.ts.
package translate

import (
	"context"
	"net/http"
	"strings"
	"unicode"
	"unicode/utf16"

	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
	"github.com/nextai-translator/nextai-translator/desktop/internal/lang"
	"github.com/nextai-translator/nextai-translator/desktop/internal/settings"
	"github.com/nextai-translator/nextai-translator/desktop/internal/store"
)

// Query is one translation.
type Query struct {
	Text   string
	Source string // detected source language code
	Target string
	Action store.Action
	// Writing is set when the text is being rewritten in place, which turns
	// off the dictionary prompts.
	Writing bool
	// SelectedWord asks for the meaning of this word inside Text.
	SelectedWord string
	// ArticlePrompt makes a "big-bang" query: write an article from the words.
	ArticlePrompt string
}

// Prompt is what gets sent, plus whether the answer is a dictionary entry.
type Prompt struct {
	engine.Request
	WordMode bool
}

// LangName is the name a prompt uses for a language: the English name of a
// two-letter ISO 639-1 code, otherwise the language's own name.
func LangName(code string) string {
	if n, ok := isoNames[code]; ok {
		return n
	}
	if !lang.Known(code) {
		return code
	}
	return lang.Get(code).Name
}

// isoNames differ from our English names only where the iso-639-1 package
// spells them differently.
var isoNames = func() map[string]string {
	m := map[string]string{}
	for _, c := range lang.All() {
		if len(c.Code) == 2 && c.Code != "jw" {
			m[c.Code] = c.NameEn
		}
	}
	m["fy"] = "Western Frisian"
	m["gd"] = "Gaelic"
	m["ht"] = "Haitian"
	return m
}()

func jsLen(s string) int { return len(utf16.Encode([]rune(s))) }

// IsAWord approximates Intl.Segmenter's "the first word is the whole text".
func IsAWord(text string) bool {
	if text == "" {
		return false
	}
	runes := []rune(text)
	spaceless := 0
	for i, r := range runes {
		switch {
		case isSpacelessScript(r):
			spaceless++
		case unicode.IsLetter(r), unicode.IsMark(r), unicode.IsDigit(r):
		case (r == '\'' || r == '’' || r == '-') && i > 0 && i < len(runes)-1:
		default:
			return false
		}
	}
	if spaceless == 0 {
		return true
	}
	// A segmenter splits CJK and Thai runs into dictionary words; short runs
	// are usually one word.
	return spaceless == len(runes) && len(runes) <= 4
}

func isSpacelessScript(r rune) bool {
	return unicode.In(r, unicode.Han, unicode.Hiragana, unicode.Katakana, unicode.Thai, unicode.Lao, unicode.Khmer, unicode.Myanmar)
}

// Build makes the prompt for q. It ports the prompt half of translate().
func Build(q Query) Prompt {
	var p Prompt
	content := q.Text
	if q.ArticlePrompt != "" {
		p.RolePrompt = "You are a professional writer and you will write " + q.ArticlePrompt + " based on the given words"
		p.CommandPrompt = "Write " + q.ArticlePrompt + " of no more than 160 words. The article must contain the words in the following text. The more words you use, the better"
		return finish(p, content)
	}
	srcName, tgtName := LangName(q.Source), LangName(q.Target)
	src, tgt := lang.Get(q.Source), lang.Get(q.Target)
	toChinese := lang.IsChinese(q.Target)
	a := q.Action
	switch a.Mode {
	case "":
		if strings.Contains(a.RolePrompt, "${text}") || strings.Contains(a.CommandPrompt, "${text}") {
			content = ""
		}
		fill := func(s string) string {
			s = strings.Replace(s, "${sourceLang}", srcName, 1)
			s = strings.Replace(s, "${targetLang}", tgtName, 1)
			return strings.Replace(s, "${text}", q.Text, 1)
		}
		p.RolePrompt, p.CommandPrompt = fill(a.RolePrompt), fill(a.CommandPrompt)
		if a.OutputRenderingFormat != "" {
			p.CommandPrompt = "(Requirements: The output format must be " + a.OutputRenderingFormat + ") " + p.CommandPrompt
		}
	case store.ModeTranslate:
		p.RolePrompt = tgt.Role()
		p.CommandPrompt = tgt.Command(src)
		pn := tgt.PhoneticNotation()
		if !q.Writing && jsLen(q.Text) < 5 && toChinese {
			p.RolePrompt = "你是一个翻译引擎，请将给到的文本翻译成" + tgtName + "。请列出3种（如果有）最常用翻译结果：单词或短语，并列出对应的适用语境（用中文阐述）、音标或转写、词性、双语示例。按照下面格式用中文阐述：\n" +
				"    <序号><单词或短语> · /<" + pn + ">/\n" +
				"    [<词性缩写>] <适用语境（用中文阐述）>\n" +
				"    例句：<例句>(例句翻译)"
			p.CommandPrompt = ""
		}
		if !q.Writing && IsAWord(strings.TrimSpace(q.Text)) {
			p.WordMode = true
			if toChinese {
				notation := ""
				if pn != "" {
					notation = "对应的音标或转写、"
				}
				pnTag := ""
				if pn != "" {
					pnTag = "<" + pn + ">"
				}
				p.RolePrompt = "你是一个翻译引擎，请翻译给出的文本，只需要翻译不需要解释。当且仅当文本只有一个单词时，请给出单词原始形态（如果有）、单词的语种、" + notation + "所有含义（含词性）、双语示例，至少三条例句。如果你认为单词拼写错误，请提示我最可能的正确拼写，否则请严格按照下面格式给到翻译结果：\n" +
					"    <单词>\n" +
					"    [<语种>]· / " + pnTag + "\n" +
					"    [<词性缩写>] <中文含义>]\n" +
					"    例句：\n" +
					"    <序号><例句>(例句翻译)\n" +
					"    词源：\n" +
					"    <词源>"
				p.CommandPrompt = "好的，我明白了，请给我这个单词。"
				content = "单词是：" + q.Text
			} else {
				sameLang := q.Source == q.Target
				var b strings.Builder
				b.WriteString("You are a professional translation engine. Please translate the text into " + tgtName + " without explanation. When the text has only one word, please act as a professional " + srcName + "-" + tgtName + " dictionary, and list the original form of the word (if any), the language of the word, ")
				if pn != "" {
					b.WriteString("the corresponding phonetic notation or transcription, ")
				}
				b.WriteString("all senses with parts of speech, ")
				if !sameLang {
					b.WriteString("bilingual ")
				}
				b.WriteString("sentence examples (at least 3) and etymology. If you think there is a spelling mistake, please tell me the most possible correct word otherwise reply in the following format:\n")
				b.WriteString("<word> (<original form>)\n[<language>]· / ")
				if pn != "" {
					b.WriteString("<" + pn + ">")
				}
				b.WriteString("\n[<part of speech>] ")
				if !sameLang {
					b.WriteString("<translated meaning> / ")
				}
				b.WriteString("<meaning in source language>\nExamples:\n<index>. <sentence>")
				if !sameLang {
					b.WriteString("(<sentence translation>)")
				}
				b.WriteString("\nEtymology:\n<etymology>")
				p.RolePrompt = b.String()
				p.CommandPrompt = "I understand. Please give me the word."
				content = "The word is: " + q.Text
			}
		}
		if !q.Writing && q.SelectedWord != "" {
			spn := src.PhoneticNotation()
			first := ""
			if spn != "" {
				first = "Firstly, provide the corresponding phonetic notation or transcription of the word in " + srcName + ". "
			}
			tag := ""
			if spn != "" {
				tag = "<" + spn + ">"
			}
			p.RolePrompt = "You are an expert in the semantic syntax of the " + srcName + " language, and you are teaching me the " + srcName + " language. I will give you a sentence in " + srcName + " and a word from that sentence. " + first +
				"Then, help me explain in " + tgtName + " what the word means in the sentence, what the sentence itself means, and whether the word is part of an idiom in the sentence. If it is, explain the idiom in the sentence. Provide 3 to 5 examples in " + srcName + " with the same meaning, and explain these examples in " + tgtName + ". The answer should follow the format below:\n\n" +
				"<word> · /" + tag + "/\n<the remaining part>\n\nIf you understand, say \"yes\", and then we will begin."
			p.CommandPrompt = "Yes, I understand. Please give me the sentence and the word."
			content = "the sentence is: " + q.Text + "\n\nthe word is: " + q.SelectedWord
		}
	case store.ModePolishing:
		p.RolePrompt = "You are an expert translator, translate directly without explanation."
		p.CommandPrompt = "Please edit the following sentences in " + srcName + " to improve clarity, conciseness, and coherence, making them match the expression of native speakers."
	case store.ModeSummarize:
		p.RolePrompt = "You are a professional text summarizer, you can only summarize the text, don't interpret it."
		p.CommandPrompt = "Please summarize this text in the most concise language and must use " + tgtName + " language!"
	case store.ModeAnalyze:
		p.RolePrompt = "You are a professional translation engine and grammar analyzer."
		p.CommandPrompt = "Please translate this text to " + tgtName + " and explain the grammar in the original text using " + tgtName + "."
	case store.ModeExplainCode:
		p.RolePrompt = "You are a code explanation engine that can only explain code but not interpret or translate it. Also, please report bugs and errors (if any)."
		p.CommandPrompt = "explain the provided code, regex or script in the most concise language and must use " + tgtName + " language! You may use Markdown. If the content is not code, return an error message. If the code has obvious errors, point them out."
		content = "```\n" + q.Text + "\n```"
	}
	return finish(p, content)
}

func finish(p Prompt, content string) Prompt {
	if content != "" {
		p.CommandPrompt = "Only reply the result and nothing else. " + p.CommandPrompt + ":\n\n" + strings.TrimRightFunc(content, unicode.IsSpace)
	}
	return p
}

// ThinkingBudget maps a level to Claude thinking tokens.
func ThinkingBudget(level string) int {
	switch level {
	case "low":
		return 5000
	case "high":
		return 20000
	}
	return 10000
}

// Resolve picks the provider, model and thinking budget for q: the action's
// own, else the settings'.
func Resolve(q Query, s settings.Settings) (provider string, req engine.Request) {
	provider = s.Provider
	if q.ArticlePrompt == "" {
		if q.Action.Provider != "" {
			provider = q.Action.Provider
		}
		req.ModelOverride = q.Action.APIModel
	}
	if provider == engine.Claude {
		thinking, level := s.ClaudeThinking, s.ClaudeThinkingLevel
		if q.ArticlePrompt == "" {
			if q.Action.Thinking != nil {
				thinking = *q.Action.Thinking
			}
			if q.Action.ThinkingLevel != "" {
				level = q.Action.ThinkingLevel
			}
		}
		if thinking {
			req.ThinkingBudget = ThinkingBudget(level)
		}
	}
	return provider, req
}

// Result is the outcome of Run.
type Result struct {
	Provider string
	Model    string
	WordMode bool
	Reason   string
}

// Run builds the prompt for q and streams the answer to onText.
func Run(ctx context.Context, q Query, s settings.Settings, client *http.Client, onText func(string)) (Result, error) {
	p := Build(q)
	provider, req := Resolve(q, s)
	req.RolePrompt, req.CommandPrompt = p.RolePrompt, p.CommandPrompt
	res := Result{Provider: provider, WordMode: p.WordMode}
	e, err := engine.New(provider, s, client)
	if err != nil {
		return res, err
	}
	res.Model = req.ModelOverride
	if res.Model == "" {
		res.Model = e.Model()
	}
	res.Reason, err = e.Send(ctx, req, onText)
	return res, err
}
