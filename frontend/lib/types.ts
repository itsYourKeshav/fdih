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

export interface DocumentDetailResponse {
    document: Document;
    fields: ExtractedField[];
    history: CorrectionRow[];
}

export interface DocumentListResponse {
    documents: DocumentListItem[];
    total: number;
    page: number;
    totalPages: number;
}

export interface ReviewField {
    field_name: string;
    final_value: string;
}

export interface FieldAccuracyItem {
    field_name: string;
    avg_confidence: number;
}

export interface TrendMonth {
    month: string;
    doc_count: number;
    avg_confidence: number;
}

export interface DistributionTier {
    tier: 'high' | 'medium' | 'low';
    count: number;
}
