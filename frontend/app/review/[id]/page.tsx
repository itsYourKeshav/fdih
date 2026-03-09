'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '../../../components/layout/PageHeader';
import { FilePreview } from '../../../components/features/FilePreview';
import { FieldForm } from '../../../components/features/FieldForm';
import { Btn } from '../../../components/ui/Btn';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { Card } from '../../../components/ui/Card';
import { AlertCircle, Check } from 'lucide-react';
import { DocumentDetailResponse } from '../../../lib/types';
import { getDocument, reviewDocument } from '../../../lib/api';

export default function ReviewPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [data, setData] = useState<DocumentDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [editedFields, setEditedFields] = useState<Set<string>>(new Set());
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false); // Mobile

    useEffect(() => {
        async function fetchDoc() {
            try {
                setLoading(true);
                const res = await getDocument(id);

                // initialize field values
                const initVals: Record<string, string> = {};
                res.fields.forEach(f => {
                    if (f.field_name === 'reference_numbers' && f.ai_value) {
                        try {
                            const parsed = JSON.parse(f.ai_value);
                            initVals[f.field_name] = Array.isArray(parsed) ? parsed.join(', ') : f.ai_value;
                        } catch {
                            initVals[f.field_name] = f.ai_value;
                        }
                    } else {
                        initVals[f.field_name] = f.ai_value || '';
                    }
                });

                setData(res);
                setFieldValues(initVals);
            } catch (e: any) {
                setError(e.message || 'Failed to fetch document');
            } finally {
                setLoading(false);
            }
        }
        fetchDoc();
    }, [id]);

    const handleChange = (name: string, value: string) => {
        setFieldValues(prev => ({ ...prev, [name]: value }));
        const original = data?.fields.find(f => f.field_name === name)?.ai_value || '';

        // special check for reference numbers
        let origComp = original;
        if (name === 'reference_numbers' && original) {
            try {
                const parsed = JSON.parse(original);
                origComp = Array.isArray(parsed) ? parsed.join(', ') : original;
            } catch { }
        }

        setEditedFields(prev => {
            const next = new Set(prev);
            if (value !== origComp) next.add(name);
            else next.delete(name);
            return next;
        });
    };

    const handleSave = async () => {
        if (!data) return;
        try {
            setSaving(true);
            const fieldsToSave = data.fields.map(f => {
                let finalVal = fieldValues[f.field_name];

                if (f.field_name === 'reference_numbers') {
                    const arr = finalVal.split(',').map(s => s.trim()).filter(Boolean);
                    finalVal = JSON.stringify(arr);
                }

                return {
                    field_name: f.field_name,
                    final_value: finalVal,
                };
            });

            await reviewDocument(id, fieldsToSave);
            router.push(`/documents/${id}`);
        } catch (e: any) {
            alert(e.message || 'Failed to save review'); // simple error handling
            setSaving(false);
        }
    };

    const hasLowConfidence = data?.fields.some(f => f.confidence < 60);

    if (loading) {
        return <div className="p-16 flex items-center justify-center h-full"><LoadingSpinner size="lg" /></div>;
    }

    if (error || !data) {
        return <div className="p-16 flex items-center justify-center text-rose-600">{error || 'Not found'}</div>;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <PageHeader title="Review Extraction">
                <div className="flex gap-2">
                    {editedFields.size > 0 ? (
                        <div className="relative">
                            <Btn variant="ghost" onClick={() => setShowDiscardConfirm(!showDiscardConfirm)}>Discard Changes</Btn>
                            {showDiscardConfirm && (
                                <Card className="absolute top-12 right-0 p-4 w-60 z-20">
                                    <p className="text-sm font-medium mb-3">Discard all {editedFields.size} edits?</p>
                                    <div className="flex gap-2">
                                        <Btn size="sm" variant="ghost" className="flex-1" onClick={() => setShowDiscardConfirm(false)}>Cancel</Btn>
                                        <Btn size="sm" variant="danger" className="flex-1" onClick={() => router.push('/')}>Discard</Btn>
                                    </div>
                                </Card>
                            )}
                        </div>
                    ) : (
                        <Btn variant="ghost" onClick={() => router.push('/')}>Cancel</Btn>
                    )}
                    <Btn onClick={handleSave} loading={saving} className="gap-2">
                        <Check className="w-4 h-4 hidden sm:block" />
                        <span>Save Document</span>
                    </Btn>
                </div>
            </PageHeader>

            {hasLowConfidence && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start sm:items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <p className="text-sm text-amber-800 font-medium">
                        This document has low confidence fields. Please review them carefully before saving.
                    </p>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <div className="flex flex-col md:grid md:grid-cols-[280px_1fr] lg:grid-cols-[400px_1fr] gap-6 p-4 lg:p-6 h-full">
                    <div className="order-2 md:order-1 h-full flex flex-col min-h-0 hidden md:block">
                        <h2 className="text-sm font-semibold text-slate-900 mb-3 shrink-0">Original Document</h2>
                        <FilePreview documentId={data.document.id} filename={data.document.original_filename} />
                    </div>

                    <div className="order-1 md:order-2 flex flex-col min-h-0 bg-slate-50">
                        <h2 className="text-sm font-semibold text-slate-900 mb-3 shrink-0 flex items-center justify-between">
                            <span>Extracted Data</span>
                            <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 rounded-full py-0.5">{data.fields.length} Fields</span>
                        </h2>
                        <div className="flex-1 overflow-auto pr-2 custom-scrollbar">

                            {/* Mobile Preview Toggle */}
                            <div className="md:hidden mb-4">
                                <FilePreview
                                    documentId={data.document.id}
                                    filename={data.document.original_filename}
                                    isOpen={previewOpen}
                                    onToggle={() => setPreviewOpen(!previewOpen)}
                                />
                            </div>

                            <FieldForm
                                fields={data.fields}
                                fieldValues={fieldValues}
                                editedFields={editedFields}
                                onChange={handleChange}
                            />
                            <div className="h-4"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
