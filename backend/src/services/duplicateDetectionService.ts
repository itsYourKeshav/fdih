import { pool } from '../db/pool';

const DEMO_ORG_ID = process.env.DEMO_ORG_ID!;

const DUP_FIELDS = [
    'shipper_name',
    'consignee_name',
    'declared_value',
    'document_date',
    'reference_numbers',
] as const;

type DupField = typeof DUP_FIELDS[number];

interface FieldMap {
    [field: string]: string | null;
}

function normalise(val: string | null): string | null {
    if (!val || val.trim() === '') return null;
    return val.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normaliseNumeric(val: string | null): string | null {
    if (!val) return null;
    const n = parseFloat(val.replace(/[^0-9.]/g, ''));
    return Number.isNaN(n) ? null : String(n);
}

function normaliseRefs(val: string | null): string | null {
    if (!val) return null;
    try {
        const arr: string[] = JSON.parse(val);
        return arr.map(r => r.toLowerCase().replace(/[^a-z0-9]/g, '')).sort().join('|');
    } catch {
        return val.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
}

function normaliseField(field: DupField, raw: string | null): string | null {
    if (field === 'declared_value') return normaliseNumeric(raw);
    if (field === 'reference_numbers') return normaliseRefs(raw);
    if (field === 'document_date') {
        const digits = (raw ?? '').replace(/[^0-9]/g, '');
        return digits.length >= 6 ? digits.slice(0, 8) : null;
    }
    return normalise(raw);
}

async function getFieldMap(documentId: string): Promise<FieldMap> {
    const { rows } = await pool.query(
        `SELECT field_name, final_value FROM extracted_fields
         WHERE document_id = $1 AND field_name = ANY($2)`,
        [documentId, DUP_FIELDS]
    );

    const map: FieldMap = {};
    for (const row of rows) {
        map[row.field_name as string] = normaliseField(
            row.field_name as DupField,
            row.final_value as string | null
        );
    }

    return map;
}

function countMatches(a: FieldMap, b: FieldMap): number {
    let score = 0;
    for (const field of DUP_FIELDS) {
        const av = a[field];
        const bv = b[field];
        if (av && bv && av === bv) score++;
    }
    return score;
}

export async function runDuplicateCheck(documentId: string): Promise<void> {
    try {
        const newDocFields = await getFieldMap(documentId);

        const { rows: candidates } = await pool.query(
            `SELECT id FROM documents
             WHERE org_id = $1 AND status = 'approved' AND id != $2
             ORDER BY uploaded_at DESC LIMIT 200`,
            [DEMO_ORG_ID, documentId]
        );

        let bestMatch: string | null = null;
        let bestScore = 0;

        for (const candidate of candidates) {
            const fields = await getFieldMap(candidate.id as string);
            const score = countMatches(newDocFields, fields);
            if (score >= 3 && score > bestScore) {
                bestScore = score;
                bestMatch = candidate.id as string;
            }
        }

        await pool.query(
            `UPDATE documents
             SET duplicate_check_run = true,
                 potential_duplicate_of = $1,
                 updated_at = now()
             WHERE id = $2`,
            [bestMatch, documentId]
        );
    } catch (err) {
        console.error('Duplicate check failed (non-blocking):', err);
        await pool.query(
            'UPDATE documents SET duplicate_check_run = true WHERE id = $1',
            [documentId]
        ).catch(() => { });
    }
}