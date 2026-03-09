import React from 'react';
import { Card } from '../ui/Card';
import { FileText, CheckCircle, Clock, Target } from 'lucide-react';

export function StatCards({
    total,
    approved,
    pendingReview,
    avgConfidence,
}: {
    total: number;
    approved: number;
    pendingReview: number;
    avgConfidence: number | null;
}) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col items-center justify-center text-center">
                <FileText className="w-8 h-8 text-blue-500 mb-2" />
                <span className="text-2xl font-bold text-slate-900">{total}</span>
                <span className="text-sm text-slate-500">Total Documents</span>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                <span className="text-2xl font-bold text-slate-900">{approved}</span>
                <span className="text-sm text-slate-500">Approved</span>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center text-center">
                <Clock className="w-8 h-8 text-amber-500 mb-2" />
                <span className="text-2xl font-bold text-slate-900">{pendingReview}</span>
                <span className="text-sm text-slate-500">Pending Review</span>
            </Card>
            <Card className="p-4 flex flex-col items-center justify-center text-center">
                <Target className="w-8 h-8 text-indigo-500 mb-2" />
                <span className="text-2xl font-bold text-slate-900">
                    {avgConfidence !== null ? `${avgConfidence}%` : '—'}
                </span>
                <span className="text-sm text-slate-500">Avg. Confidence</span>
            </Card>
        </div>
    );
}
