import React from 'react';
import { ExtractedField } from '../../lib/types';
import { Card } from '../ui/Card';
import { ConfBadge } from '../ui/ConfBadge';
import { FIELD_LABELS } from '../../lib/utils';
import { cn } from '../../lib/utils';

export function FieldForm({
    fields,
    fieldValues,
    editedFields,
    onChange,
}: {
    fields: ExtractedField[];
    fieldValues: Record<string, string>;
    editedFields: Set<string>;
    onChange: (name: string, value: string) => void;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
                const isAddress = field.field_name.includes('address');
                const isEdited = editedFields.has(field.field_name);
                const label = FIELD_LABELS[field.field_name] || field.field_name;

                // Parse reference_numbers JSON array if needed
                let val = fieldValues[field.field_name] || '';

                return (
                    <Card key={field.id} className={cn('p-4', isEdited && 'border-amber-200 ring-1 ring-amber-100 bg-amber-50/10')}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                            <ConfBadge score={field.confidence} />
                            {isEdited && (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 tracking-wide ml-auto">
                                    Edited
                                </span>
                            )}
                        </div>
                        {isAddress ? (
                            <textarea
                                value={val}
                                onChange={(e) => onChange(field.field_name, e.target.value)}
                                rows={3}
                                placeholder={`Enter ${label.toLowerCase()}`}
                                className="w-full text-sm placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow resize-y"
                            />
                        ) : (
                            <input
                                type="text"
                                value={val}
                                onChange={(e) => onChange(field.field_name, e.target.value)}
                                placeholder={`Enter ${label.toLowerCase()}`}
                                className="w-full text-sm placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                            />
                        )}
                        {field.confidence < 60 && !isEdited && (
                            <p className="text-[11px] text-rose-600 mt-1.5 font-medium flex items-center gap-1">
                                <span>⚠</span> Low confidence field, please review carefully
                            </p>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
