// AI Provider Interface - abstraction for multiple LLM providers

export interface AIProvider {
    /**
     * Extract structured data from a document using vision capabilities
     * @param fileBuffer - The document file as a buffer (PDF or image)
     * @param mimeType - MIME type of the file ('application/pdf', 'image/jpeg', 'image/png')
     * @param documentType - Type of document ('commercial_invoice', 'packing_list', 'bill_of_lading')
     * @param isRetry - Whether this is a retry attempt (adjusts prompt if needed)
     * @returns JSON string containing extracted data
     */
    extractData(
        fileBuffer: Buffer,
        mimeType: string,
        documentType: string,
        isRetry: boolean,
    ): Promise<string>;

    /**
     * Get the provider name for logging
     */
    getName(): string;
}

export const EXTRACTION_PROMPT = `You are a logistics document data extraction specialist.
Extract structured data from the document provided.
Document type: {DOCUMENT_TYPE}

Return ONLY a valid JSON object using exactly the structure below.
For each field: set "value" to the extracted content, or null if not found.
Set "confidence" to an integer 0-100 reflecting your certainty.

{
  "shipper_name":          { "value": "string or null", "confidence": 0-100 },
  "shipper_address":       { "value": "string or null", "confidence": 0-100 },
  "consignee_name":        { "value": "string or null", "confidence": 0-100 },
  "consignee_address":     { "value": "string or null", "confidence": 0-100 },
  "commodity_description": { "value": "string or null", "confidence": 0-100 },
  "quantity_and_units":    { "value": "string or null", "confidence": 0-100 },
  "gross_weight":          { "value": "string or null", "confidence": 0-100 },
  "net_weight":            { "value": "string or null", "confidence": 0-100 },
  "country_of_origin":     { "value": "string or null", "confidence": 0-100 },
  "declared_value":        { "value": "string or null", "confidence": 0-100 },
  "currency":              { "value": "string or null", "confidence": 0-100 },
  "incoterms":             { "value": "string or null", "confidence": 0-100 },
  "document_date":         { "value": "string or null", "confidence": 0-100 },
  "reference_numbers":     { "value": ["array","of","strings"] or null, "confidence": 0-100 }
}

Output the JSON object only. No markdown, no explanation, no code fences.`;

const RETRY_PROMPT_SUFFIX = `\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the raw JSON object. No markdown fences, no explanation.`;

/**
 * Get the appropriate AI provider based on environment configuration
 */
export function getAIProvider(): AIProvider {
    const provider = (process.env.AI_PROVIDER ?? 'claude').toLowerCase();

    switch (provider) {
        case 'gemini':
            return new GeminiProvider();
        case 'modal':
            return new ModalProvider();
        case 'claude':
        default:
            return new ClaudeProvider();
    }
}

/**
 * Claude provider using Anthropic SDK
 */
class ClaudeProvider implements AIProvider {
    private client: any;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Anthropic = require('@anthropic-ai/sdk').default;
        this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }

    async extractData(
        fileBuffer: Buffer,
        mimeType: string,
        documentType: string,
        isRetry: boolean,
    ): Promise<string> {
        const prompt = EXTRACTION_PROMPT.replace('{DOCUMENT_TYPE}', documentType)
            + (isRetry ? RETRY_PROMPT_SUFFIX : '');

        let fileContent: any;
        if (mimeType === 'application/pdf') {
            fileContent = {
                type: 'document',
                source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: fileBuffer.toString('base64'),
                },
            };
        } else {
            fileContent = {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: fileBuffer.toString('base64'),
                },
            };
        }

        const response = await this.client.messages.create({
            model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5-20250929',
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: [fileContent, { type: 'text', text: prompt }],
            }],
        });

        const text = response.content.find((b: any) => b.type === 'text');
        if (!text || text.type !== 'text') throw new Error('No text in Claude response');
        return text.text;
    }

    getName(): string {
        return 'Claude (Anthropic)';
    }
}

/**
 * Google Gemini provider
 */
class GeminiProvider implements AIProvider {
    private client: any;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    }

    async extractData(
        fileBuffer: Buffer,
        mimeType: string,
        documentType: string,
        isRetry: boolean,
    ): Promise<string> {
        const prompt = EXTRACTION_PROMPT.replace('{DOCUMENT_TYPE}', documentType)
            + (isRetry ? RETRY_PROMPT_SUFFIX : '');

        const model = this.client.getGenerativeModel({
            model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
        });

        const base64Data = fileBuffer.toString('base64');
        const content = [
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                },
            },
            {
                text: prompt,
            },
        ];

        const response = await model.generateContent(content);
        const result = await response.response;
        const text = result.text();

        if (!text) throw new Error('No text in Gemini response');
        return text;
    }

    getName(): string {
        return 'Gemini (Google)';
    }
}

/**
 * Modal provider - serverless function execution
 * Posts the document and extraction task to a Modal endpoint
 */
class ModalProvider implements AIProvider {
    constructor() {
        if (!process.env.MODAL_ENDPOINT) {
            throw new Error('MODAL_ENDPOINT environment variable is required for Modal provider');
        }
    }

    async extractData(
        fileBuffer: Buffer,
        mimeType: string,
        documentType: string,
        isRetry: boolean,
    ): Promise<string> {
        const prompt = EXTRACTION_PROMPT.replace('{DOCUMENT_TYPE}', documentType)
            + (isRetry ? RETRY_PROMPT_SUFFIX : '');

        const base64Data = fileBuffer.toString('base64');

        // Set up timeout with AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

        try {
            const response = await fetch(process.env.MODAL_ENDPOINT!, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.MODAL_TOKEN || ''}`,
                },
                body: JSON.stringify({
                    document_base64: base64Data,
                    mime_type: mimeType,
                    prompt: prompt,
                    document_type: documentType,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Modal API error: ${response.status} - ${error}`);
            }

            const data: any = await response.json();
            if (data.error) throw new Error(`Modal extraction error: ${data.error}`);
            if (!data.result) throw new Error('No result in Modal response');

            return data.result;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    getName(): string {
        return 'Modal (Serverless)';
    }
}
