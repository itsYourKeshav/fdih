import React from 'react';
import { useRouter } from 'next/navigation';
import { DocumentListItem } from '../../lib/types';
import { TypeBadge } from '../ui/TypeBadge';
import { ConfBadge } from '../ui/ConfBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDate, truncate } from '../../lib/utils';
import { Card } from '../ui/Card';

export function DocumentTable({ documents }: { documents: DocumentListItem[] }) {
    const router = useRouter();

    if (documents.length === 0) return null;

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
                                    onClick={() => router.push(doc.status === 'review' ? `/review/${doc.id}` : `/documents/${doc.id}`)}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-3"><TypeBadge type={doc.document_type} /></td>
                                    <td className="px-4 py-3 font-mono text-slate-700">{truncate(refs, 20)}</td>
                                    <td className="px-4 py-3 text-slate-700">{truncate(doc.shipper_name, 30)}</td>
                                    <td className="px-4 py-3"><ConfBadge score={doc.overall_confidence} /></td>
                                    <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                                    <td className="px-4 py-3 text-slate-500">{formatDate(doc.uploaded_at)}</td>
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
                            onClick={() => router.push(doc.status === 'review' ? `/review/${doc.id}` : `/documents/${doc.id}`)}
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
                            </Card>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
