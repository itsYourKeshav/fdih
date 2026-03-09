import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface FilterBarProps {
    q: string;
    type: string;
    dateFrom: string;
    dateTo: string;
    country: string;
    onQ: (v: string) => void;
    onType: (v: string) => void;
    onDateFrom: (v: string) => void;
    onDateTo: (v: string) => void;
    onCountry: (v: string) => void;
    countryOptions: string[];
    onClear: () => void;
    hasFilters: boolean;
}

export function FilterBar({
    q, type, dateFrom, dateTo, country,
    onQ, onType, onDateFrom, onDateTo, onCountry,
    countryOptions, onClear, hasFilters,
}: FilterBarProps) {
    const [localQ, setLocalQ] = useState(q);

    useEffect(() => {
        const timer = setTimeout(() => {
            onQ(localQ);
        }, 300);
        return () => clearTimeout(timer);
    }, [localQ, onQ]);

    useEffect(() => {
        setLocalQ(q);
    }, [q]);

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search reference, shipper, consignee..."
                        value={localQ}
                        onChange={(e) => setLocalQ(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <select
                    value={type}
                    onChange={(e) => onType(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="">All Types</option>
                    <option value="commercial_invoice">Commercial Invoice</option>
                    <option value="packing_list">Packing List</option>
                    <option value="bill_of_lading">Bill of Lading</option>
                </select>
                <select
                    value={country}
                    onChange={(e) => onCountry(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="">All Countries</option>
                    {countryOptions.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>
            {(dateFrom || dateTo || hasFilters) && (
                <div className="flex items-center justify-between sm:justify-start gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">From</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => onDateFrom(e.target.value)}
                            className="px-2 py-1 text-sm border border-slate-200 rounded hover:border-slate-300"
                        />
                        <span className="text-sm text-slate-500">To</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => onDateTo(e.target.value)}
                            className="px-2 py-1 text-sm border border-slate-200 rounded hover:border-slate-300"
                        />
                    </div>
                    {hasFilters && (
                        <button
                            onClick={onClear}
                            className="text-sm text-blue-600 hover:underline ml-auto"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
