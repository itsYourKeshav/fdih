import React from 'react';
import { cn, DOC_TYPE_LABELS } from '../../lib/utils';
import { DocumentType } from '../../lib/types';

export function TypeBadge({ type }: { type: DocumentType }) {
    const isCI = type === 'commercial_invoice';
    const isPL = type === 'packing_list';
    const isBL = type === 'bill_of_lading';

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                isCI && 'bg-blue-100 text-blue-700',
                isPL && 'bg-amber-100 text-amber-700',
                isBL && 'bg-slate-100 text-slate-700'
            )}
        >
            {DOC_TYPE_LABELS[type] || type}
        </span>
    );
}
