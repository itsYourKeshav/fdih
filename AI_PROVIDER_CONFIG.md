# AI Provider Configuration Guide

FDIH now supports multiple AI providers for document extraction. The system uses a provider interface that makes it easy to swap between different LLM services.

## Supported Providers

### 1. Claude (Anthropic) - Default
The default and recommended provider. Uses Claude's vision capabilities for document analysis.

**Environment Variables:**
```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your_anthropic_api_key
CLAUDE_MODEL=claude-sonnet-4-5-20250929  # Optional, defaults shown
```

**Features:**
- Excellent accuracy on logistics documents
- Reliable PDF and image handling
- Built-in retry logic

**Get API Key:** https://console.anthropic.com

---

### 2. Google Gemini
Google's generative AI model with strong vision capabilities.

**Environment Variables:**
```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your_google_api_key
GEMINI_MODEL=gemini-2.0-flash  # Optional, defaults shown
```

**Features:**
- Fast inference
- Good for both PDFs and images
- Competitive pricing

**Get API Key:** https://ai.google.dev

**Install Dependency:**
```bash
cd backend
npm install @google/generative-ai
```

---

### 3. Modal (Serverless Execution)
Deploy custom extraction logic on Modal's serverless platform.

**Environment Variables:**
```bash
AI_PROVIDER=modal
MODAL_ENDPOINT=https://your-workspace--your-function.modal.run
MODAL_TOKEN=your_modal_token  # Optional, for authentication
```

**Features:**
- Custom extraction logic
- Scalable serverless execution
- Can use any model (Claude, Gemini, open-source, etc.)

**Setup Instructions:**

1. Create a Modal account at https://modal.com
2. Create a Python function that accepts:
   ```python
   POST body: {
       "document_base64": str,
       "mime_type": str,
       "prompt": str,
       "document_type": str
   }
   ```
3. Return a JSON response:
   ```json
   {
       "result": "extracted JSON string",
       "error": null  // or error message if failed
   }
   ```
4. Deploy and copy the function URL to `MODAL_ENDPOINT`

**Example Modal Function (Python):**
```python
import json
from anthropic import Anthropic
import modal

app = modal.App(name="fdih-extractor")

@app.function()
@modal.web_endpoint(method="POST")
def extract_document(request):
    data = request.json()
    base64_data = data["document_base64"]
    mime_type = data["mime_type"]
    prompt = data["prompt"]
    
    client = Anthropic()
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": base64_data,
                    }
                },
                {"type": "text", "text": prompt}
            ]
        }]
    )
    
    return {
        "result": message.content[0].text,
        "error": None
    }
```

---

## Switching Providers

1. Set `AI_PROVIDER` environment variable to one of: `claude`, `gemini`, `modal`
2. Provide the required API keys/endpoints
3. Restart the backend server
4. No code changes needed!

**Example .env for Gemini:**
```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash
STORAGE_TYPE=s3
AWS_ENDPOINT=...
# ... other vars
```

---

## Cost Comparison (as of Mar 2026)

| Provider | Input Cost | Output Cost | Notes |
|----------|-----------|------------|-------|
| Claude (Sonnet) | $3/1M tokens | $15/1M tokens | High accuracy, recommended |
| Gemini Flash | $0.075/1M tokens | $0.30/1M tokens | Fast, budget-friendly |
| Modal | Custom | Custom | Depends on base model + infrastructure |

---

## Performance Notes

- **Claude:** ~8-15 seconds per document
- **Gemini:** ~5-10 seconds per document  
- **Modal:** Varies based on custom implementation

---

## Fallback & Retry Strategy

All providers use the same retry mechanism:
1. First attempt with standard prompt
2. If JSON parsing fails, retry with explicit JSON-only prompt
3. If both fail, document marked as `failed` status
4. Users can trigger manual retry from UI

---

## Adding a New Provider

To add a new provider:

1. Create a class implementing `AIProvider` interface in `backend/src/adapters/aiProvider.ts`
2. Implement `extractData()` and `getName()` methods
3. Add provider case to `getAIProvider()` function
4. Update this documentation

Example:
```typescript
class NewProviderName implements AIProvider {
    async extractData(
        fileBuffer: Buffer,
        mimeType: string,
        documentType: string,
        isRetry: boolean,
    ): Promise<string> {
        // Implementation here
    }

    getName(): string {
        return 'Provider Name';
    }
}
```

---

## Troubleshooting

**Provider not initializing:**
- Check `AI_PROVIDER` environment variable is set correctly (case-insensitive)
- Verify API keys/tokens are valid
- Check logs for provider-specific errors

**Extraction failing:**
- Review error message in document detail page
- Use "Retry Extraction" button to attempt again
- Check API quota/limits

**Modal connection issues:**
- Verify `MODAL_ENDPOINT` is accessible
- Add `MODAL_TOKEN` if endpoint requires authentication
- Check network connectivity

