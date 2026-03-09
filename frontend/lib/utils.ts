export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

export function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function truncate(str: string | null, n = 40): string {
    if (!str) return '—';
    return str.length > n ? str.slice(0, n) + '…' : str;
}

// Human-readable field labels
export const FIELD_LABELS: Record<string, string> = {
    shipper_name: 'Shipper Name',
    shipper_address: 'Shipper Address',
    consignee_name: 'Consignee Name',
    consignee_address: 'Consignee Address',
    commodity_description: 'Commodity Description',
    quantity_and_units: 'Quantity & Units',
    gross_weight: 'Gross Weight',
    net_weight: 'Net Weight',
    country_of_origin: 'Country of Origin',
    declared_value: 'Declared Value',
    currency: 'Currency',
    incoterms: 'Incoterms',
    document_date: 'Document Date',
    reference_numbers: 'Reference Numbers',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
    commercial_invoice: 'Commercial Invoice',
    packing_list: 'Packing List',
    bill_of_lading: 'Bill of Lading',
};
