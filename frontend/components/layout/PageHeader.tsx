import React from 'react';

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between h-14 px-6 border-b border-slate-200 bg-white sticky top-0 z-10">
            <h1 className="text-xl font-semibold text-slate-900 truncate">{title}</h1>
            {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
        </div>
    );
}
