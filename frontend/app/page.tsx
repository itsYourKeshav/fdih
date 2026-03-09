'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCards } from '../components/features/StatCards';
import { FilterBar } from '../components/features/FilterBar';
import { DocumentTable } from '../components/features/DocumentTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { Btn } from '../components/ui/Btn';
import { FileText, Plus } from 'lucide-react';
import { DocumentListItem } from '../lib/types';
import { listDocuments, getDistribution } from '../lib/api';

export default function DashboardPage() {
    const router = useRouter();

    const [documents, setDocuments] = useState<DocumentListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stats state
    const [approvedCount, setApprovedCount] = useState(0);
    const [pendingReviewCount, setPendingReviewCount] = useState(0);
    const [avgConfidence, setAvgConfidence] = useState<number | null>(null);

    // Filters state
    const [q, setQ] = useState('');
    const [type, setType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [country, setCountry] = useState('');
    const [countryOptions, setCountryOptions] = useState<string[]>([]);

    const hasFilters = Boolean(q || type || dateFrom || dateTo || country);

    const fetchDocuments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await listDocuments({
                q, type, date_from: dateFrom, date_to: dateTo, country,
                page: page.toString(), limit: '20'
            });
            setDocuments(res.documents);
            setTotal(res.total);
            setPage(res.page);
            setTotalPages(res.totalPages);

            // Simple stats extraction (could be refined with API data)
            if (res.documents.length > 0) {
                // compute unique countries just from current page (simplified for demo)
                // In real app, /api/countries would be better
                const countries = new Set<string>();
                let confSum = 0;
                let confCount = 0;
                res.documents.forEach(doc => {
                    if (doc.overall_confidence !== null) {
                        confSum += Number(doc.overall_confidence);
                        confCount++;
                    }
                });
                setAvgConfidence(confCount > 0 ? Math.round((confSum / confCount) * 10) / 10 : null);
            } else {
                setAvgConfidence(null);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to fetch documents');
        } finally {
            setLoading(false);
        }
    }, [q, type, dateFrom, dateTo, country, page]);

    const fetchStats = useCallback(async () => {
        try {
            // Just to populate global stats
            const [listRes, distRes] = await Promise.all([
                listDocuments({ page: '1', limit: '1000' }), // hack for full stats
                getDistribution()
            ]);
            const allDocs = listRes.documents;
            setApprovedCount(allDocs.filter(d => d.status === 'approved').length);
            setPendingReviewCount(allDocs.filter(d => ['pending', 'processing', 'review'].includes(d.status)).length);
        } catch (e) {
            // ignore
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const clearFilters = () => {
        setQ('');
        setType('');
        setDateFrom('');
        setDateTo('');
        setCountry('');
        setPage(1);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <PageHeader title="Documents">
                <Btn onClick={() => router.push('/upload')} className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Upload Document</span>
                    <span className="sm:hidden">Upload</span>
                </Btn>
            </PageHeader>

            <div className="flex-1 p-4 lg:p-6 space-y-6">
                <StatCards
                    total={total}
                    approved={approvedCount}
                    pendingReview={pendingReviewCount}
                    avgConfidence={avgConfidence}
                />

                <Card className="p-4">
                    <FilterBar
                        q={q} type={type} dateFrom={dateFrom} dateTo={dateTo} country={country}
                        onQ={(v) => { setQ(v); setPage(1); }}
                        onType={(v) => { setType(v); setPage(1); }}
                        onDateFrom={(v) => { setDateFrom(v); setPage(1); }}
                        onDateTo={(v) => { setDateTo(v); setPage(1); }}
                        onCountry={(v) => { setCountry(v); setPage(1); }}
                        countryOptions={countryOptions}
                        onClear={clearFilters}
                        hasFilters={hasFilters}
                    />
                </Card>

                {loading ? (
                    <Card className="p-16 flex items-center justify-center min-h-[400px]">
                        <LoadingSpinner size="lg" />
                    </Card>
                ) : error ? (
                    <Card className="p-16 flex flex-col items-center justify-center text-center">
                        <p className="text-rose-600 mb-4">{error}</p>
                        <Btn variant="ghost" onClick={fetchDocuments}>Retry</Btn>
                    </Card>
                ) : documents.length === 0 ? (
                    <Card className="min-h-[400px] flex items-center justify-center">
                        <EmptyState
                            icon={<FileText />}
                            heading={hasFilters ? 'No matches found' : 'No documents yet'}
                            subtext={hasFilters ? 'Try adjusting your filters' : 'Upload your first logistics document to get started.'}
                            action={hasFilters ? { label: 'Clear filters', onClick: clearFilters } : { label: 'Upload Document', onClick: () => router.push('/upload') }}
                        />
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <DocumentTable documents={documents} />

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-2">
                                <span className="text-sm text-slate-500">
                                    Showing <span className="font-medium text-slate-900">{(page - 1) * 20 + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * 20, total)}</span> of <span className="font-medium text-slate-900">{total}</span> results
                                </span>
                                <div className="flex gap-2">
                                    <Btn variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Btn>
                                    <Btn variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Btn>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
