// All FR references noted per handler

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';
import { uploadMiddleware, validateMimeByBytes } from '../middleware/upload';
import { extractDocument } from '../services/extractionService';
import { saveReview } from '../services/correctionService';
import { ValidationError, NotFoundError } from '../errors/AppError';
import { uploadFile, downloadFile } from '../adapters/storageService';
import type { ReviewField } from '../services/correctionService';

const router = express.Router();
const DEMO_ORG_ID = process.env.DEMO_ORG_ID!;

const VALID_DOC_TYPES = ['commercial_invoice', 'packing_list', 'bill_of_lading'];

// Helper: sanitise filename
function sanitiseFilename(name: string): string {
    return name.replace(/[./\\]/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '_').substring(0, 200);
}

// ──  POST /api/documents/upload  [FR-001, FR-002, FR-003, FR-004]  ──────────
router.post('/upload', (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, async (multerErr) => {
        try {
            // Handle multer errors (413, invalid type)
            if (multerErr) {
                if ((multerErr as { code?: string }).code === 'LIMIT_FILE_SIZE') {
                    res.status(413).json({ error: 'File too large. Maximum size is 20 MB.' });
                    return;
                }
                next(multerErr);
                return;
            }

            if (!req.file) {
                res.status(400).json({ error: 'No file provided.' });
                return;
            }

            // Validate document_type [FR-002]
            const documentType = req.body.document_type as string;
            if (!documentType || !VALID_DOC_TYPES.includes(documentType)) {
                res.status(400).json({ error: 'document_type must be one of: ' + VALID_DOC_TYPES.join(', ') });
                return;
            }

            // Magic-byte MIME validation [FR-001]
            if (!validateMimeByBytes(req.file.buffer, req.file.mimetype)) {
                res.status(400).json({ error: 'File content does not match declared MIME type.' });
                return;
            }

            // Upload file to storage (S3 or local) [FR-003]
            const documentId = uuidv4();
            const sanitised = sanitiseFilename(req.file.originalname);
            const fileKey = `${documentId}/${sanitised}`;

            await uploadFile(fileKey, req.file.buffer, req.file.mimetype);

            // Create document record
            await pool.query(
                `INSERT INTO documents (id, org_id, document_type, status, file_path, original_filename)
         VALUES ($1, $2, $3, 'pending', $4, $5)`,
                [documentId, DEMO_ORG_ID, documentType, fileKey, req.file.originalname]
            );

            // Fire-and-forget extraction [FR-004]
            void extractDocument(documentId);

            res.status(201).json({ documentId, status: 'processing' });
        } catch (err) {
            next(err);
        }
    });
});

// ──  GET /api/documents/:id/status  [FR-007]  ───────────────────────────────
router.get('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { rows } = await pool.query<{ status: string }>(
            'SELECT status FROM documents WHERE id=$1 AND org_id=$2',
            [req.params.id, DEMO_ORG_ID]
        );
        if (rows.length === 0) throw new NotFoundError('Document not found');
        res.json({ status: rows[0].status });
    } catch (err) { next(err); }
});

// ──  GET /api/documents/:id  [FR-019]  ─────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { rows: docs } = await pool.query(
            'SELECT * FROM documents WHERE id=$1 AND org_id=$2',
            [req.params.id, DEMO_ORG_ID]
        );
        if (docs.length === 0) throw new NotFoundError('Document not found');

        const { rows: fields } = await pool.query(
            'SELECT * FROM extracted_fields WHERE document_id=$1 ORDER BY field_name',
            [req.params.id]
        );
        const { rows: history } = await pool.query(
            'SELECT * FROM correction_history WHERE document_id=$1 ORDER BY corrected_at DESC',
            [req.params.id]
        );
        res.json({ document: docs[0], fields, history });
    } catch (err) { next(err); }
});

// ──  GET /api/documents/:id/file  [FR-022]  ────────────────────────────────
router.get('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { rows } = await pool.query<{ file_path: string; original_filename: string }>(
            'SELECT file_path, original_filename FROM documents WHERE id=$1 AND org_id=$2',
            [req.params.id, DEMO_ORG_ID]
        );
        if (rows.length === 0) throw new NotFoundError('Document not found');

        const fileBuffer = await downloadFile(rows[0].file_path);

        const ext = path.extname(rows[0].original_filename).toLowerCase();
        const mimeMap: Record<string, string> = {
            '.pdf': 'application/pdf', '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', '.png': 'image/png',
        };
        const mime = mimeMap[ext] ?? 'application/octet-stream';

        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', 'inline');
        res.send(fileBuffer);
    } catch (err) { next(err); }
});

