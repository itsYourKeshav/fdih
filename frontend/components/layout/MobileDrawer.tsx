'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, BarChart2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname();

    const active = (href: string) =>
        pathname === href ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-slate-900/50 transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 left-0 w-[260px] bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out">
                <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200">
                    <div className="flex flex-col select-none">
                        <span className="font-bold text-slate-900 leading-tight block">FDIH</span>
                        <span className="text-[10px] text-slate-500 font-medium block">
                            Freight Intelligence
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                    <Link
                        href="/"
                        onClick={onClose}
                        className={cn('flex items-center gap-3 rounded-lg p-3 transition-colors', active('/'))}
                    >
                        <LayoutDashboard className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">Dashboard</span>
                    </Link>
                    <Link
                        href="/upload"
                        onClick={onClose}
                        className={cn('flex items-center gap-3 rounded-lg p-3 transition-colors', active('/upload'))}
                    >
                        <Upload className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">Upload Document</span>
                    </Link>
                    <Link
                        href="/analytics"
                        onClick={onClose}
                        className={cn('flex items-center gap-3 rounded-lg p-3 transition-colors', active('/analytics'))}
                    >
                        <BarChart2 className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">Analytics</span>
                    </Link>
                </nav>
            </div>
        </div>
    );
}
