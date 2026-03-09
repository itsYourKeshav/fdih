import React from 'react';
import { cn } from '../../lib/utils';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    loading?: boolean;
}

export function Btn({
    variant = 'primary',
    size = 'md',
    loading = false,
    className,
    children,
    disabled,
    ...props
}: BtnProps) {
    return (
        <button
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50',
                size === 'sm' && 'px-3 py-1.5 text-sm min-h-[32px]',
                size === 'md' && 'px-4 py-2 text-sm min-h-[40px]',
                variant === 'primary' && 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                variant === 'ghost' && 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700',
                variant === 'danger' && 'bg-rose-600 hover:bg-rose-700 text-white',
                className
            )}
            {...props}
        >
            {loading ? (
                <span className="border-2 rounded-full animate-spin w-3.5 h-3.5 border-current border-t-transparent mr-2" />
            ) : null}
            {children}
        </button>
    );
}
