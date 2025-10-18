# UUID
924c91d7-0157-456c-9338-73e8b262f4c5

# Trigger
How does the LLM engine/provider system work? How are different AI providers integrated?

# Content
## Engine Architecture

The project uses a **pluggable engine architecture** to support multiple LLM providers.

## Core Concepts

### Engine Interface (`src/common/engines/interfaces.ts`)
All engines implement the `IEngine` interface, providing a consistent API:
```typescript
interface IEngine {
    sendMessage(params: {
        signal: AbortSignal
        rolePrompt: string
        commandPrompt: string
        onMessage: (message) => void
        onFinished: (reason) => void
        onError: (error) => void
        onStatusCode?: (statusCode) => void
    }): Promise<void>
}
```

### Provider Registry (`src/common/engines/index.ts`)
- **Provider Type**: Union type of all supported providers
- **providerToEngine**: Maps provider names to engine classes
- **getEngine()**: Factory function to instantiate engines

### Supported Providers
1. **OpenAI** - Direct OpenAI API
2. **ChatGPT** - ChatGPT specific implementation
3. **Azure** - Azure OpenAI Service
4. **Claude** - Anthropic's Claude
5. **Gemini** - Google's Gemini
6. **Moonshot** - Moonshot AI
7. **DeepSeek** - DeepSeek AI
8. **Groq** - Groq API
9. **Kimi** - Kimi AI
10. **ChatGLM** - ChatGLM
11. **Cohere** - Cohere API
12. **MiniMax** - MiniMax API
13. **Ollama** - Local Ollama instance

## Implementation Pattern

### Abstract Base Classes
- **AbstractEngine** (`abstract-engine.ts`): Base interface
- **AbstractOpenAI** (`abstract-openai.ts`): Shared OpenAI-compatible implementation
  - Used by OpenAI, Azure, Moonshot, DeepSeek, Groq, Claude (OpenAI-compatible APIs)

### Engine Responsibilities
1. **API Communication**: Handle HTTP requests to provider APIs
2. **Streaming**: Process streaming responses
3. **Error Handling**: Provider-specific error handling
4. **Message Formatting**: Convert prompts to provider-specific format
5. **Response Parsing**: Parse and normalize responses

## Settings Integration
Each engine reads configuration from `ISettings`:
- API keys
- API URLs and paths
- Model names
- Custom parameters

## Usage Flow
```
User Request
    ↓
translate() function (translate.ts)
    ↓
getSettings() - fetch user configuration
    ↓
getEngine(provider) - instantiate engine
    ↓
engine.sendMessage() - execute request
    ↓
Stream responses via callbacks
```