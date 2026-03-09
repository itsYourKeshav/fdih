import React from 'react';
import { Card } from '../ui/Card';
import { Btn } from '../ui/Btn';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ExternalLink, Download } from 'lucide-react';

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
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        setIsLoading(true);
    }, [documentId, filename, isOpen]);

    const iframeSrc = `${fileUrl}#toolbar=0&view=FitH`;

    return (
        <Card className="flex flex-col overflow-hidden bg-slate-100 border border-slate-200 shadow-sm w-full min-h-[400px]">
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
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/80 p-3 backdrop-blur">
                        <p className="max-w-[60%] truncate text-xs font-medium text-slate-600" title={filename}>
                            {filename}
                        </p>
                        <div className="ml-auto flex items-center gap-2">
                            <a href={fileUrl} target="_blank" rel="noreferrer">
                                <Btn size="sm" variant="ghost" className="gap-1">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Open
                                </Btn>
                            </a>
                            <a href={fileUrl} download>
                                <Btn size="sm" variant="ghost" className="gap-1">
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                </Btn>
                            </a>
                        </div>
                    </div>

                    {isLoading && (
                        <div className="absolute inset-x-0 bottom-0 top-14 z-10 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm">
                            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-600">
                                <LoadingSpinner size="sm" />
                                Rendering preview...
                            </div>
                        </div>
                    )}

                    {isImage ? (
                        <img
                            src={fileUrl}
                            alt={filename}
                            onLoad={() => setIsLoading(false)}
                            className="w-full h-auto object-contain max-h-[80vh] md:max-h-none p-4"
                        />
                    ) : (
                        <iframe
                            src={iframeSrc}
                            onLoad={() => setIsLoading(false)}
                            className="w-full h-[60vh] md:h-[calc(100vh-11rem)] border-0"
                            title={filename}
                        />
                    )}
                </div>
            )}
        </Card>
    );
}
