'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { FieldAccuracyChart } from '../../components/features/charts/FieldAccuracyChart';
import { TrendChart } from '../../components/features/charts/TrendChart';
import { DistributionChart } from '../../components/features/charts/DistributionChart';
import { getFieldAccuracy, getTrend, getDistribution } from '../../lib/api';
import { FieldAccuracyItem, TrendMonth, DistributionTier } from '../../lib/types';

export default function AnalyticsPage() {
    const [fieldData, setFieldData] = useState<FieldAccuracyItem[]>([]);
    const [trendData, setTrendData] = useState<TrendMonth[]>([]);
    const [distData, setDistData] = useState<DistributionTier[]>([]);

    const [loading, setLoading] = useState(true);
    const [errorChart, setErrorChart] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [accuracyRes, trendRes, distRes] = await Promise.all([
                    getFieldAccuracy(),
                    getTrend(),
                    getDistribution(),
                ]);
                setFieldData(accuracyRes.fields);
                setTrendData(trendRes.months);
                setDistData(distRes.distribution);
            } catch (e: any) {
                setErrorChart(e.message || 'Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <PageHeader title="Analytics" />

            <div className="flex-1 p-4 lg:p-6 space-y-6">
                {errorChart && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
                        {errorChart}
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <FieldAccuracyChart data={fieldData} loading={loading} />

                    <div className="flex flex-col gap-6">
                        <TrendChart data={trendData} loading={loading} />
                        <DistributionChart data={distData} loading={loading} />
                    </div>
                </div>
            </div>
        </div>
    );
}
