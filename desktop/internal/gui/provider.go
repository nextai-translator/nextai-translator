package gui

import "github.com/nextai-translator/nextai-translator/desktop/internal/engine"

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
