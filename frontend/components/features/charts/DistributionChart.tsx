import React from 'react';
import { Card } from '../../ui/Card';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { EmptyState } from '../../ui/EmptyState';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DistributionTier } from '../../../lib/types';

export function DistributionChart({ data, loading }: { data: DistributionTier[]; loading: boolean }) {
    if (loading) return <Card className="p-6 h-[340px] flex items-center justify-center"><LoadingSpinner /></Card>;
    const hasData = data && data.some(d => d.count > 0);
    if (!data || !hasData) return <Card className="p-6 h-[340px]"><EmptyState icon={<PieChartIcon />} heading="No Data" subtext="No distribution data yet" /></Card>;

    const COLORS = {
        high: '#059669',   // Emerald
        medium: '#D97706', // Amber
        low: '#E11D48',    // Rose
    };

    const chartData = data.map(d => ({
        name: d.tier.charAt(0).toUpperCase() + d.tier.slice(1) + ' (>=' + (d.tier === 'high' ? '85%' : d.tier === 'medium' ? '60%' : '0%') + ')',
        value: Number(d.count),
        fill: COLORS[d.tier],
    }));

    return (
        <Card className="p-6 h-[340px] flex flex-col">
            <h3 className="text-base font-semibold text-slate-900 mb-2 shrink-0">Confidence Distribution</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => [value, 'Documents']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
