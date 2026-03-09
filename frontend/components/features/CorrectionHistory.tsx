import React from 'react';
import { CorrectionRow } from '../../lib/types';
import { FIELD_LABELS, formatDateTime, truncate } from '../../lib/utils';

export function CorrectionHistory({ history }: { history: CorrectionRow[] }) {
    if (history.length === 0) {
        return (
            <div className="pt-4 border-t border-slate-200">
                <h3 className="text-base font-semibold text-slate-900 mb-2">Correction History</h3>
                <p className="text-slate-500 text-sm">No corrections were made to this document.</p>
            </div>
        );
    }

    return (
        <div className="pt-6 border-t border-slate-200">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Correction History</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Field</th>
                            <th className="px-4 py-3 font-medium">AI Extracted</th>
                            <th className="px-4 py-3 font-medium">Corrected To</th>
                            <th className="px-4 py-3 font-medium text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {history.map((row) => {
                            const parseIfJson = (val: string | null) => {
                                if (!val) return '—';
                                try {
                                    const arr = JSON.parse(val);
                                    if (Array.isArray(arr)) return arr.join(', ');
                                } catch {
                                    // Not JSON, return as is
                                }
                                return val;
                            };

                            return (
                                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-slate-900 font-medium">
                                        {FIELD_LABELS[row.field_name] || row.field_name}
                                    </td>
                                    <td className="px-4 py-3 text-rose-600 line-through truncate max-w-[200px]" title={parseIfJson(row.ai_value)}>
                                        {truncate(parseIfJson(row.ai_value), 30)}
                                    </td>
                                    <td className="px-4 py-3 text-emerald-600 font-medium truncate max-w-[200px]" title={parseIfJson(row.corrected_value)}>
                                        {truncate(parseIfJson(row.corrected_value), 30)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-right text-xs">
                                        {formatDateTime(row.corrected_at)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
