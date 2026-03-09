'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCards } from '../components/features/StatCards';
import { FilterBar } from '../components/features/FilterBar';
import { DocumentTable } from '../components/features/DocumentTable';
import { Btn } from '../components/ui/Btn';
import { Plus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { listDocuments, getDistribution } from '../lib/api';

export default function DashboardPage() {
    const router = useRouter();

    // Stats state
    const [total, setTotal] = useState(0);
    const [approvedCount, setApprovedCount] = useState(0);
    const [pendingReviewCount, setPendingReviewCount] = useState(0);
    const [avgConfidence, setAvgConfidence] = useState<number | null>(null);

    // Filters state
    const [q, setQ] = useState('');
    const [type, setType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [country, setCountry] = useState('');
    const [countryOptions, setCountryOptions] = useState<string[]>([]);

    const hasFilters = Boolean(q || type || dateFrom || dateTo || country);

    const fetchStats = useCallback(async () => {
        try {
            const [listRes] = await Promise.all([
                listDocuments({ page: '1', limit: '1000' })
            ]);
            const allDocs = listRes.documents;
            setTotal(listRes.total);
            setApprovedCount(allDocs.filter(d => d.status === 'approved').length);
            setPendingReviewCount(allDocs.filter(d => ['pending', 'processing', 'review'].includes(d.status)).length);
            
            if (allDocs.length > 0) {
                let confSum = 0;
                let confCount = 0;
                allDocs.forEach(doc => {
                    if (doc.overall_confidence !== null) {
                        confSum += Number(doc.overall_confidence);
                        confCount++;
                    }
                });
                setAvgConfidence(confCount > 0 ? Math.round((confSum / confCount) * 10) / 10 : null);
            } else {
                setAvgConfidence(null);
            }
        } catch (e: any) {
            // ignore stats error
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const clearFilters = () => {
        setQ('');
        setType('');
        setDateFrom('');
        setDateTo('');
        setCountry('');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <PageHeader title="Documents">
                <Btn onClick={() => router.push('/upload')} className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Upload Document</span>
                    <span className="sm:hidden">Upload</span>
                </Btn>
            </PageHeader>

            <div className="flex-1 p-4 lg:p-6 space-y-6">
                <StatCards
                    total={total}
                    approved={approvedCount}
                    pendingReview={pendingReviewCount}
                    avgConfidence={avgConfidence}
                />

                <Card className="p-4">
                    <FilterBar
                        q={q} type={type} dateFrom={dateFrom} dateTo={dateTo} country={country}
                        onQ={setQ}
                        onType={setType}
                        onDateFrom={setDateFrom}
                        onDateTo={setDateTo}
                        onCountry={setCountry}
                        countryOptions={countryOptions}
                        onClear={clearFilters}
                        hasFilters={hasFilters}
                    />
                </Card>

                <DocumentTable
                    filters={{ q, type, dateFrom, dateTo, country }}
                    onClearFilters={clearFilters}
                />
            </div>
        </div>
    );
}
