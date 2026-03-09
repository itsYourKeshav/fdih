CREATE INDEX idx_documents_org      ON documents(org_id);
CREATE INDEX idx_documents_status   ON documents(status);
CREATE INDEX idx_documents_type     ON documents(document_type);
CREATE INDEX idx_documents_uploaded ON documents(uploaded_at DESC);

CREATE INDEX idx_fields_document    ON extracted_fields(document_id);
CREATE INDEX idx_fields_field_name  ON extracted_fields(field_name);
-- composite index for search queries
CREATE INDEX idx_fields_search      ON extracted_fields(document_id, field_name, final_value);

CREATE INDEX idx_history_document   ON correction_history(document_id);
