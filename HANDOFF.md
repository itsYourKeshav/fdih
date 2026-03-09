# 🏁 FDIH Technical Handoff Guide

This document is intended for any AI agent or developer taking over the development of the **Freight Document Intelligence Hub (FDIH)**.

## 🏗️ Architecture Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Recharts, Lucide React.
- **Backend**: Node.js + Express + TypeScript.
- **Database**: PostgreSQL (Currently connected to Supabase).
- **AI**: Claude 3.5 Sonnet (via Anthropic SDK).
- **Communication**: REST API (Backend on `:3001`, Frontend on `:3000`).

## 🗝️ Core Logic & Pipelines

### 1. Document Extraction Pipeline (`extractionService.ts`)
- **Flow**: `POST /upload` -> Save File -> Create DB Record (status: `pending`) -> **Fire-and-forget** `extractDocument()` -> Return 201 to user.
- **Service**: `extractDocument()` updates status to `processing`, reads file, calls `claudeClient.ts`, validates response with **Zod (`ExtractionResponseSchema`)**, computes a mean confidence score, and then bulk inserts 14 fields into `extracted_fields`.
- **Validation**: If Claude returns malformed JSON, a retry logic is implemented with a specific "Return ONLY raw JSON" prompt.

### 2. Document Review & Immortality (`correctionService.ts`)
- **Audit Trail**: Any change made during review is logged in `correction_history`.
- **Schema Constraint**: The `correction_history` table in Postgres has an **immutable trigger** (`correction_immutable`). Updates or Deletes on this table will throw a SQL error.
- **Accuracy**: User "corrections" update the `final_value` in `extracted_fields` and mark `was_corrected = true`.

### 3. Analytics Service (`analytics.ts`)
- **Field Accuracy**: Aggregates average confidence per field name.
- **Trends**: Monthly volume and confidence tracking using `DATE_TRUNC`.
- **Distribution**: Simple case statement to bucket documents into High (>=85%), Medium (>=60%), and Low confidence.

## 🛠️ Critical Patches & Gotchas (Updated 2026-03-09)

### 1. Claude SDK Type Change
The `@anthropic-ai/sdk` (v0.32+) removed the `DocumentBlockParam` type. I patched `claudeClient.ts` to use a generic object cast to support both PDF (type: `document`) and Images (type: `image`) without type errors.

### 2. Schema Mismatch: `extracted_fields`
The `extracted_fields` table **does not have** an `updated_at` column (to keep it lean). Only the `documents` table tracks updates. I previously fixed a 500 error in `correctionService.ts` where it was trying to update a non-existent `updated_at` column.

### 3. Reference Numbers Logic
`reference_numbers` are stored as a **JSON stringified array** in the database (`["REF1", "REF2"]`). The frontend utils and backend service handle the `JSON.parse` / `JSON.stringify` dance.

## 🚀 How to Resume Work
1.  **Environment**: Root `.env` and `backend/.env` should contain the Supabase `DATABASE_URL` and `ANTHROPIC_API_KEY`.
2.  **Scripts**:
    - `npm run dev`: Starts both servers.
    - `npm run migrate`: Re-runs migrations if new SQL files are added to `backend/src/db/migrations`.
3.  **File Storage**: Uploaded files go to `backend/uploads/{uuid}/filename`.

## 📋 Outstanding Tasks / Ideas
- [ ] Implement PDF highlighting (bounding boxes) in the preview.
- [ ] Add multi-document upload support.
- [ ] Add Export to CSV/Excel functionality for Analytics.
- [ ] Implement basic Org-switching (currently hardcoded to `DEMO_ORG_ID`).

---
*Signed, Antigravity (Agent)*
