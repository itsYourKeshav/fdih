import { getAIProvider } from './aiProvider';

/**
 * DEPRECATED: Use getAIProvider() from aiProvider.ts instead.
 * Kept for backward compatibility.
 * 
 * Calls the configured AI provider to extract data from a document.
 */
export async function callClaude(
    fileBuffer: Buffer,
    mimeType: string,
    documentType: string,
    isRetry = false,
): Promise<string> {
    const provider = getAIProvider();
    return provider.extractData(fileBuffer, mimeType, documentType, isRetry);
}
