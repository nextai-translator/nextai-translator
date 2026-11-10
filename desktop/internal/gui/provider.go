package gui

import (
	"embed"
	"regexp"

	"github.com/egoist/mygo/ui"
	"github.com/nextai-translator/nextai-translator/desktop/internal/engine"
)

// providerLabel is a provider's name in the menus, as the Tauri app shows it.
func providerLabel(p string) string {
	switch p {
	case engine.Kimi:
		return "Kimi (" + T("Free") + ")"
	case engine.ChatGLM:
		return T("ChatGLM") + " (" + T("Free") + ")"
	case engine.Ollama:
		return "Ollama (" + T("Local Model") + ")"
	case engine.ChatGPT:
		return "ChatGPT (Web)"
	}
	return p
}

func providerLabels() []string {
	out := make([]string, len(engine.Providers))
	for i, p := range engine.Providers {
		out[i] = providerLabel(p)
	}
	return out
}

//go:embed assets/providers
var providerAssets embed.FS

// providerImages are the providers' logos in their own colors, as the
// Tauri app's provider menu shows them; a logo MyGo cannot read is left
// out.
// providerImages holds the provider logos. As the Tauri app's icon
// components do, the SVGs draw their paths in the text color (Claude's
// square in the text color, its mark in the window's), and Moonshot is a
// picture per theme.
var providerImages = func() map[string]ui.ImageSource {
	out := map[string]ui.ImageSource{}
	add := func(key string, data []byte) {
		if s, err := ui.ParseSVG(data); err == nil {
			out[key] = s
		}
	}
	for p, file := range map[string]string{
		engine.Kimi: "kimi.svg", engine.ChatGLM: "chatglm.svg",
		engine.Cohere: "cohere.svg", engine.Groq: "groq.svg", engine.OpenRouter: "openrouter.svg",
		engine.TeamoRouter: "teamorouter.svg", engine.DeepSeek: "deepseek.svg", engine.Ollama: "ollama.svg",
		engine.Cerebras: "cerebras.svg",
	} {
		if data, err := providerAssets.ReadFile("assets/providers/" + file); err == nil {
			add(p, recolor(data, "path", "currentColor"))
		}
	}
	if data, err := providerAssets.ReadFile("assets/providers/claude.svg"); err == nil {
		// An Image has no text color: spell the theme's out.
		add(engine.Claude+"-light", recolor(recolor(data, "rect", "#000000"), "path", "#ffffff"))
		add(engine.Claude+"-dark", recolor(recolor(data, "rect", "#ffffff"), "path", "#141414"))
	}
	for _, theme := range []string{"light", "dark"} {
		data, _ := providerAssets.ReadFile("assets/providers/moonshot-" + theme + ".png")
		if b, err := ui.DecodeBitmap(data); err == nil {
			out[engine.Moonshot+"-"+theme] = b
		}
	}
	return out
}()

var (
	svgStyle = regexp.MustCompile(`(?s)<style.*?</style>`)
	svgPaint = regexp.MustCompile(`\s(?:fill|class)="[^"]*"`)
)

// recolor fills every tag element of an SVG with fill, over its own fill
// and class, as a CSS rule "tag { fill: … }" would.
func recolor(data []byte, tag, fill string) []byte {
	data = svgStyle.ReplaceAll(data, nil)
	tagRe := regexp.MustCompile(`<` + tag + `\b[^>]*>`)
	return tagRe.ReplaceAllFunc(data, func(t []byte) []byte {
		t = svgPaint.ReplaceAll(t, nil)
		return append([]byte("<"+tag+` fill="`+fill+`"`), t[len(tag)+1:]...)
	})
}

// providerIcon draws a provider's 10px icon.
func providerIcon(c *ui.Context, p palette, provider string) {
	const size = 10
	switch provider {
	case engine.OpenAI, engine.ChatGPT:
		ui.Icon(c, riRiOpenaiFill).Size(size, size)
		return
	case engine.Azure:
		ui.Icon(c, riVscAzureDevops).Size(size, size)
		return
	case engine.MiniMax:
		ui.Icon(c, riGiArtificialIntelligence).Size(size, size)
		return
	case engine.Gemini:
		ui.Icon(c, riFaGoogle).Size(size, size)
		return
	case engine.LiteLLM:
		ui.Text(c, "🚅").FontSize(12)
		return
	case engine.Moonshot, engine.Claude:
		theme := "light"
		if p.dark {
			theme = "dark"
		}
		provider += "-" + theme
	}
	switch img := providerImages[provider].(type) {
	case *ui.SVG:
		if provider == engine.Claude+"-light" || provider == engine.Claude+"-dark" {
			ui.Image(c, img).Size(size, size).Fit(ui.Contain)
		} else {
			ui.Icon(c, img).Size(size, size)
		}
		return
	case *ui.Bitmap:
		ui.Image(c, img).Size(size, size).Fit(ui.Contain)
		return
	}
	ui.Box(c).Size(size, size)
}
