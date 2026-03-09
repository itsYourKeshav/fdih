// FR-010, FR-013

import { pool } from '../db/pool';

const DEMO_ORG_ID = process.env.DEMO_ORG_ID!;

export interface ReviewField {
    field_name: string;
    final_value: string;
}

export async function saveReview(
    documentId: string,
    fields: ReviewField[],
): Promise<void> {
    const client = await pool.connect();
    try {
        // Fetch current ai_values for comparison
        const { rows: currentFields } = await client.query<{
            field_name: string; ai_value: string | null;
        }>(
            'SELECT field_name, ai_value FROM extracted_fields WHERE document_id=$1',
            [documentId]
        );
        const aiMap = new Map(currentFields.map(r => [r.field_name, r.ai_value]));

        await client.query('BEGIN');

        for (const { field_name, final_value } of fields) {
            const aiValue = aiMap.get(field_name) ?? null;
            const wasCorrected = final_value !== (aiValue ?? '');

            // Update extracted_fields with final value
            await client.query(
                `UPDATE extracted_fields
         SET final_value=$1, was_corrected=$2
         WHERE document_id=$3 AND field_name=$4`,
                [final_value || null, wasCorrected, documentId, field_name]
            );

            // Insert correction history row only if value actually changed
            if (wasCorrected) {
                // IMMUTABLE: INSERT only — never UPDATE or DELETE correction_history
                await client.query(
                    `INSERT INTO correction_history
           (document_id, org_id, field_name, ai_value, corrected_value)
           VALUES ($1, $2, $3, $4, $5)`,
                    [documentId, DEMO_ORG_ID, field_name, aiValue, final_value]
                );
            }
        }

        // Set document status to approved
        await client.query(
            'UPDATE documents SET status=$1, updated_at=now() WHERE id=$2',
            ['approved', documentId]
        );

        await client.query('COMMIT');
    } catch (err) {
        console.error('saveReview error:', err);
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
