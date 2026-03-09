# FDIH — Master Build Prompt
# Aulintri Freight Document Intelligence Hub
# Assignment brief scope only. Paste once into Copilot Chat (@workspace).
# =========================================================================

---

## HOW TO USE

1. Place all 3 reference documents in your project root before starting:
   - `1_SRS_FDIH.docx`
   - `2_Architecture_FDIH.docx`
   - `3_UISpec_FDIH.docx`

2. Open VS Code → Copilot Chat → type `@workspace`

3. Paste **everything between the triple-backtick markers** below.

4. Let Copilot complete all sections in order. Do not interrupt between sections.

5. When done, run the **Definition of Done checklist** at the end of this file.

---

```
@workspace

You are building the Aulintri Freight Document Intelligence Hub (FDIH).
Read ALL three reference documents (1_SRS_FDIH.docx, 2_Architecture_FDIH.docx, 3_UISpec_FDIH.docx)
before writing any code. Everything you need is in them.

HARD CONSTRAINTS — read these before anything else:
1. NO authentication. No login screen. No JWT. No session. All routes are open.
2. ONE demo org. org_id is ALWAYS process.env.DEMO_ORG_ID. Never from request body.
3. LOCAL file storage only. No S3. No storage abstraction layer.
4. NO monorepo workspaces. Two separate npm packages: backend/ and frontend/.
5. NO shared types package. Frontend defines its own TypeScript interfaces in lib/types.ts.
6. TypeScript strict mode in both packages. No `any` types.
7. Zod validates every Claude response before any DB write.
8. correction_history is append-only. Never UPDATE or DELETE it.
9. Fire-and-forget extraction. Upload route does NOT await extractionService.

Build ALL sections below in order. Do not skip any section.
Do not ask for confirmation between sections.
Reference the FR number in a comment on every route handler and service method.

═══════════════════════════════════════════════════════════════
SECTION 0 — ROOT SCAFFOLD
═══════════════════════════════════════════════════════════════

Create the following files at the project root:

--- .env.example ---
DATABASE_URL=postgresql://fdih_user:fdih_password@localhost:5432/fdih_dev
ANTHROPIC_API_KEY=sk-ant-replace-me
CLAUDE_MODEL=claude-sonnet-4-5-20250929
UPLOAD_DIR=./uploads
DEMO_ORG_ID=00000000-0000-0000-0000-000000000001
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001

--- docker-compose.yml ---
version: '3.8'
services:
  postgres:
    image: postgres:15
    ports: ['5432:5432']
    environment:
      POSTGRES_DB: fdih_dev
      POSTGRES_USER: fdih_user
      POSTGRES_PASSWORD: fdih_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U fdih_user -d fdih_dev']
      interval: 5s
      timeout: 5s
      retries: 5
volumes:
  postgres_data:

--- package.json (root) ---
{
  "name": "fdih",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
    "migrate": "npm run migrate --prefix backend",
    "build": "npm run build --prefix backend && npm run build --prefix frontend"
  },
  "devDependencies": { "concurrently": "^8.0.0" }
}

--- .gitignore ---
node_modules/
dist/
.next/
.env
uploads/
*.env.local

═══════════════════════════════════════════════════════════════
SECTION 1 — BACKEND SCAFFOLD
═══════════════════════════════════════════════════════════════

Create backend/package.json:
{
  "name": "fdih-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "migrate": "ts-node src/db/migrate.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "multer": "^1.4.5",
    "pg": "^8.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.0",
    "@types/express": "^4.17.0",
    "@types/multer": "^1.4.0",
    "@types/pg": "^8.10.0",
    "ts-node": "^10.9.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0"
  }
}

Create backend/tsconfig.json:
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}

═══════════════════════════════════════════════════════════════
SECTION 2 — DATABASE
═══════════════════════════════════════════════════════════════

--- backend/src/db/pool.ts ---
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected pg pool error', err);
});

--- backend/src/db/migrations/001_init.sql ---
Exact SQL from Architecture document §3. Include:
- migrations_applied table
- organisations table
- documents table with all CHECK constraints
- extracted_fields table
- correction_history table
- prevent_correction_modification() function
- correction_immutable trigger

--- backend/src/db/migrations/002_indexes.sql ---
All 8 CREATE INDEX statements from Architecture document §3.

--- backend/src/db/migrate.ts ---
import { pool } from './pool';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_applied (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Seed the demo org — idempotent
    await client.query(`
      INSERT INTO organisations (id, name) VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING
    `, [process.env.DEMO_ORG_ID, 'Apex Logistics Demo']);

    // Run migration files in alphabetical order
    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM migrations_applied WHERE name = $1', [file]
      );
      if (rows.length > 0) { console.log(`skip:    ${file}`); continue; }

      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO migrations_applied (name) VALUES ($1)', [file]);
      console.log(`applied: ${file}`);
    }
    console.log('✓ Migrations complete');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });

═══════════════════════════════════════════════════════════════
SECTION 3 — BACKEND TYPES
═══════════════════════════════════════════════════════════════

--- backend/src/types/index.ts ---
Define these TypeScript interfaces and the Zod schema. All exported.

import { z } from 'zod';

// Document types
export type DocumentType = 'commercial_invoice' | 'packing_list' | 'bill_of_lading';
export type DocumentStatus = 'pending' | 'processing' | 'review' | 'approved' | 'failed';

export interface Document {
  id: string;
  org_id: string;
  document_type: DocumentType;
  status: DocumentStatus;
  file_path: string;
  original_filename: string;
  overall_confidence: number | null;
  uploaded_at: string;
  updated_at: string;
}

export interface ExtractedField {
  id: string;
  document_id: string;
  org_id: string;
  field_name: string;
  ai_value: string | null;
  final_value: string | null;
  confidence: number;
  was_corrected: boolean;
  created_at: string;
}

export interface CorrectionRow {
  id: string;
  document_id: string;
  field_name: string;
  ai_value: string | null;
  corrected_value: string;
  corrected_at: string;
}

export interface DocumentListItem {
  id: string;
  document_type: DocumentType;
  status: DocumentStatus;
  overall_confidence: number | null;
  uploaded_at: string;
  original_filename: string;
  reference_numbers: string | null;
  shipper_name: string | null;
  consignee_name: string | null;
}

// Zod schema for Claude response validation
const FieldSchema = z.object({
  value: z.union([z.string(), z.array(z.string()), z.null()]),
  confidence: z.number().int().min(0).max(100),
});

export const ExtractionResponseSchema = z.object({
  shipper_name:          FieldSchema,
  shipper_address:       FieldSchema,
  consignee_name:        FieldSchema,
  consignee_address:     FieldSchema,
  commodity_description: FieldSchema,
  quantity_and_units:    FieldSchema,
  gross_weight:          FieldSchema,
  net_weight:            FieldSchema,
  country_of_origin:     FieldSchema,
  declared_value:        FieldSchema,
  currency:              FieldSchema,
  incoterms:             FieldSchema,
  document_date:         FieldSchema,
  reference_numbers:     FieldSchema,
});

export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

// Strips markdown fences from Claude response before JSON.parse
export function cleanJsonText(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

// List of all 14 canonical field names
export const FIELD_NAMES = [
  'shipper_name', 'shipper_address', 'consignee_name', 'consignee_address',
  'commodity_description', 'quantity_and_units', 'gross_weight', 'net_weight',
  'country_of_origin', 'declared_value', 'currency', 'incoterms',
  'document_date', 'reference_numbers',
] as const;

export type FieldName = typeof FIELD_NAMES[number];

--- backend/src/errors/AppError.ts ---
export class AppError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}
export class NotFoundError extends AppError {
  constructor(msg = 'Not found') { super(msg, 404); }
}
export class ValidationError extends AppError {
  constructor(msg: string) { super(msg, 400); }
}
export class ExtractionError extends AppError {
  constructor(msg: string) { super(msg, 422); }
}

═══════════════════════════════════════════════════════════════
SECTION 4 — BACKEND ADAPTERS & MIDDLEWARE
═══════════════════════════════════════════════════════════════

--- backend/src/adapters/claudeClient.ts ---
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

export async function callClaude(
  fileBuffer: Buffer,
  mimeType: string,
  documentType: string,
  isRetry = false,
): Promise<string> {
  const prompt = EXTRACTION_PROMPT.replace('{DOCUMENT_TYPE}', documentType)
    + (isRetry ? RETRY_PROMPT_SUFFIX : '');

  // For PDF use 'document' type; for images use 'image' type
  const sourceType = mimeType === 'application/pdf' ? 'base64' : 'base64';
  const contentType = mimeType === 'application/pdf' ? 'document' : 'image';

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: contentType as 'document',
          source: {
            type: 'base64',
            media_type: mimeType as 'application/pdf',
            data: fileBuffer.toString('base64'),
          },
        } as Anthropic.DocumentBlockParam,
        { type: 'text', text: prompt },
      ],
    }],
  });

  const text = response.content.find(b => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No text in Claude response');
  return text.text;
}

--- backend/src/middleware/errorHandler.ts ---
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

--- backend/src/middleware/upload.ts ---
import multer, { StorageEngine } from 'multer';
import { ValidationError } from '../errors/AppError';
import { Request } from 'express';

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

// Use memory storage — we write to disk ourselves with the document_id as directory
const storage: StorageEngine = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req: Request, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Invalid file type. Accepted: PDF, JPEG, PNG`));
    }
  },
}).single('file');

