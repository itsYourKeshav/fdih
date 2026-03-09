import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are a logistics document data extraction specialist.
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

const RETRY_PROMPT_SUFFIX =
    '\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the raw JSON object. No markdown fences, no explanation.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlock = any;

export async function callClaude(
    fileBuffer: Buffer,
    mimeType: string,
    documentType: string,
    isRetry = false,
): Promise<string> {
    const prompt = EXTRACTION_PROMPT.replace('{DOCUMENT_TYPE}', documentType)
        + (isRetry ? RETRY_PROMPT_SUFFIX : '');

    let fileContent: AnyBlock;
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

    const response = await client.messages.create({
        model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{
            role: 'user',
            // The SDK types are strict about content blocks. We cast via unknown.
            content: [fileContent, { type: 'text', text: prompt }] as Anthropic.MessageParam['content'],
        }],
    });

    const text = response.content.find(b => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('No text in Claude response');
    return text.text;
}
