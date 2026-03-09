'use client';

import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { MobileDrawer } from '../components/layout/MobileDrawer';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import './globals.css';
import type { Metadata } from 'next';

function AppLayout({ children }: { children: React.ReactNode }) {
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const savedTheme = (localStorage.getItem('fdih-theme') as 'light' | 'dark' | null) ?? 'light';
        setTheme(savedTheme);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('theme-dark', theme === 'dark');
        localStorage.setItem('fdih-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar - hidden on mobile, visible on lg */}
            <Sidebar theme={theme} onThemeToggle={toggleTheme} />
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
                    <ThemeToggle theme={theme} onToggle={toggleTheme} className="ml-auto" />
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
        <html lang="en" suppressHydrationWarning>
            <head>
                <title>FDIH — Freight Document Intelligence Hub</title>
                <meta name="description" content="AI-powered freight document extraction and review platform by Aulintri" />
            </head>
            <body className="bg-slate-50 text-slate-900 font-sans antialiased transition-colors duration-200">
                <AppLayout>{children}</AppLayout>
            </body>
        </html>
    );
}