// Magic-byte MIME validation (defence in depth, runs after multer)
export function validateMimeByBytes(buffer: Buffer, declaredMime: string): boolean {
  const hex = buffer.slice(0, 8).toString('hex');
  if (declaredMime === 'application/pdf') return hex.startsWith('25504446'); // %PDF
  if (declaredMime === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (declaredMime === 'image/png') return hex.startsWith('89504e47'); // .PNG
  return false;
}

═══════════════════════════════════════════════════════════════
SECTION 5 — EXTRACTION SERVICE
═══════════════════════════════════════════════════════════════

--- backend/src/services/extractionService.ts ---
// FR-004, FR-005, FR-006, FR-007, FR-008

import fs from 'fs';
import path from 'path';
import { pool } from '../db/pool';
import { callClaude } from '../adapters/claudeClient';
import { ExtractionResponseSchema, cleanJsonText, FIELD_NAMES } from '../types';
import type { ExtractionResponse } from '../types';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
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

    // Step 3 — read file from disk
    const fullPath = path.join(UPLOAD_DIR, doc.file_path);
    const fileBuffer = await fs.promises.readFile(fullPath);

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
    ).catch(() => {});
  } finally {
    client.release();
  }
}

═══════════════════════════════════════════════════════════════
SECTION 6 — CORRECTION SERVICE
═══════════════════════════════════════════════════════════════

