# UUID
9784d98a-2069-4d34-8940-4413cf949203

# Trigger
What is nextai translator? What does this project do? What is the overall architecture?

# Content
## Project Overview

**nextai translator** (formerly OpenAI Translator) is a multi-platform translation tool that provides translation, text polishing, and summarization capabilities using AI language models.

## Key Characteristics

1. **Multi-Platform Support**
   - Browser extensions (Chrome, Firefox)
   - Desktop applications (Windows, macOS, Linux) via Tauri
   - Userscript version
   - Clip extensions (PopClip, Snipdo)

2. **Core Features**
   - Translation between 55+ languages
   - Text polishing/editing
   - Text summarization
   - Code explanation
   - Text-to-Speech (TTS)
   - Screenshot translation (OCR)
   - Vocabulary book with memory aids

3. **AI Provider Support**
   - Multiple LLM providers: OpenAI, ChatGPT, Azure OpenAI, Claude, Gemini, Moonshot, DeepSeek, Groq, Kimi, ChatGLM, Cohere, MiniMax, Ollama
   - Streaming response support
   - Customizable API endpoints

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Jotai, Zustand, React Hooks
- **UI Framework**: BaseUI with Styletron
- **Build Tools**: Vite
- **Desktop Framework**: Tauri 2.0 (Rust backend)
- **Browser Extension**: Web Extension API with polyfills
- **Testing**: Vitest, Playwright

## Architecture Pattern

The project follows a **modular, multi-target architecture**:

1. **Shared Common Layer** (`src/common/`) - Core business logic shared across all platforms
2. **Platform-Specific Layers**:
   - `src/tauri/` - Desktop application (Tauri)
   - `src/browser-extension/` - Browser extensions
3. **Rust Backend** (`src-tauri/`) - Native desktop functionality via Tauri