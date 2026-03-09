import React from 'react';
import { cn } from '../../lib/utils';

export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
    return (
        <div
            className={cn(
                'border-2 rounded-full animate-spin border-blue-600 border-t-transparent',
                size === 'sm' && 'w-4 h-4',
                size === 'md' && 'w-6 h-6',
                size === 'lg' && 'w-8 h-8',
                className
            )}
        />
    );
}
