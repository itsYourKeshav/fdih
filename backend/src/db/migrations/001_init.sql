-- Migration tracking
CREATE TABLE IF NOT EXISTS migrations_applied (
  name        TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ DEFAULT now()
);

-- Demo organisation (one row, seeded by migrate.ts)
CREATE TABLE organisations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Documents
CREATE TABLE documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organisations(id),
  document_type       TEXT NOT NULL
    CHECK (document_type IN ('commercial_invoice','packing_list','bill_of_lading')),
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','review','approved','failed')),
  file_path           TEXT NOT NULL,      -- relative: {doc_id}/{filename}
  original_filename   TEXT NOT NULL,
  overall_confidence  NUMERIC(5,2),       -- mean of 14 field scores
  uploaded_at         TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Extracted fields — relational, one row per field
CREATE TABLE extracted_fields (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id         UUID NOT NULL,
  field_name     TEXT NOT NULL,
  ai_value       TEXT,          -- Claude output; arrays as JSON string
  final_value    TEXT,          -- after user review
  confidence     INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  was_corrected  BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Correction history — append-only audit trail
CREATE TABLE correction_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES documents(id),
  org_id           UUID NOT NULL,
  field_name       TEXT NOT NULL,
  ai_value         TEXT,                  -- snapshot at extraction time
  corrected_value  TEXT NOT NULL,
  corrected_at     TIMESTAMPTZ DEFAULT now()
);

-- Trigger: make correction_history truly append-only
CREATE OR REPLACE FUNCTION prevent_correction_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'correction_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER correction_immutable
  BEFORE UPDATE OR DELETE ON correction_history
  FOR EACH ROW EXECUTE FUNCTION prevent_correction_modification();
