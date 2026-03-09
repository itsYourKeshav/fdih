'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ThemeToggle({
    theme,
    onToggle,
    className,
}: {
    theme: 'light' | 'dark';
    onToggle: () => void;
    className?: string;
}) {
    const isDark = theme === 'dark';

    return (
        <button
            onClick={onToggle}
            type="button"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold shadow-sm transition-colors',
                isDark
                    ? 'border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-50',
                className
            )}
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
    );
}
