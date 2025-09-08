# OpenAI Configuration & Budget Guard

## Overview

The app now supports configurable OpenAI models with built-in budget guards to prevent expensive API calls.

## Environment Variables

### Required
- `OPENAI_API_KEY` - Your OpenAI API key (existing, preserved)

### Optional (with fallbacks)
- `OPENAI_MODEL` - Default model to use (fallback: `gpt-4o-mini`)
- `OPENAI_HARD_LIMIT_USD` - Maximum cost per request in USD (fallback: `1.00`)

## Supported Models

- `gpt-4o-mini` - Budget option (recommended)
- `gpt-4o` - Highest quality
- `gpt-4-turbo` - Balanced performance
- `gpt-3.5-turbo` - Legacy option

## Per-Request Model Override

Send requests with custom model:

```json
{
  "input": { "type": "text", "text": "Hello world" },
  "settings": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "tone": "neutral"
  }
}
```

## Budget Guard

- Automatically estimates token usage and cost before API calls
- Throws `COST_LIMIT` error if estimated cost exceeds limit
- Prevents expensive operations without breaking the UI
- Works for both sync and streaming endpoints

## Error Handling

Cost limit errors return:
```json
{
  "error": "Estimated cost $2.50 exceeds limit $1.00.",
  "code": "COST_LIMIT"
}
```

## Configuration

Change limits without code changes by updating `.env.local`:

```bash
OPENAI_MODEL="gpt-4o"
OPENAI_HARD_LIMIT_USD="5.00"
```

## Implementation Details

- Budget guard applied to both `/api/translate` and `/api/translate/stream`
- Existing UI and business logic unchanged
- Graceful fallback to original text if translation fails (non-cost errors)
- Cost estimation uses ~0.25 tokens per character (rough approximation)
