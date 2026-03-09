import React from 'react';
import { Card } from '../../ui/Card';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { EmptyState } from '../../ui/EmptyState';
import { BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FieldAccuracyItem } from '../../../lib/types';
import { FIELD_LABELS } from '../../../lib/utils';

export function FieldAccuracyChart({ data, loading }: { data: FieldAccuracyItem[]; loading: boolean }) {
    if (loading) return <Card className="p-6 h-[420px] flex items-center justify-center"><LoadingSpinner /></Card>;
    if (!data || data.length === 0) return <Card className="p-6 h-[420px]"><EmptyState icon={<BarChart2 />} heading="No Data" subtext="No extracted fields yet" /></Card>;

    const chartData = data.map(d => ({
        name: FIELD_LABELS[d.field_name] || d.field_name,
        score: Number(d.avg_confidence),
    }));

    const getColor = (score: number) => {
        if (score >= 85) return '#059669'; // Emerald
        if (score >= 60) return '#D97706'; // Amber
        return '#E11D48'; // Rose
    };

    return (
        <Card className="p-6 h-[420px] flex flex-col">
            <h3 className="text-base font-semibold text-slate-900 mb-4 shrink-0">Average Confidence by Field</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                            formatter={(value: number) => [`${value}%`, 'Confidence']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