// ──  PUT /api/documents/:id/review  [FR-010]  ───────────────────────────────
router.put('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { fields } = req.body as { fields: ReviewField[] };
        if (!Array.isArray(fields) || fields.length === 0) {
            throw new ValidationError('fields array is required');
        }

        // Verify document exists and belongs to demo org
        const { rows } = await pool.query(
            'SELECT id, status FROM documents WHERE id=$1 AND org_id=$2',
            [req.params.id, DEMO_ORG_ID]
        );
        if (rows.length === 0) throw new NotFoundError('Document not found');

        await saveReview(req.params.id, fields);
        res.json({ documentId: req.params.id, status: 'approved' });
    } catch (err) { next(err); }
});

// ──  DELETE /api/documents/:id  ────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { rows } = await pool.query(
            'SELECT id FROM documents WHERE id=$1 AND org_id=$2',
            [req.params.id, DEMO_ORG_ID]
        );
        if (rows.length === 0) throw new NotFoundError('Document not found');

        // Delete related records (cascade)
        await pool.query('DELETE FROM correction_history WHERE document_id=$1', [req.params.id]);
        await pool.query('DELETE FROM extracted_fields WHERE document_id=$1', [req.params.id]);
        await pool.query('DELETE FROM documents WHERE id=$1', [req.params.id]);

        res.json({ message: 'Document deleted successfully' });
    } catch (err) { next(err); }
});

// ──  GET /api/documents  [FR-016, FR-017, FR-018]  ─────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            q, type, date_from, date_to, country,
            page = '1', limit = '20',
        } = req.query as Record<string, string>;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        const conditions: string[] = ['d.org_id = $1'];
        const params: (string | number)[] = [DEMO_ORG_ID];
        let paramIdx = 2;

        if (type && VALID_DOC_TYPES.includes(type)) {
            conditions.push(`d.document_type = $${paramIdx++}`);
            params.push(type);
        }
        if (date_from) {
            conditions.push(`d.uploaded_at >= $${paramIdx++}`);
            params.push(date_from);
        }
        if (date_to) {
            conditions.push(`d.uploaded_at <= $${paramIdx++}`);
            params.push(date_to + 'T23:59:59Z');
        }
        if (country) {
            conditions.push(
                `d.id IN (SELECT document_id FROM extracted_fields WHERE field_name='country_of_origin' AND LOWER(final_value)=LOWER($${paramIdx++}))`
            );
            params.push(country);
        }
        if (q) {
            const pattern = `%${q}%`;
            conditions.push(
                `d.id IN (SELECT document_id FROM extracted_fields WHERE field_name IN ('shipper_name','consignee_name','commodity_description','reference_numbers') AND final_value ILIKE $${paramIdx++})`
            );
            params.push(pattern);
        }

        const whereClause = conditions.join(' AND ');

        const baseQuery = `
      SELECT d.id, d.document_type, d.status, d.overall_confidence,
             d.uploaded_at, d.original_filename,
             MAX(CASE WHEN ef.field_name='reference_numbers' THEN ef.final_value END) AS reference_numbers,
             MAX(CASE WHEN ef.field_name='shipper_name'      THEN ef.final_value END) AS shipper_name,
             MAX(CASE WHEN ef.field_name='consignee_name'    THEN ef.final_value END) AS consignee_name
      FROM documents d
      LEFT JOIN extracted_fields ef ON ef.document_id = d.id
      WHERE ${whereClause}
      GROUP BY d.id
      ORDER BY d.uploaded_at DESC
    `;

        const countQuery = `SELECT COUNT(*) AS total FROM documents d WHERE ${whereClause}`;

        const [listResult, countResult] = await Promise.all([
            pool.query(baseQuery + ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
                [...params, limitNum, offset]),
            pool.query(countQuery, params),
        ]);

        const total = parseInt(countResult.rows[0].total, 10);
        res.json({
            documents: listResult.rows,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) { next(err); }
});

export default router;