--- backend/src/services/correctionService.ts ---
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
         SET final_value=$1, was_corrected=$2, updated_at=now()
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
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

═══════════════════════════════════════════════════════════════
SECTION 7 — ROUTES: DOCUMENTS
═══════════════════════════════════════════════════════════════

--- backend/src/routes/documents.ts ---
// All FR references noted per handler

import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/pool';
import { uploadMiddleware, validateMimeByBytes } from '../middleware/upload';
import { extractDocument } from '../services/extractionService';
import { saveReview } from '../services/correctionService';
import { ValidationError, NotFoundError } from '../errors/AppError';
import type { ReviewField } from '../services/correctionService';

const router = express.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const DEMO_ORG_ID = process.env.DEMO_ORG_ID!;

const VALID_DOC_TYPES = ['commercial_invoice', 'packing_list', 'bill_of_lading'];

// Helper: sanitise filename
function sanitiseFilename(name: string): string {
  return name.replace(/[./\\]/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '_').substring(0, 200);
}

// ── POST /api/documents/upload  [FR-001, FR-002, FR-003, FR-004] ──────────
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

      // Write file to disk [FR-003]
      const documentId = uuidv4();
      const sanitised = sanitiseFilename(req.file.originalname);
      const relPath = `${documentId}/${sanitised}`;
      const absDir = path.join(UPLOAD_DIR, documentId);

      await fs.promises.mkdir(absDir, { recursive: true });
      await fs.promises.writeFile(path.join(UPLOAD_DIR, relPath), req.file.buffer);

      // Create document record
      await pool.query(
        `INSERT INTO documents (id, org_id, document_type, status, file_path, original_filename)
         VALUES ($1, $2, $3, 'pending', $4, $5)`,
        [documentId, DEMO_ORG_ID, documentType, relPath, req.file.originalname]
      );

      // Fire-and-forget extraction [FR-004]
      void extractDocument(documentId);

      res.status(201).json({ documentId, status: 'processing' });
    } catch (err) {
      next(err);
    }
  });
});

// ── GET /api/documents/:id/status  [FR-007] ───────────────────────────────
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

// ── GET /api/documents/:id  [FR-019] ─────────────────────────────────────
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

// ── GET /api/documents/:id/file  [FR-022] ────────────────────────────────
router.get('/:id/file', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query<{ file_path: string; original_filename: string }>(
      'SELECT file_path, original_filename FROM documents WHERE id=$1 AND org_id=$2',
      [req.params.id, DEMO_ORG_ID]
    );
    if (rows.length === 0) throw new NotFoundError('Document not found');

    const absPath = path.join(UPLOAD_DIR, rows[0].file_path);
    if (!fs.existsSync(absPath)) throw new NotFoundError('File not found on disk');

    const ext = path.extname(rows[0].original_filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf', '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', '.png': 'image/png',
    };
    const mime = mimeMap[ext] ?? 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', 'inline');
    fs.createReadStream(absPath).pipe(res);
  } catch (err) { next(err); }
});

// ── PUT /api/documents/:id/review  [FR-010] ───────────────────────────────
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

// ── GET /api/documents  [FR-016, FR-017, FR-018] ─────────────────────────
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

═══════════════════════════════════════════════════════════════
SECTION 8 — ROUTES: ANALYTICS
═══════════════════════════════════════════════════════════════

--- backend/src/routes/analytics.ts ---
// FR-021, FR-022

import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';

const router = express.Router();
const DEMO_ORG_ID = process.env.DEMO_ORG_ID!;

