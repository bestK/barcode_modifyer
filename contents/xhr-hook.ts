import type { PlasmoCSConfig } from 'plasmo';

import { DEFAULT_RULES, normalizeRules, type ScanRule, SETTINGS_MSG } from '../scan-rules';

const TOAST_MSG = '__BARCODE_MODIFIER_TOAST__';

export const config: PlasmoCSConfig = {
    matches: ['<all_urls>'],
    world: 'MAIN',
    run_at: 'document_start',
    all_frames: true
};

const settings = {
    enabled: true,
    prefix: '',
    suffix: '_111',
    rules: DEFAULT_RULES.map(r => ({ ...r })) as ScanRule[]
};

window.addEventListener('message', e => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.type !== SETTINGS_MSG || typeof d.payload !== 'object' || d.payload === null) return;
    if (typeof d.payload.enabled === 'boolean') settings.enabled = d.payload.enabled;
    if (typeof d.payload.prefix === 'string') settings.prefix = d.payload.prefix;
    if (typeof d.payload.suffix === 'string') settings.suffix = d.payload.suffix;
    if (Array.isArray(d.payload.rules)) settings.rules = normalizeRules(d.payload.rules);
});

function fixValue(raw: string): string {
    if (!settings.enabled || !raw) return raw;
    const { prefix, suffix } = settings;
    let v = raw;
    if (prefix && !v.startsWith(prefix)) v = prefix + v;
    if (suffix && !v.endsWith(suffix)) v = v + suffix;
    return v;
}

function notifyToast(paramName: string, original: string, modified: string) {
    window.postMessage(
        {
            type: TOAST_MSG,
            payload: { paramName, original, modified }
        },
        '*'
    );
}

function methodMatches(rule: ScanRule, method: string): boolean {
    return rule.method === 'ALL' || rule.method === method.toUpperCase();
}

function urlMatches(rule: ScanRule, url: string): boolean {
    return !rule.urlPattern || url.indexOf(rule.urlPattern) >= 0;
}

function rulesFor(url: string, method: string): ScanRule[] {
    if (!settings.enabled) return [];
    return settings.rules.filter(r => r.paramName && methodMatches(r, method) && urlMatches(r, url));
}

function patchUrl(rawUrl: string, method: string): string {
    if (!rawUrl) return rawUrl;
    const matched = rulesFor(rawUrl, method);
    if (matched.length === 0) return rawUrl;

    let url: URL;
    try {
        url = new URL(rawUrl, location.href);
    } catch {
        return rawUrl;
    }

    let changed = false;
    for (const rule of matched) {
        const cur = url.searchParams.get(rule.paramName);
        if (cur === null) continue;
        const fixed = fixValue(cur);
        if (fixed !== cur) {
            url.searchParams.set(rule.paramName, fixed);
            changed = true;
            console.log(`[Barcode Modifier] ${rule.paramName} fixed (url):`, cur, '→', fixed);
            notifyToast(rule.paramName, cur, fixed);
        }
    }

    return changed ? url.toString() : rawUrl;
}

function patchBody(body: any, url: string, method: string): any {
    if (body == null) return body;
    const matched = rulesFor(url, method);
    if (matched.length === 0) return body;

    if (typeof body === 'string') {
        if (!matched.some(r => body.indexOf(r.paramName) >= 0)) return body;
        const trimmed = body.trim();

        // JSON
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const obj = JSON.parse(body);
                if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                    let changed = false;
                    for (const rule of matched) {
                        if (!(rule.paramName in obj)) continue;
                        const cur = String(obj[rule.paramName] ?? '');
                        const fixed = fixValue(cur);
                        if (fixed !== cur) {
                            obj[rule.paramName] = fixed;
                            changed = true;
                            console.log(`[Barcode Modifier] ${rule.paramName} fixed (json body):`, cur, '→', fixed);
                            notifyToast(rule.paramName, cur, fixed);
                        }
                    }
                    if (changed) return JSON.stringify(obj);
                }
            } catch {}
            return body;
        }

        // urlencoded
        try {
            const params = new URLSearchParams(body);
            let changed = false;
            for (const rule of matched) {
                if (!params.has(rule.paramName)) continue;
                const cur = params.get(rule.paramName)!;
                const fixed = fixValue(cur);
                if (fixed !== cur) {
                    params.set(rule.paramName, fixed);
                    changed = true;
                    console.log(`[Barcode Modifier] ${rule.paramName} fixed (form body):`, cur, '→', fixed);
                    notifyToast(rule.paramName, cur, fixed);
                }
            }
            if (changed) return params.toString();
        } catch {}
        return body;
    }

    if (body instanceof URLSearchParams) {
        for (const rule of matched) {
            if (!body.has(rule.paramName)) continue;
            const cur = body.get(rule.paramName)!;
            const fixed = fixValue(cur);
            if (fixed !== cur) {
                body.set(rule.paramName, fixed);
                console.log(`[Barcode Modifier] ${rule.paramName} fixed (URLSearchParams):`, cur, '→', fixed);
                notifyToast(rule.paramName, cur, fixed);
            }
        }
        return body;
    }

    if (typeof FormData !== 'undefined' && body instanceof FormData) {
        for (const rule of matched) {
            if (!body.has(rule.paramName)) continue;
            const v = body.get(rule.paramName);
            if (typeof v !== 'string') continue;
            const fixed = fixValue(v);
            if (fixed !== v) {
                body.set(rule.paramName, fixed);
                console.log(`[Barcode Modifier] ${rule.paramName} fixed (FormData):`, v, '→', fixed);
                notifyToast(rule.paramName, v, fixed);
            }
        }
        return body;
    }

    return body;
}

const xhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
) {
    const u = typeof url === 'string' ? url : url.toString();
    const m = (method || 'GET').toUpperCase();
    (this as any).__bm_url = u;
    (this as any).__bm_method = m;
    const patched = patchUrl(u, m);
    (this as any).__bm_url = patched;
    return xhrOpen.call(this, method, patched, async ?? true, username ?? null, password ?? null);
} as typeof XMLHttpRequest.prototype.open;

const xhrSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body?: any) {
    const url = (this as any).__bm_url ?? '';
    const method = (this as any).__bm_method ?? 'GET';
    return xhrSend.call(this, patchBody(body, url, method));
} as typeof XMLHttpRequest.prototype.send;

const origFetch = window.fetch;
window.fetch = function (input: any, init?: RequestInit) {
    let newInput: any = input;
    let newInit: RequestInit | undefined = init;

    let urlStr = '';
    let method = (init?.method ?? 'GET').toUpperCase();

    if (typeof input === 'string') {
        urlStr = input;
    } else if (typeof URL !== 'undefined' && input instanceof URL) {
        urlStr = input.toString();
    } else if (typeof Request !== 'undefined' && input instanceof Request) {
        urlStr = input.url;
        method = input.method.toUpperCase();
    }

    const patchedUrl = patchUrl(urlStr, method);
    if (patchedUrl !== urlStr) {
        if (typeof input === 'string' || (typeof URL !== 'undefined' && input instanceof URL)) {
            newInput = patchedUrl;
        } else if (typeof Request !== 'undefined' && input instanceof Request) {
            newInput = new Request(patchedUrl, input);
        }
    }

    if (init && init.body != null) {
        const patched = patchBody(init.body, patchedUrl, method);
        if (patched !== init.body) {
            newInit = { ...init, body: patched };
        }
    }

    return origFetch.call(this, newInput, newInit);
} as typeof window.fetch;

console.log('[Barcode Modifier] XHR/fetch hook installed (main world)');
