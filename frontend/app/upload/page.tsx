'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Btn } from '../../components/ui/Btn';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { UploadCloud, FileText, Package, Ship, X, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DocumentType } from '../../lib/types';
import { DOC_TYPE_LABELS } from '../../lib/utils';
import { uploadDocument, getDocumentStatus } from '../../lib/api';

export default function UploadPage() {
    const router = useRouter();

    const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    const [phase, setPhase] = useState<'form' | 'processing' | 'error'>('form');
    const [processingDocId, setProcessingDocId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const docTypes: { type: DocumentType; icon: React.ReactNode }[] = [
        { type: 'commercial_invoice', icon: <FileText className="w-6 h-6 mb-2" /> },
        { type: 'packing_list', icon: <Package className="w-6 h-6 mb-2" /> },
        { type: 'bill_of_lading', icon: <Ship className="w-6 h-6 mb-2" /> },
    ];

    const validateFile = (file: File) => {
        setFileError(null);
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            setFileError('Invalid file type. Accepted: PDF, JPEG, PNG');
            return false;
        }
        if (file.size > 20 * 1024 * 1024) {
            setFileError('File too large. Maximum size is 20 MB.');
            return false;
        }
        return true;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (validateFile(file)) {
                setSelectedFile(file);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (validateFile(file)) {
                setSelectedFile(file);
            }
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile || !selectedType) return;

        try {
            setPhase('processing');
            const res = await uploadDocument(selectedFile, selectedType);
            setProcessingDocId(res.documentId);
        } catch (e: any) {
            setErrorMsg(e.message || 'Error uploading document');
            setPhase('error');
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (phase === 'processing' && processingDocId) {
            interval = setInterval(async () => {
                try {
                    const res = await getDocumentStatus(processingDocId);
                    if (res.status === 'review') {
                        clearInterval(interval);
                        router.push(`/review/${processingDocId}`);
                    } else if (res.status === 'approved') {
                        clearInterval(interval);
                        router.push(`/documents/${processingDocId}`);
                    } else if (res.status === 'failed') {
                        clearInterval(interval);
                        setErrorMsg('Extraction failed');
                        setPhase('error');
                    }
                } catch (e: any) {
                    clearInterval(interval);
                    setErrorMsg('Error checking status');
                    setPhase('error');
                }
            }, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [phase, processingDocId, router]);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <PageHeader title="Upload Document" />
            <div className="flex-1 p-4 lg:p-6 flex justify-center items-start">
                <div className="w-full max-w-2xl mt-4 lg:mt-8">

                    {phase === 'form' && (
                        <div className="space-y-6">
                            {/* Type Selection */}
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900 mb-3">1. Select Document Type</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {docTypes.map(({ type, icon }) => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedType(type)}
                                            className={cn(
                                                'flex flex-col items-center justify-center p-4 rounded-xl border transition-all',
                                                selectedType === type
                                                    ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                            )}
                                        >
                                            {icon}
                                            <span className="font-medium text-sm">{DOC_TYPE_LABELS[type]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* File Dropzone */}
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900 mb-3">2. Upload File</h2>
                                {!selectedFile ? (
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            'border-2 border-dashed rounded-xl p-8 lg:p-12 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[200px]',
                                            dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400'
                                        )}
                                    >
                                        <UploadCloud className={cn('w-10 h-10 mb-4', dragOver ? 'text-blue-500' : 'text-slate-400')} />
                                        <p className="font-medium text-slate-900">Click to upload or drag and drop</p>
                                        <p className="text-sm text-slate-500 mt-1">PDF, JPEG or PNG (max 20MB)</p>
                                        {fileError && <p className="text-sm text-rose-600 mt-3 font-medium flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {fileError}</p>}
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-xl p-4 bg-white flex items-center justify-between">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm text-slate-900 truncate" title={selectedFile.name}>{selectedFile.name}</p>
                                                <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedFile(null)}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="application/pdf,image/jpeg,image/png"
                                    className="hidden"
                                />
                            </div>

                            {/* Submit */}
                            <div className="pt-4 border-t border-slate-200 flex justify-end">
                                <Btn
                                    onClick={handleSubmit}
                                    disabled={!selectedType || !selectedFile}
                                    className="w-full sm:w-auto"
                                >
                                    Process Document
                                </Btn>
                            </div>
                        </div>
                    )}

                    {phase === 'processing' && (
                        <Card className="p-12 flex flex-col items-center justify-center text-center">
                            <LoadingSpinner size="lg" className="mb-6 border-blue-600 border-2" />
                            <h3 className="text-lg font-semibold text-slate-900">Extracting Data</h3>
                            <p className="text-sm text-slate-500 mt-2 max-w-sm">
                                Claude is analyzing {DOC_TYPE_LABELS[selectedType!]} document...<br />
                                This takes about 5-15 seconds.
                            </p>
                        </Card>
                    )}

                    {phase === 'error' && (
                        <Card className="p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Failed</h3>
                            <p className="text-slate-600 mb-8">{errorMsg}</p>
                            <Btn onClick={() => { setPhase('form'); setProcessingDocId(null); setSelectedFile(null); }}>
                                Try Again
                            </Btn>
                        </Card>
                    )}

                </div>
            </div>
        </div>
    );
}