// ── GET /api/analytics/field-accuracy ────────────────────────────────────
router.get('/field-accuracy', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT field_name,
              ROUND(AVG(confidence)::numeric, 1) AS avg_confidence
       FROM extracted_fields
       WHERE org_id=$1
       GROUP BY field_name
       ORDER BY avg_confidence DESC`,
      [DEMO_ORG_ID]
    );
    res.json({ fields: rows });
  } catch (err) { next(err); }
});

// ── GET /api/analytics/trend ──────────────────────────────────────────────
router.get('/trend', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', uploaded_at), 'YYYY-MM') AS month,
              COUNT(*)::int AS doc_count,
              ROUND(AVG(overall_confidence)::numeric, 1) AS avg_confidence
       FROM documents
       WHERE org_id=$1
         AND uploaded_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
         AND overall_confidence IS NOT NULL
       GROUP BY month
       ORDER BY month ASC`,
      [DEMO_ORG_ID]
    );
    res.json({ months: rows });
  } catch (err) { next(err); }
});

// ── GET /api/analytics/distribution ──────────────────────────────────────
router.get('/distribution', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         CASE
           WHEN overall_confidence >= 85 THEN 'high'
           WHEN overall_confidence >= 60 THEN 'medium'
           ELSE 'low'
         END AS tier,
         COUNT(*)::int AS count
       FROM documents
       WHERE org_id=$1 AND overall_confidence IS NOT NULL
       GROUP BY tier`,
      [DEMO_ORG_ID]
    );
    // Ensure all three tiers are present even if count is 0
    const tiers = ['high', 'medium', 'low'];
    const filled = tiers.map(tier => ({
      tier,
      count: rows.find(r => r.tier === tier)?.count ?? 0,
    }));
    res.json({ distribution: filled });
  } catch (err) { next(err); }
});

export default router;

═══════════════════════════════════════════════════════════════
SECTION 9 — BACKEND ENTRY POINT
═══════════════════════════════════════════════════════════════

--- backend/src/index.ts ---
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import documentsRouter from './routes/documents';
import analyticsRouter from './routes/analytics';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

// Ensure uploads directory exists
fs.mkdirSync(path.resolve(UPLOAD_DIR), { recursive: true });

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/documents', documentsRouter);
app.use('/api/analytics', analyticsRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`FDIH API running on http://localhost:${PORT}`);
  console.log(`DEMO_ORG_ID: ${process.env.DEMO_ORG_ID}`);
  console.log(`UPLOAD_DIR:  ${path.resolve(UPLOAD_DIR)}`);
});

export default app;

═══════════════════════════════════════════════════════════════
SECTION 10 — FRONTEND SCAFFOLD
═══════════════════════════════════════════════════════════════

Create frontend/package.json:
{
  "name": "fdih-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.383.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}

Create frontend/tsconfig.json (Next.js standard strict config):
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom","dom.iterable","esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name":"next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

Create frontend/tailwind.config.ts:
import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace'],
      },
    },
  },
  plugins: [],
};
export default config;

Create frontend/app/globals.css:
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

Create frontend/next.config.mjs:
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;

═══════════════════════════════════════════════════════════════
SECTION 11 — FRONTEND TYPES + API CLIENT
═══════════════════════════════════════════════════════════════

--- frontend/lib/types.ts ---
Define all TypeScript interfaces for the frontend:
- DocumentType, DocumentStatus (matching backend)
- Document, ExtractedField, CorrectionRow, DocumentListItem
- DocumentDetailResponse: { document: Document, fields: ExtractedField[], history: CorrectionRow[] }
- DocumentListResponse: { documents: DocumentListItem[], total: number, page: number, totalPages: number }
- ReviewField: { field_name: string, final_value: string }
- FieldAccuracyItem: { field_name: string, avg_confidence: number }
- TrendMonth: { month: string, doc_count: number, avg_confidence: number }
- DistributionTier: { tier: 'high'|'medium'|'low', count: number }

