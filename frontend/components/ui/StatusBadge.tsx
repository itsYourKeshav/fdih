import React from 'react';
import { cn } from '../../lib/utils';
import { DocumentStatus } from '../../lib/types';

export function StatusBadge({ status }: { status: DocumentStatus }) {
    const isApproved = status === 'approved';
    const isReview = status === 'review';
    const isProcessing = status === 'processing';
    const isFailed = status === 'failed';
    const isPending = status === 'pending';

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                isApproved && 'bg-emerald-100 text-emerald-700',
                isReview && 'bg-amber-100 text-amber-700',
                isProcessing && 'bg-blue-100 text-blue-700 animate-pulse',
                isFailed && 'bg-rose-100 text-rose-700',
                isPending && 'bg-slate-100 text-slate-500'
            )}
        >
            {status}
        </span>
    );
}
