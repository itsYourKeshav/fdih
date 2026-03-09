// FR-004, FR-005, FR-006, FR-007, FR-008

import path from 'path';
import { pool } from '../db/pool';
import { callClaude } from '../adapters/claudeClient';
import { downloadFile } from '../adapters/storageService';
import { ExtractionResponseSchema, cleanJsonText, FIELD_NAMES } from '../types';
import type { ExtractionResponse } from '../types';

const DEMO_ORG_ID = process.env.DEMO_ORG_ID!;

function serializeValue(val: string | string[] | null): string | null {
    if (val === null) return null;
    if (Array.isArray(val)) return JSON.stringify(val);
    return val;
}

function computeOverallConfidence(validated: ExtractionResponse): number {
    const scores = FIELD_NAMES.map(k => validated[k].confidence);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(mean * 100) / 100;
}

async function parseAndValidate(rawText: string): Promise<ExtractionResponse> {
    const cleaned = cleanJsonText(rawText);
    const parsed: unknown = JSON.parse(cleaned);   // throws SyntaxError if invalid
    return ExtractionResponseSchema.parse(parsed); // throws ZodError if invalid
}

export async function extractDocument(documentId: string): Promise<void> {
    const client = await pool.connect();
    try {
        // Step 1 — set status to processing
        await client.query(
            'UPDATE documents SET status=$1, updated_at=now() WHERE id=$2',
            ['processing', documentId]
        );

        // Step 2 — fetch document record
        const { rows } = await client.query<{
            file_path: string; document_type: string; original_filename: string;
        }>(
            'SELECT file_path, document_type, original_filename FROM documents WHERE id=$1',
            [documentId]
        );
        if (rows.length === 0) throw new Error(`Document ${documentId} not found`);
        const doc = rows[0];

        // Step 3 — download file from storage (S3 or local)
        const fileBuffer = await downloadFile(doc.file_path);

        // Step 4 — detect MIME from extension (already validated at upload)
        const ext = path.extname(doc.original_filename).toLowerCase();
        const mimeMap: Record<string, string> = {
            '.pdf': 'application/pdf', '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', '.png': 'image/png',
        };
        const mimeType = mimeMap[ext] ?? 'application/pdf';

        // Step 5+6 — call Claude with retry logic
        let validated: ExtractionResponse;
        try {
            const rawText = await callClaude(fileBuffer, mimeType, doc.document_type, false);
            validated = await parseAndValidate(rawText);
        } catch (firstError) {
            console.warn('First extraction attempt failed, retrying:', firstError);
            try {
                const rawText = await callClaude(fileBuffer, mimeType, doc.document_type, true);
                validated = await parseAndValidate(rawText);
            } catch (retryError) {
                console.error('Retry also failed:', retryError);
                await client.query(
                    'UPDATE documents SET status=$1, updated_at=now() WHERE id=$2',
                    ['failed', documentId]
                );
                return; // exit cleanly — do not throw
            }
        }

        // Step 7 — compute overall confidence
        const overallConfidence = computeOverallConfidence(validated);

        // Step 8 — write to DB in a transaction
        await client.query('BEGIN');
        try {
            await client.query(
                'UPDATE documents SET status=$1, overall_confidence=$2, updated_at=now() WHERE id=$3',
                ['review', overallConfidence, documentId]
            );

            for (const fieldName of FIELD_NAMES) {
                const field = validated[fieldName];
                const serialized = serializeValue(field.value);
                await client.query(
                    `INSERT INTO extracted_fields
           (document_id, org_id, field_name, ai_value, final_value, confidence, was_corrected)
           VALUES ($1, $2, $3, $4, $5, $6, false)`,
                    [documentId, DEMO_ORG_ID, fieldName, serialized, serialized, field.confidence]
                );
            }
            await client.query('COMMIT');
        } catch (txError) {
            await client.query('ROLLBACK');
            await client.query(
                'UPDATE documents SET status=$1, updated_at=now() WHERE id=$2',
                ['failed', documentId]
            );
            console.error('DB transaction failed during extraction:', txError);
        }
    } catch (outerError) {
        console.error('extractDocument outer error:', outerError);
        // Best-effort status update
        await pool.query(
            'UPDATE documents SET status=$1, updated_at=now() WHERE id=$2',
            ['failed', documentId]
        ).catch(() => { });
    } finally {
        client.release();
    }
}
