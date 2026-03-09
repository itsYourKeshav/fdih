import React from 'react';
import { cn } from '../../lib/utils';

export function ConfBadge({ score }: { score: number | null }) {
    if (score === null) return <span className="text-xs text-slate-500">—</span>;

    const isEmerald = score >= 85;
    const isAmber = score >= 60 && score < 85;
    const isRose = score < 60;

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                isEmerald && 'bg-emerald-100 text-emerald-700',
                isAmber && 'bg-amber-100 text-amber-700',
                isRose && 'bg-rose-100 text-rose-700'
            )}
        >
            {score}%
        </span>
    );
}
