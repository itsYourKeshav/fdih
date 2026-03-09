'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { MobileDrawer } from '../components/layout/MobileDrawer';
import './globals.css';
import type { Metadata } from 'next';

function AppLayout({ children }: { children: React.ReactNode }) {
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

    return (
        <div className="flex min-h-screen">
            {/* Sidebar - hidden on mobile, visible on lg */}
            <Sidebar />
            {/* Spacer for fixed sidebar */}
            <div className="w-14 lg:w-56 shrink-0" />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile top bar */}
                <div className="lg:hidden flex items-center h-14 px-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                    <button
                        onClick={() => setIsMobileDrawerOpen(true)}
                        aria-label="Open menu"
                        className="p-1 -ml-1"
                    >
                        <Menu className="w-6 h-6 text-slate-600" />
                    </button>
                    <span className="ml-3 font-semibold text-slate-900">FDIH</span>
                </div>
                <main className="flex-1 overflow-auto">{children}</main>
            </div>

            <MobileDrawer
                isOpen={isMobileDrawerOpen}
                onClose={() => setIsMobileDrawerOpen(false)}
            />
        </div>
    );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <title>FDIH — Freight Document Intelligence Hub</title>
                <meta name="description" content="AI-powered freight document extraction and review platform by Aulintri" />
            </head>
            <body className="bg-slate-50 text-slate-900 font-sans antialiased">
                <AppLayout>{children}</AppLayout>
            </body>
        </html>
    );
}
