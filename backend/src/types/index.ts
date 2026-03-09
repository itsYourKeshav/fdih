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
    shipper_name: FieldSchema,
    shipper_address: FieldSchema,
    consignee_name: FieldSchema,
    consignee_address: FieldSchema,
    commodity_description: FieldSchema,
    quantity_and_units: FieldSchema,
    gross_weight: FieldSchema,
    net_weight: FieldSchema,
    country_of_origin: FieldSchema,
    declared_value: FieldSchema,
    currency: FieldSchema,
    incoterms: FieldSchema,
    document_date: FieldSchema,
    reference_numbers: FieldSchema,
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
