'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, BarChart2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();

    const active = (href: string) =>
        pathname === href ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50';

    return (
        <aside
            className={cn(
                'fixed top-0 left-0 z-20 h-screen w-14 lg:w-56 flex-col border-r border-slate-200 bg-white shadow-sm flex',
                className
            )}
        >
            <div className="flex h-14 items-center justify-center lg:justify-start lg:px-6 border-b border-slate-200">
                <Link href="/" className="flex flex-col items-center lg:items-start select-none">
                    <span className="font-bold text-slate-900 leading-tight">FDIH</span>
                    <span className="hidden lg:inline-block text-[10px] text-slate-500 font-medium">
                        Freight Intelligence
                    </span>
                </Link>
            </div>
            <nav className="flex-1 space-y-1 p-2">
                <Link
                    href="/"
                    className={cn(
                        'flex items-center justify-center lg:justify-start gap-3 rounded-lg p-2.5 transition-colors',
                        active('/')
                    )}
                    title="Dashboard"
                >
                    <LayoutDashboard className="h-5 w-5 shrink-0" />
                    <span className="hidden lg:block text-sm font-medium">Dashboard</span>
                </Link>
                <Link
                    href="/upload"
                    className={cn(
                        'flex items-center justify-center lg:justify-start gap-3 rounded-lg p-2.5 transition-colors',
                        active('/upload')
                    )}
                    title="Upload"
                >
                    <Upload className="h-5 w-5 shrink-0" />
                    <span className="hidden lg:block text-sm font-medium">Upload Document</span>
                </Link>
                <Link
                    href="/analytics"
                    className={cn(
                        'flex items-center justify-center lg:justify-start gap-3 rounded-lg p-2.5 transition-colors',
                        active('/analytics')
                    )}
                    title="Analytics"
                >
                    <BarChart2 className="h-5 w-5 shrink-0" />
                    <span className="hidden lg:block text-sm font-medium">Analytics</span>
                </Link>
            </nav>
        </aside>
    );
}
