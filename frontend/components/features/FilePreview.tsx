import React from 'react';
import { Card } from '../ui/Card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function FilePreview({
    documentId,
    filename,
    isOpen = true,
    onToggle,
}: {
    documentId: string;
    filename: string;
    isOpen?: boolean;
    onToggle?: () => void;
}) {
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(filename);
    const fileUrl = `${API_URL}/api/documents/${documentId}/file`;

    return (
        <Card className="flex flex-col overflow-hidden bg-slate-100 border-none shadow-inner w-full min-h-[400px]">
            {onToggle && (
                <button
                    onClick={onToggle}
                    className="w-full bg-white px-4 py-3 text-sm font-medium text-slate-700 flex justify-between items-center border-b border-slate-200 sticky top-0 md:hidden"
                >
                    {isOpen ? 'Hide document' : 'Show document'}
                    <span>{isOpen ? '▲' : '▼'}</span>
                </button>
            )}

            {isOpen && (
                <div className="flex-1 w-full relative">
                    {isImage ? (
                        <img src={fileUrl} alt={filename} className="w-full h-auto object-contain max-h-[80vh] md:max-h-none p-4" />
                    ) : (
                        <iframe src={`${fileUrl}#toolbar=0&view=FitH`} className="w-full h-[60vh] md:h-[calc(100vh-8rem)] absolute inset-0 border-0" title={filename} />
                    )}
                </div>
            )}
        </Card>
    );
}
