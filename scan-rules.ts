export type ScanRule = {
    urlPattern: string;
    paramName: string;
    method: string;
};

export const METHODS = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

export const DEFAULT_RULES: ScanRule[] = [
    {
        urlPattern: '/api/tenant/outbound/pickupprint/savePrint',
        paramName: 'productSku',
        method: 'GET'
    }
];

export const SETTINGS_MSG = '__BARCODE_MODIFIER_SETTINGS__';
export const TOAST_MSG = '__BARCODE_MODIFIER_TOAST__';

export function normalizeRules(input: unknown): ScanRule[] {
    if (!Array.isArray(input)) return DEFAULT_RULES.map(r => ({ ...r }));
    const out: ScanRule[] = [];
    for (const item of input) {
        if (!item || typeof item !== 'object') continue;
        const r = item as Record<string, unknown>;
        const urlPattern = typeof r.urlPattern === 'string' ? r.urlPattern : '';
        const paramName = typeof r.paramName === 'string' ? r.paramName.trim() : '';
        const methodRaw = typeof r.method === 'string' ? r.method.toUpperCase() : 'ALL';
        const method = (METHODS as readonly string[]).includes(methodRaw) ? methodRaw : 'ALL';
        if (!paramName) continue;
        out.push({ urlPattern, paramName, method });
    }
    return out;
}
