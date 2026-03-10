'use client';

import { Suspense } from 'react';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { FilePreview } from '../../components/features/FilePreview';
import { CorrectionHistory } from '../../components/features/CorrectionHistory';
import { Btn } from '../../components/ui/Btn';
import { TypeBadge } from '../../components/ui/TypeBadge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfBadge } from '../../components/ui/ConfBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Card } from '../../components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import { DocumentDetailResponse } from '../../lib/types';
import { getDocument, retryDocument } from '../../lib/api';
import { FIELD_LABELS, cn } from '../../lib/utils';

function DocumentDetailPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id') || '';

    const [data, setData] = useState<DocumentDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        async function fetchDoc() {
            if (!id) {
                setError('Document id is required');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const res = await getDocument(id);
                setData(res);
            } catch (e: any) {
                setError(e.message || 'Failed to fetch document');
            } finally {
                setLoading(false);
            }
        }
        fetchDoc();
    }, [id]);

    if (loading) {
        return <div className="p-16 flex items-center justify-center h-[calc(100vh-56px)]"><LoadingSpinner size="lg" /></div>;
    }

    if (error || !data) {
        return <div className="p-16 flex flex-col items-center justify-center h-[calc(100vh-56px)]">
            <p className="text-rose-600 mb-4">{error || 'Document not found'}</p>
            <Btn onClick={() => router.push('/')}>Back to Dashboard</Btn>
        </div>;
    }

    const getReference = () => {
        const refField = data.fields.find(f => f.field_name === 'reference_numbers');
        if (!refField || !refField.final_value) return 'Unknown Reference';
        try {
            const parsed = JSON.parse(refField.final_value);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed.join(', ') : 'Unknown Reference';
        } catch {
            return refField.final_value;
        }
    };

    const handleRetry = async () => {
        if (!data) return;
        try {
            setRetrying(true);
            await retryDocument(data.document.id);
            setData(prev => prev ? {
                ...prev,
                document: {
                    ...prev.document,
                    status: 'processing',
                },
            } : prev);
        } catch (e: any) {
            setError(e.message || 'Failed to retry extraction');
        } finally {
            setRetrying(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-56px)]">
            <PageHeader title={''}>
                <div className="flex-1 flex justify-start -ml-2">
                    <Btn variant="ghost" onClick={() => router.back()} className="border-transparent hover:bg-slate-100 px-2 py-1 gap-1">
                        <ArrowLeft className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-500 font-medium text-sm">Back</span>
                    </Btn>
                </div>

                <div className="flex-1 flex justify-center items-center gap-2 max-w-[50%] min-w-0">
                    <TypeBadge type={data.document.document_type} />
                    <span className="font-mono text-slate-900 font-medium text-sm truncate">{getReference()}</span>
                </div>

                <div className="flex-1 flex justify-end items-center gap-2 relative">
                    <StatusBadge status={data.document.status} />
                    {data.document.status === 'failed' && (
                        <Btn size="sm" variant="outline" loading={retrying} onClick={handleRetry}>
                            Retry
                        </Btn>
                    )}
                    <div className="hidden sm:block pl-2 border-l border-slate-200">
                        <ConfBadge score={data.document.overall_confidence} />
                    </div>
                </div>
            </PageHeader>

            <div className="flex-1 p-4 lg:p-6 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[400px_1fr] gap-6 h-full">
                    <div className="h-full flex flex-col min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 bg-slate-50">
                            <h2 className="text-sm font-semibold text-slate-900">Original Document</h2>
                            <span className="text-xs text-slate-500 max-w-[150px] truncate" title={data.document.original_filename}>{data.document.original_filename}</span>
                        </div>
                        <div className="flex-1 overflow-auto bg-slate-100">
                            <FilePreview documentId={data.document.id} filename={data.document.original_filename} isOpen={true} />
                        </div>
                    </div>

                    <div className="h-full flex flex-col min-h-0 gap-6 overflow-auto pr-2 custom-scrollbar pb-8">
                        <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 shrink-0">
                            <h2 className="text-base font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Extracted Fields</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {data.fields.map((field) => {
                                    let parsedValue = field.final_value;
                                    if (field.field_name === 'reference_numbers' && parsedValue) {
                                        try {
                                            const parsed = JSON.parse(parsedValue);
                                            if (Array.isArray(parsed)) parsedValue = parsed.join(', ');
                                        } catch { }
                                    }

                                    return (
                                        <Card key={field.id} className={cn('p-3 sm:p-4 border-slate-100 shadow-none bg-slate-50/50', field.was_corrected && 'border-amber-100 bg-amber-50/30')}>
                                            <div className="flex items-center justify-between mb-1.5 gap-2">
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest leading-none truncate" title={FIELD_LABELS[field.field_name] || field.field_name}>
                                                    {FIELD_LABELS[field.field_name] || field.field_name}
                                                </span>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {field.was_corrected && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase">Edited</span>}
                                                    <ConfBadge score={field.confidence} />
                                                </div>
                                            </div>

                                            {field.was_corrected && (
                                                <div className="mb-1">
                                                    <span className="text-[10px] text-slate-400 font-medium">Original extraction:</span>
                                                    <p className="text-xs text-slate-400 line-through truncate max-w-full" title={field.ai_value || ''}>
                                                        {field.ai_value ? field.ai_value : <i className="not-italic opacity-70">Not extracted</i>}
                                                    </p>
                                                </div>
                                            )}

                                            <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap break-words">
                                                {parsedValue || <span className="text-slate-400 italic font-normal">Not extracted</span>}
                                            </p>
                                        </Card>
                                    );
                                })}
                            </div>
                        </section>

                        <CorrectionHistory history={data.history} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DocumentDetailPage() {
    return (
        <Suspense fallback={<div className="p-16 flex items-center justify-center h-[calc(100vh-56px)]"><LoadingSpinner size="lg" /></div>}>
            <DocumentDetailPageContent />
        </Suspense>
    );
}