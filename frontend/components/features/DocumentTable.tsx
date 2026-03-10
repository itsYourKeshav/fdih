'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentListItem } from '../../lib/types';
import { TypeBadge } from '../ui/TypeBadge';
import { ConfBadge } from '../ui/ConfBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDate, truncate } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Btn } from '../ui/Btn';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { listDocuments, retryDocument } from '../../lib/api';

interface DocumentTableProps {
    filters: {
        q: string;
        type: string;
        dateFrom: string;
        dateTo: string;
        country: string;
    };
    onClearFilters?: () => void;
}

export function DocumentTable({ filters, onClearFilters }: DocumentTableProps) {
    const router = useRouter();
    const [documents, setDocuments] = useState<DocumentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
    const limit = 20;

    const hasFilters = Boolean(filters.q || filters.type || filters.dateFrom || filters.dateTo || filters.country);

    const fetchDocuments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await listDocuments({
                q: filters.q,
                type: filters.type,
                date_from: filters.dateFrom,
                date_to: filters.dateTo,
                country: filters.country,
                page: page.toString(),
                limit: limit.toString()
            });
            setDocuments(res.documents);
            setTotal(res.total);
            setTotalPages(res.totalPages);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch documents');
        } finally {
            setLoading(false);
        }
    }, [filters.q, filters.type, filters.dateFrom, filters.dateTo, filters.country, page]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [filters.q, filters.type, filters.dateFrom, filters.dateTo, filters.country]);

    const handleRetry = async (documentId: string, event?: React.MouseEvent) => {
        event?.stopPropagation();
        try {
            setRetryingIds(prev => new Set(prev).add(documentId));
            await retryDocument(documentId);
            await fetchDocuments();
        } catch (e: any) {
            setError(e.message || 'Failed to retry extraction');
        } finally {
            setRetryingIds(prev => {
                const next = new Set(prev);
                next.delete(documentId);
                return next;
            });
        }
    };

    if (loading) {
        return (
            <Card className="p-16 flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-16 flex flex-col items-center justify-center text-center">
                <p className="text-rose-600 mb-4">{error}</p>
                <Btn variant="ghost" onClick={fetchDocuments}>Retry</Btn>
            </Card>
        );
    }

    if (documents.length === 0) {
        return (
            <Card className="min-h-[400px] flex items-center justify-center">
                <EmptyState
                    icon={<FileText />}
                    heading={hasFilters ? 'No matches found' : 'No documents yet'}
                    subtext={hasFilters ? 'Try adjusting your filters' : 'Upload your first logistics document to get started.'}
                    action={hasFilters && onClearFilters ? { label: 'Clear filters', onClick: onClearFilters } : undefined}
                />
            </Card>
        );
    }

    return (
        <div className="w-full">
            {/* Desktop/Tablet Table */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium">Reference</th>
                            <th className="px-4 py-3 font-medium">Shipper</th>
                            <th className="px-4 py-3 font-medium">Confidence</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Uploaded</th>
                            <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {documents.map((doc) => {
                            let refs = '';
                            try {
                                const parsed = JSON.parse(doc.reference_numbers || '[]');
                                if (Array.isArray(parsed)) refs = parsed.join(', ');
                                else refs = doc.reference_numbers || '';
                            } catch (e) {
                                refs = doc.reference_numbers || '';
                            }

                            return (
                                <tr
                                    key={doc.id}
                                    onClick={() => router.push(doc.status === 'review' ? `/review?id=${doc.id}` : `/documents?id=${doc.id}`)}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3"><TypeBadge type={doc.document_type} /></td>
                                    <td className="px-4 py-3 font-mono text-slate-700">{truncate(refs, 20)}</td>
                                    <td className="px-4 py-3 text-slate-700">{truncate(doc.shipper_name, 30)}</td>
                                    <td className="px-4 py-3"><ConfBadge score={doc.overall_confidence} /></td>
                                    <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                                    <td className="px-4 py-3 text-slate-500">{formatDate(doc.uploaded_at)}</td>
                                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                        {doc.status === 'failed' ? (
                                            <Btn
                                                size="sm"
                                                variant="outline"
                                                loading={retryingIds.has(doc.id)}
                                                onClick={(e) => handleRetry(doc.id, e)}
                                            >
                                                Retry
                                            </Btn>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List */}
            <div className="sm:hidden flex flex-col gap-3">
                {documents.map((doc) => {
                    let refs = '';
                    try {
                        const parsed = JSON.parse(doc.reference_numbers || '[]');
                        if (Array.isArray(parsed)) refs = parsed.join(', ');
                        else refs = doc.reference_numbers || '';
                    } catch (e) {
                        refs = doc.reference_numbers || '';
                    }

                    return (
                        <div
                            key={doc.id}
                            onClick={() => router.push(doc.status === 'review' ? `/review?id=${doc.id}` : `/documents?id=${doc.id}`)}
                        >
                            <Card className="p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <TypeBadge type={doc.document_type} />
                                    <StatusBadge status={doc.status} />
                                </div>
                                <div className="space-y-1 mb-3">
                                    <div className="font-mono text-sm text-slate-700">{truncate(refs, 25)}</div>
                                    <div className="text-sm text-slate-600">{truncate(doc.shipper_name, 35)}</div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <ConfBadge score={doc.overall_confidence} />
                                    <span>{formatDate(doc.uploaded_at)}</span>
                                </div>
                                {doc.status === 'failed' && (
                                    <div className="mt-3 pt-3 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                                        <Btn
                                            size="sm"
                                            variant="outline"
                                            loading={retryingIds.has(doc.id)}
                                            onClick={(e) => handleRetry(doc.id, e)}
                                            className="w-full"
                                        >
                                            Retry Extraction
                                        </Btn>
                                    </div>
                                )}
                            </Card>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <Card className="mt-4 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-slate-600">
                        Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-semibold text-slate-900">{Math.min(page * limit, total)}</span> of{' '}
                        <span className="font-semibold text-slate-900">{total}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                        <Btn
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            className="gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </Btn>
                        <div className="hidden sm:flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                                            page === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="sm:hidden text-sm text-slate-600 font-medium px-3">
                            Page {page} of {totalPages}
                        </div>
                        <Btn
                            variant="outline"
                            size="sm"
                            disabled={page === totalPages}
                            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                            className="gap-1"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Btn>
                    </div>
                </Card>
            )}
        </div>
    );
}
