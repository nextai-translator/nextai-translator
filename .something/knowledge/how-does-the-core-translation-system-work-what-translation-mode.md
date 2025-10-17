# UUID
2e8303ca-61be-421a-b4a9-18d29b5448b7

# Trigger
How does the core translation system work? What translation modes are supported?

# Content
## Translation System

The core translation logic is in `src/common/translate.ts`, providing intelligent translation capabilities.

## Translation Modes

1. **translate** - Standard translation between languages
2. **polishing** - Improve text clarity and grammar
3. **summarize** - Summarize text content
4. **analyze** - Translate and provide grammar analysis
5. **explain-code** - Explain code snippets
6. **big-bang** - Generate articles from given words

## Key Features

### Intelligent Word Detection
- Uses `Intl.Segmenter` to detect single words
- Provides detailed word information:
  - Phonetic notation/transcription
  - Multiple meanings with parts of speech
  - Bilingual examples (3+ sentences)
  - Etymology
  - Original form

### Chinese Language Special Handling
When translating to Chinese (`zh-Hans`, `zh-Hant`, `lzh`, `yue`):
- Short queries (<5 chars) get multiple translation options with context
- Single words get comprehensive dictionary-style results
- Includes usage context and examples

### Selected Word Context
When a word is selected within a sentence:
- Explains the word's meaning in context
- Provides sentence translation
- Identifies idioms if applicable
- Offers 3-5 similar usage examples

## Quote Processing System

**QuoteProcessor class** handles streaming response filtering:
- Removes XML-like quote tags from LLM output
- Processes text character-by-character in streaming mode
- Uses UUID-based unique quote markers
- Handles incomplete quote boundaries across stream chunks

## Prompt Construction

### Role Prompts
Define the LLM's role (e.g., "professional translator", "text summarizer")

### Command Prompts
Specific instructions for the task, including:
- Source and target languages
- Output format requirements
- Task-specific guidelines

### Content Prompts
The actual text to process

## Translation Flow

```
User selects text + mode
    ↓
Build prompts based on:
  - Translation mode
  - Language pair
  - Text characteristics (word vs sentence)
  - Special cases (selected word, Chinese target, etc.)
    ↓
Execute via engine
    ↓
Stream results through QuoteProcessor
    ↓
Display formatted output
```

## Language Configuration
- Language names and codes in `src/common/lang/`
- Per-language role prompts
- Phonetic notation systems (IPA, pinyin, etc.)
- Language-specific formatting rules