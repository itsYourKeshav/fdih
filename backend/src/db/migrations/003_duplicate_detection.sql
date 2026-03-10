ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS duplicate_check_run BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS potential_duplicate_of UUID
    REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_dup_of
  ON documents(potential_duplicate_of)
  WHERE potential_duplicate_of IS NOT NULL;