import React from 'react';

export function EmptyState({
    icon,
    heading,
    subtext,
    action,
}: {
    icon: React.ReactNode;
    heading: string;
    subtext: string;
    action?: { label: string; onClick: () => void };
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-500 mb-4">
                {icon}
            </div>
            <h3 className="text-slate-900 font-semibold">{heading}</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">{subtext}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-6 text-blue-600 text-sm font-medium hover:underline focus:outline-none"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