--- frontend/lib/utils.ts ---
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function truncate(str: string | null, n = 40): string {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// Human-readable field labels
export const FIELD_LABELS: Record<string, string> = {
  shipper_name: 'Shipper Name',
  shipper_address: 'Shipper Address',
  consignee_name: 'Consignee Name',
  consignee_address: 'Consignee Address',
  commodity_description: 'Commodity Description',
  quantity_and_units: 'Quantity & Units',
  gross_weight: 'Gross Weight',
  net_weight: 'Net Weight',
  country_of_origin: 'Country of Origin',
  declared_value: 'Declared Value',
  currency: 'Currency',
  incoterms: 'Incoterms',
  document_date: 'Document Date',
  reference_numbers: 'Reference Numbers',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  commercial_invoice: 'Commercial Invoice',
  packing_list: 'Packing List',
  bill_of_lading: 'Bill of Lading',
};

--- frontend/lib/api.ts ---
Implement the complete API client exactly as specified in UI Spec §7 using the
apiFetch helper pattern. All 9 functions fully typed against the types in lib/types.ts.

═══════════════════════════════════════════════════════════════
SECTION 12 — FRONTEND SHARED COMPONENTS
═══════════════════════════════════════════════════════════════

Build all components in frontend/components/.
Every component uses Tailwind classes only. Zero inline styles. Zero hardcoded hex values.
All components are TypeScript strict — explicit prop interfaces.

--- components/ui/ConfBadge.tsx ---
Props: { score: number }
Emerald (≥85): bg-emerald-100 text-emerald-700
Amber (60-84): bg-amber-100 text-amber-700
Rose (<60): bg-rose-100 text-rose-700
Classes: inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold
Displays: "{score}%" e.g. "87%"

--- components/ui/TypeBadge.tsx ---
Props: { type: DocumentType }
CI: bg-blue-100 text-blue-700
PL: bg-amber-100 text-amber-700
BL: bg-slate-100 text-slate-700
Displays human label from DOC_TYPE_LABELS.

--- components/ui/StatusBadge.tsx ---
Props: { status: DocumentStatus }
approved: bg-emerald-100 text-emerald-700
review: bg-amber-100 text-amber-700
processing: bg-blue-100 text-blue-700 + animate-pulse
failed: bg-rose-100 text-rose-700
pending: bg-slate-100 text-slate-500

--- components/ui/Btn.tsx ---
Props: { variant?: 'primary'|'ghost'|'danger', size?: 'sm'|'md', loading?: boolean,
  disabled?: boolean, onClick?: () => void, type?: 'button'|'submit', className?: string,
  children: React.ReactNode }
primary: bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500
ghost: bg-white hover:bg-slate-50 border border-slate-200 text-slate-700
danger: bg-rose-600 hover:bg-rose-700 text-white
All: rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50
sm: px-3 py-1.5 text-sm min-h-8
md: px-4 py-2 text-sm min-h-10
loading: show 14px spinner (border-2 rounded-full animate-spin w-3.5 h-3.5 border-current border-t-transparent)

--- components/ui/Card.tsx ---
Props: { className?: string, children: React.ReactNode }
bg-white rounded-xl border border-slate-200 shadow-sm

--- components/ui/EmptyState.tsx ---
Props: { icon: React.ReactNode, heading: string, subtext: string,
  action?: { label: string, onClick: () => void } }
Centred, py-16, icon in circle bg-slate-100 mb-4, heading text-slate-900 font-semibold,
subtext text-slate-500 text-sm mt-1.

--- components/ui/LoadingSpinner.tsx ---
Props: { size?: 'sm'|'md'|'lg', className?: string }
Animated border spinner. sm=w-4 h-4, md=w-6 h-6, lg=w-8 h-8.

--- components/layout/Sidebar.tsx ---
Props: none
Fixed left sidebar, h-screen, w-56 (desktop), w-14 (tablet via lg:w-56).
Logo: "FDIH" in font-bold text-slate-900 + subtitle "Freight Intelligence" text-xs text-slate-500.
Nav items: use next/link + usePathname. Active: bg-blue-50 text-blue-600. Inactive: text-slate-600 hover:bg-slate-50.
Icons from lucide-react: LayoutDashboard, Upload, BarChart2.
On desktop: icon + label. On tablet (w-14): icon only, title attribute.

--- components/layout/PageHeader.tsx ---
Props: { title: string, children?: React.ReactNode }
flex items-center justify-between h-14 px-6 border-b border-slate-200 bg-white sticky top-0 z-10.
Left: h1 text-xl font-semibold text-slate-900. Right: children (actions slot).

--- components/layout/MobileDrawer.tsx ---
Props: { isOpen: boolean, onClose: () => void }
Full-screen backdrop (bg-slate-900/50) + 260px drawer sliding from left.
Contains same nav items as Sidebar. Close button (X) top-right.

═══════════════════════════════════════════════════════════════
SECTION 13 — FRONTEND LAYOUT
═══════════════════════════════════════════════════════════════

--- frontend/app/layout.tsx ---
'use client'
Root layout. Imports globals.css.
State: isMobileDrawerOpen (boolean).
Structure:
<html lang="en">
  <body className="bg-slate-50 text-slate-900 font-sans">
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar — shown only on small screens via lg:hidden */}
        <div className="lg:hidden flex items-center h-14 px-4 border-b border-slate-200 bg-white">
          <button onClick={() => setIsMobileDrawerOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <span className="ml-3 font-semibold text-slate-900">FDIH</span>
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    <MobileDrawer isOpen={isMobileDrawerOpen} onClose={() => setIsMobileDrawerOpen(false)} />
  </body>
</html>

═══════════════════════════════════════════════════════════════
SECTION 14 — S1 DASHBOARD PAGE
═══════════════════════════════════════════════════════════════

--- frontend/app/page.tsx ---
// FR-016, FR-017, FR-018, FR-022
'use client'

State:
- documents: DocumentListItem[]
- total, page, totalPages: number
- loading, error: boolean/string
- q, type, dateFrom, dateTo, country: string (filter state)
- countryOptions: string[] (fetched once on mount)

On mount and on filter change (with 300ms debounce for q):
  Call listDocuments({ q, type, date_from: dateFrom, date_to: dateTo, country, page: '1', limit: '20' })
  Update documents, total, page, totalPages state.

On mount also fetch distribution for stat card counts:
  Call getDistribution() to get tier counts.
  Stat cards: total=total from list, approved=sum where status=approved (from list data),
  pending=pending+review count, avgConf computed from documents array.

Layout: px-6 py-6 space-y-6

Render:
1. PageHeader "Documents" with Btn primary "Upload Document" (onClick → router.push('/upload'))
2. StatCards component — receives stats object
3. FilterBar component — receives filter state + setters
4. If loading: LoadingSpinner centered in a Card
5. If error: error card with retry button
6. If documents.length === 0 and no active filters: EmptyState
7. Else: DocumentTable component
8. Pagination: if totalPages > 1, show prev/next buttons with "Showing X–Y of Z"

--- frontend/components/features/StatCards.tsx ---
Props: { total: number, approved: number, pendingReview: number, avgConfidence: number | null }
Grid: grid grid-cols-2 lg:grid-cols-4 gap-4
Each Card: large bold number + label below + relevant lucide icon (FileText/CheckCircle/Clock/Target)
avgConfidence displayed as "82.4%" or "—" if null.

--- frontend/components/features/FilterBar.tsx ---
Props: {
  q, type, dateFrom, dateTo, country: string
  onQ, onType, onDateFrom, onDateTo, onCountry: (v: string) => void
  countryOptions: string[]
  onClear: () => void
  hasFilters: boolean
}
Row of: search input (with Search icon, 300ms debounce handled by parent) + 3 selects inline.
On mobile: wrap to 2 rows.
"Clear filters" text-sm text-blue-600 hover:underline appears right-aligned when hasFilters=true.

--- frontend/components/features/DocumentTable.tsx ---
Props: { documents: DocumentListItem[] }
Desktop/tablet: <table> with thead and tbody.
  Columns: Type | Reference | Shipper | Confidence | Status | Uploaded
  TypeBadge, font-mono text for ref (truncated 20 chars), truncated shipper,
  ConfBadge (shows overall_confidence), StatusBadge, formatDate(uploaded_at).
  Entire row is clickable (cursor-pointer) → router.push('/documents/' + id).
  Hover: bg-slate-50.
Mobile (hidden sm:table → show as cards on <640px):
  Use responsive Tailwind: hide table on mobile, show card list.
  Each document card: TypeBadge + StatusBadge row, ref (mono), shipper,
  ConfBadge, date. Tap → navigate.

═══════════════════════════════════════════════════════════════
SECTION 15 — S2 UPLOAD PAGE
═══════════════════════════════════════════════════════════════

--- frontend/app/upload/page.tsx ---
// FR-001, FR-002, FR-003, FR-004, FR-007
'use client'
import { useRouter } from 'next/navigation';

State:
- selectedType: DocumentType | null
- selectedFile: File | null
- dragOver: boolean
- fileError: string | null
- phase: 'form' | 'processing' | 'error'
- processingDocId: string | null
- errorMsg: string

Phase 'form': show type selector + file drop zone + submit button.
Phase 'processing': show spinner card with polling logic.
Phase 'error': show error card with retry button (resets to 'form').

Type selector:
  3 cards in grid-cols-3 (grid-cols-1 on mobile).
  Each card: icon (FileText/Package/Ship) + label.
  Selected: ring-2 ring-blue-500 bg-blue-50.
  Unselected: border border-slate-200 bg-white hover:bg-slate-50.

File drop zone:
  onDragOver: e.preventDefault(), setDragOver(true)
  onDragLeave: setDragOver(false)
  onDrop: e.preventDefault(), setDragOver(false), handle file
  onClick: trigger hidden <input type="file"> ref
  Idle: dashed border-2 border-dashed border-slate-300, icon + text
  DragOver: border-blue-400 bg-blue-50
  File selected: show filename + size + "Remove" button

  File validation on selection:
  - Check file.type against ['application/pdf','image/jpeg','image/png']
  - Check file.size <= 20 * 1024 * 1024
  - Show fileError if invalid

Submit handler:
  1. Set phase='processing'
  2. await uploadDocument(selectedFile, selectedType)
  3. Store returned documentId in processingDocId
  4. Start polling: every 2000ms call pollStatus(docId)
  5. On status='review': clearInterval, router.push('/review/' + docId)
  6. On status='failed': clearInterval, phase='error', errorMsg='Extraction failed'
  7. On fetch error: clearInterval, phase='error'
  8. Clear interval on component unmount (useEffect cleanup)

═══════════════════════════════════════════════════════════════
SECTION 16 — S3 REVIEW PAGE
═══════════════════════════════════════════════════════════════

--- frontend/app/review/[id]/page.tsx ---
// FR-005, FR-008, FR-009, FR-010
'use client'

State:
- data: DocumentDetailResponse | null
- loading, saving: boolean
- error: string | null
- fieldValues: Record<string, string>   ← editable form state
- editedFields: Set<string>             ← tracks which fields were changed
- showDiscardConfirm: boolean
- previewOpen: boolean (mobile)

On mount: fetch getDocument(id) → populate data and fieldValues.
fieldValues initialised as: { [field.field_name]: field.ai_value ?? '' } for each field.

When user changes an input: update fieldValues[field_name], add to editedFields if value !== ai_value.

Show warning banner if any field.confidence < 60 AND data is loaded.

reference_numbers display: parse JSON string to array, join with ", " for the input.
reference_numbers save: split input by ",", trim each, filter empty, JSON.stringify.

Save handler:
  Set saving=true.
  Build fields array: ALL 14 fields as { field_name, final_value } —
  for reference_numbers: re-stringify the array.
  Call saveReview(id, fields).
  On success: router.push('/documents/' + id).
  On error: show error toast/message, saving=false.

Layout — desktop/tablet: grid grid-cols-[280px_1fr] gap-6 p-6.
Layout — mobile: single column, FilePreview in collapsible section.

FilePreview (components/features/FilePreview.tsx):
  Props: { documentId: string, filename: string, isOpen?: boolean, onToggle?: () => void }
  PDF: <iframe src={`${API_URL}/api/documents/${id}/file`} className="w-full min-h-[500px]">
  Image: <img src={`${API_URL}/api/documents/${id}/file`} className="w-full object-contain">
  Detect by filename extension.
  Mobile: wrapped in collapsible with "Show document ▼ / Hide document ▲" toggle.

FieldForm (components/features/FieldForm.tsx):
  Props: { fields: ExtractedField[], fieldValues: Record<string,string>,
    editedFields: Set<string>, onChange: (name: string, value: string) => void }
  grid grid-cols-2 gap-4 (grid-cols-1 on mobile).
  Each field card: Card component wrapping:
    - top row: label (uppercase, text-xs text-slate-500) + ConfBadge + (if edited: "Edited" amber badge)
    - <input> or <textarea> (multi-line for address fields) pre-filled with fieldValues[name]

═══════════════════════════════════════════════════════════════
SECTION 17 — S4 DETAIL PAGE
═══════════════════════════════════════════════════════════════

--- frontend/app/documents/[id]/page.tsx ---
// FR-019, FR-022
'use client'

On mount: getDocument(id).

Layout: same grid as S3 but all read-only.

PageHeader: left = "← Back" ghost Btn (router.back()), centre = TypeBadge + reference,
  right = StatusBadge + ConfBadge.

Left panel: FilePreview (always open, no toggle on desktop).

Right panel — two sections:
1. "Extracted Fields" (h2). 2-col grid (1-col mobile).
   Each field card (read-only):
   - top row: label + ConfBadge + ("Edited" amber chip if was_corrected)
   - ai_value: text-xs text-slate-400 (italic if null: "Not extracted")
   - final_value: text-sm text-slate-900 font-medium

2. CorrectionHistory (components/features/CorrectionHistory.tsx):
   Props: { history: CorrectionRow[] }
   Heading "Correction History".
   If empty: "No corrections were made to this document." (text-slate-500 text-sm).
   Else: table. Columns: Field | AI Extracted | Corrected To | Date.
   Field column: uses FIELD_LABELS for human-readable name.
   Date: formatDateTime(corrected_at).

═══════════════════════════════════════════════════════════════
SECTION 18 — S5 ANALYTICS PAGE
═══════════════════════════════════════════════════════════════

--- frontend/app/analytics/page.tsx ---
// FR-021
'use client'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

On mount: fetch all three analytics endpoints in parallel with Promise.all.

State: fieldAccuracy, trend, distribution, loading, error.

--- Chart 1: Field Accuracy (Horizontal Bar) ---
Card, heading "Average Confidence by Field".
BarChart layout="vertical", height=420.
YAxis: dataKey="field_name", width=160, tickFormatter using FIELD_LABELS.
XAxis: domain [0,100].
Bar dataKey="avg_confidence", radius={[0,4,4,0]}.
  Each bar's fill determined by Cell: emerald #059669 (≥85), amber #D97706 (60-84), rose #E11D48 (<60).
Tooltip: shows "{label}: {value}%".

--- Chart 2: Monthly Trend (Line) ---
Card, heading "Monthly Volume & Confidence Trend".
LineChart height=280.
XAxis dataKey="month".
YAxis yAxisId="left" (doc_count). YAxis yAxisId="right" orientation="right" (avg_confidence, domain [0,100]).
Line yAxisId="left" dataKey="doc_count" stroke="#2563EB" name="Documents".
Line yAxisId="right" dataKey="avg_confidence" stroke="#059669" name="Avg Confidence".
CartesianGrid, Tooltip, Legend.

--- Chart 3: Confidence Distribution (Donut) ---
Card, heading "Confidence Distribution".
PieChart height=280.
Pie dataKey="count" nameKey="tier" innerRadius=60 outerRadius=90 paddingAngle=3.
  Cell fills: high=#059669, medium=#D97706, low=#E11D48.
Tooltip, Legend.

Each chart card: shows LoadingSpinner while loading, EmptyState if no data.

═══════════════════════════════════════════════════════════════
SECTION 19 — FINAL WIRING & VERIFICATION
═══════════════════════════════════════════════════════════════

After building all sections, verify the following in every file:

BACKEND CHECKS:
□ backend/src/index.ts: dotenv.config() is the FIRST line before any imports
□ All routes return JSON error objects { error: string } — never plain text
□ extractionService.ts: extractDocument called with void (not await) in the route
□ correctionService.ts: only INSERT on correction_history — no UPDATE/DELETE
□ All pool queries use parameterised placeholders ($1, $2) — never string concatenation
□ migrate.ts: seeds the demo org using DEMO_ORG_ID env var
□ UPLOAD_DIR directory is created on startup if it doesn't exist
□ File route streams with createReadStream — does NOT load entire file into memory

FRONTEND CHECKS:
□ frontend/lib/api.ts: BASE_URL = process.env.NEXT_PUBLIC_API_URL
□ All pages are 'use client' — no async server components
□ Polling in S2: useEffect cleanup function clears the interval on unmount
□ S3 review: sends ALL 14 fields in the PUT body (not just edited ones)
□ S3 review: reference_numbers parsed from JSON string → joined for input → split and re-stringified on save
□ All Recharts charts wrapped in ResponsiveContainer width="100%"
□ No hardcoded localhost:3001 — always uses process.env.NEXT_PUBLIC_API_URL

TYPESCRIPT CHECKS:
□ tsc --noEmit passes in both backend/ and frontend/ with zero errors
□ No explicit `any` types anywhere
□ All useState calls have explicit type parameters where needed

═══════════════════════════════════════════════════════════════
DEFINITION OF DONE — RUN THIS CHECKLIST BEFORE SUBMITTING
═══════════════════════════════════════════════════════════════

SETUP:
□ docker-compose up -d → postgres container healthy
□ cp .env.example .env → fill in ANTHROPIC_API_KEY
□ cd backend && npm install && npm run migrate → "Migrations complete" with no errors
□ cd frontend && npm install
□ npm run dev (root) → backend on :3001, frontend on :3000

BACKEND ENDPOINT TESTS (curl):
□ GET http://localhost:3001/health → { "status": "ok" }
□ POST /api/documents/upload with no file → 400 { "error": "No file provided." }
□ POST /api/documents/upload with .exe file → 400 { "error": "Invalid file type..." }
□ GET /api/documents → 200 { "documents": [], "total": 0, "page": 1, "totalPages": 0 }
□ GET /api/analytics/distribution → 200 { "distribution": [{ "tier": "high", "count": 0 }, ...] }

FULL FLOW TEST:
□ Open http://localhost:3000
□ Dashboard shows empty state with "Upload Document" CTA
□ Click Upload → select "Commercial Invoice" → drop a real logistics PDF
□ Processing card appears with spinner
□ Auto-navigates to /review/:id with 14 field cards pre-populated
□ At least some fields show values (not all null) — AI extraction worked
□ Edit one field value → "Edited" chip appears
□ Click "Save Document" → redirects to /documents/:id
□ Document detail shows: file preview + all 14 fields + correction history with the edited field
□ Back to dashboard: document appears in list with TypeBadge, ConfBadge, StatusBadge="approved"
□ Search by the shipper name → document appears in filtered results
□ Analytics page: all 3 charts render with real data (not empty state)

DATABASE VERIFICATION:
□ psql → SELECT COUNT(*) FROM extracted_fields; → 14 rows per document
□ SELECT * FROM correction_history; → one row for the field you edited
□ UPDATE correction_history SET corrected_value='x' WHERE id=(SELECT id FROM correction_history LIMIT 1);
   → ERROR: correction_history is append-only ← trigger is working
```

---

## QUICK START AFTER BUILD

```bash
# 1. Start database
docker-compose up -d

# 2. Copy and fill env file
cp .env.example .env
# → edit .env, set ANTHROPIC_API_KEY=sk-ant-...

# 3. Install and migrate
cd backend && npm install && npm run migrate && cd ..
cd frontend && npm install && cd ..

# 4. Run both services
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:3000
```

## SEED CREDENTIALS

No login required. App is open-access. DEMO_ORG_ID is set in .env.

## FEATURE EXPLANATION (Deliverable 4)

**Confidence Score Analytics** was chosen as Deliverable 4 because it directly addresses the
core problem of this application: knowing whether the AI extraction can be trusted. In real
freight operations, a single incorrect field — a wrong declared value, a misread Incoterm, a
swapped shipper name — can trigger customs delays, duty miscalculations, or legal liability.
The analytics page gives operations teams an at-a-glance view of which fields Claude extracts
reliably and which consistently need human correction, enabling targeted review effort and
measurable quality improvement over time.
