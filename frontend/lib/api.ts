import {
    DocumentType,
    DocumentDetailResponse,
    DocumentListResponse,
    ReviewField,
    FieldAccuracyItem,
    TrendMonth,
    DistributionTier,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    if (!res.ok) {
        let errorMsg = 'An error occurred';
        try {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
        } catch (e) {
            errorMsg = res.statusText;
        }
        throw new Error(errorMsg);
    }
    return res.json() as Promise<T>;
}

export async function uploadDocument(file: File, documentType: DocumentType): Promise<{ documentId: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    return apiFetch<{ documentId: string; status: string }>('/api/documents/upload', {
        method: 'POST',
        body: formData,
    });
}

export async function getDocumentStatus(id: string): Promise<{ status: string }> {
    return apiFetch<{ status: string }>(`/api/documents/${id}/status`);
}

export async function getDocument(id: string): Promise<DocumentDetailResponse> {
    return apiFetch<DocumentDetailResponse>(`/api/documents/${id}`);
}

export interface DuplicateCheckResult {
    duplicateCheckRun: boolean;
    potentialDuplicateOf: {
        id: string;
        document_type: string;
        status: string;
        uploaded_at: string;
        overall_confidence: number | null;
        reference_numbers: string | null;
        shipper_name: string | null;
    } | null;
}

export const getDuplicateCheck = (id: string) =>
    apiFetch<DuplicateCheckResult>(`/api/documents/${id}/duplicate-check`);

export async function reviewDocument(id: string, fields: ReviewField[]): Promise<{ documentId: string; status: string }> {
    return apiFetch<{ documentId: string; status: string }>(`/api/documents/${id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
    });
}

export async function deleteDocument(id: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/api/documents/${id}`, {
        method: 'DELETE',
    });
}

export async function retryDocument(id: string): Promise<{ documentId: string; status: string }> {
    return apiFetch<{ documentId: string; status: string }>(`/api/documents/${id}/retry`, {
        method: 'POST',
    });
}

export async function listDocuments(params: Record<string, string | undefined>): Promise<DocumentListResponse> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value) query.append(key, value);
    }
    const queryString = query.toString();
    return apiFetch<DocumentListResponse>(`/api/documents${queryString ? '?' + queryString : ''}`);
}

export async function getFieldAccuracy(): Promise<{ fields: FieldAccuracyItem[] }> {
    return apiFetch<{ fields: FieldAccuracyItem[] }>('/api/analytics/field-accuracy');
}

export async function getTrend(): Promise<{ months: TrendMonth[] }> {
    return apiFetch<{ months: TrendMonth[] }>('/api/analytics/trend');
}

export async function getDistribution(): Promise<{ distribution: DistributionTier[] }> {
    return apiFetch<{ distribution: DistributionTier[] }>('/api/analytics/distribution');
}
