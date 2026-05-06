import { Storage } from '@plasmohq/storage';
import { createApp, defineComponent, h, ref } from 'vue';

import { DEFAULT_RULES, normalizeRules, type ScanRule, SETTINGS_MSG } from '../scan-rules';

const TOAST_MSG = '__BARCODE_MODIFIER_TOAST__';

import { type Lang, t } from '~i18n';

const storage = new Storage({ area: 'sync' });

const BARCODE_KEY = /^[\x20-\x7E]$/;
const MAX_INTERVAL = 80;
const MIN_BARCODE_LEN = 3;
const MAX_BUFFER = 100;
const TERMINATOR_KEYS = new Set(['Enter', 'Tab']);
const IGNORED_KEYS = new Set([
    'Shift',
    'Control',
    'Alt',
    'Meta',
    'CapsLock',
    'NumLock',
    'ScrollLock',
    'Fn',
    'FnLock',
    'Hyper',
    'Super',
    'OS',
    'ContextMenu',
    'Dead',
    'Process',
    'Unidentified'
]);

// ── Toast ──────────────────────────────────────────────────────────────────────
interface ToastData {
    original: string;
    modified: string;
    source?: 'input' | 'network';
    paramName?: string;
}

const toastData = ref<ToastData | null>(null);
const toastLang = ref<Lang>('en');

const ToastApp = defineComponent({
    setup() {
        return () => {
            const d = toastData.value;
            if (!d) return null;
            const lang = toastLang.value;
            return h(
                'div',
                {
                    style: {
                        position: 'fixed',
                        top: '16px',
                        right: '16px',
                        zIndex: 2147483647,
                        background: '#1f2937',
                        color: '#f9fafb',
                        borderRadius: '10px',
                        padding: '12px 18px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        fontSize: '13px',
                        lineHeight: 1.5,
                        minWidth: '200px',
                        animation: 'barcodeToastIn 0.3s ease-out'
                    }
                },
                [
                    h(
                        'div',
                        { style: { fontWeight: 700, marginBottom: '6px', fontSize: '14px' } },
                        d.source === 'network' ? t(lang, 'toastNetworkFixed') : t(lang, 'toastModified')
                    ),
                    d.source === 'network' && d.paramName
                        ? h(
                              'div',
                              { style: { opacity: 0.7, fontSize: '11px', marginBottom: '4px' } },
                              `${t(lang, 'paramName')}: ${d.paramName}`
                          )
                        : null,
                    h('div', { style: { opacity: 0.7, fontSize: '11px' } }, t(lang, 'original') + ':'),
                    h('div', { style: { wordBreak: 'break-all', marginBottom: '4px' } }, d.original),
                    h('div', { style: { opacity: 0.7, fontSize: '11px' } }, t(lang, 'modified') + ':'),
                    h('div', { style: { wordBreak: 'break-all', fontWeight: 600, color: '#60a5fa' } }, d.modified)
                ]
            );
        };
    }
});

function mountToast() {
    // Inject keyframe CSS once
    const styleId = 'barcode-toast-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `@keyframes barcodeToastIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }`;
        document.head.appendChild(style);
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    createApp(ToastApp).mount(host);
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(data: ToastData) {
    toastData.value = data;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastData.value = null;
    }, 2500);
}

// ── Settings ───────────────────────────────────────────────────────────────────
const settings = {
    enabled: true,
    prefix: '',
    suffix: '_111',
    appendEnter: true,
    interceptInput: false,
    rules: DEFAULT_RULES.map(r => ({ ...r })) as ScanRule[]
};

function broadcastSettings() {
    window.postMessage(
        {
            type: SETTINGS_MSG,
            payload: {
                enabled: settings.enabled,
                prefix: settings.prefix,
                suffix: settings.suffix,
                rules: settings.rules
            }
        },
        '*'
    );
}

async function loadSettings() {
    const [e, p, s, ae, l, r, ii] = await Promise.all([
        storage.get<boolean>('enabled'),
        storage.get<string>('prefix'),
        storage.get<string>('suffix'),
        storage.get<boolean>('appendEnter'),
        storage.get<Lang>('lang'),
        storage.get<ScanRule[]>('rules'),
        storage.get<boolean>('interceptInput')
    ]);
    settings.enabled = e !== undefined ? e : true;
    settings.prefix = p ?? '';
    settings.suffix = s ?? '_111';
    settings.appendEnter = ae !== undefined ? ae : true;
    settings.interceptInput = ii !== undefined ? ii : false;
    toastLang.value = l ?? 'en';
    settings.rules = r === undefined ? DEFAULT_RULES.map(x => ({ ...x })) : normalizeRules(r);
    broadcastSettings();
}

storage.watch({
    enabled: c => {
        if (c.newValue !== undefined) {
            settings.enabled = c.newValue;
            broadcastSettings();
        }
    },
    prefix: c => {
        if (c.newValue !== undefined) {
            settings.prefix = c.newValue;
            broadcastSettings();
        }
    },
    suffix: c => {
        if (c.newValue !== undefined) {
            settings.suffix = c.newValue;
            broadcastSettings();
        }
    },
    rules: c => {
        if (c.newValue !== undefined) {
            settings.rules = normalizeRules(c.newValue);
            broadcastSettings();
        }
    },
    appendEnter: c => {
        if (c.newValue !== undefined) settings.appendEnter = c.newValue;
    },
    interceptInput: c => {
        if (c.newValue !== undefined) settings.interceptInput = c.newValue;
    },
    lang: c => {
        if (c.newValue !== undefined) toastLang.value = c.newValue as Lang;
    }
});

// ── Input helper ───────────────────────────────────────────────────────────────
function replaceLastChars(el: HTMLInputElement | HTMLTextAreaElement, count: number, replacement: string) {
    const start = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, start - count);
    const after = el.value.slice(start);
    el.value = before + replacement + after;
    const newPos = before.length + replacement.length;
    el.setSelectionRange(newPos, newPos);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ── Keyboard interceptor ────────────────────────────────────────────────────────
const buffer: { char: string; time: number }[] = [];

function onKeyDown(e: KeyboardEvent) {
    if (!settings.enabled || !settings.interceptInput) return;

    const key = e.key;
    const now = Date.now();

    if (TERMINATOR_KEYS.has(key)) {
        if (buffer.length >= MIN_BARCODE_LEN && now - buffer[buffer.length - 1].time <= MAX_INTERVAL) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const raw = buffer.map(b => b.char).join('');
            const modified = settings.prefix + raw + settings.suffix;

            const active = document.activeElement;
            if (active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
                replaceLastChars(active, buffer.length, modified);
            } else {
                document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: modified, bubbles: true }));
            }

            showToast({ original: raw, modified, source: 'input' });
            buffer.length = 0;

            if (settings.appendEnter && active) {
                // 1) Dispatch synthetic Enter events so framework listeners
                //    (Vue @keydown.enter / React onKeyDown === 'Enter' / etc.) fire.
                const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
                const kd = new KeyboardEvent('keydown', opts);
                active.dispatchEvent(kd);
                active.dispatchEvent(new KeyboardEvent('keypress', opts));
                active.dispatchEvent(new KeyboardEvent('keyup', opts));

                // 2) If inside a form and keydown wasn't cancelled, also trigger native submit
                //    (synthetic events won't cause implicit form submission because isTrusted=false).
                if (!kd.defaultPrevented && active instanceof HTMLInputElement && active.form) {
                    if (typeof active.form.requestSubmit === 'function') {
                        try {
                            active.form.requestSubmit();
                        } catch {
                            active.form.submit();
                        }
                    } else {
                        active.form.submit();
                    }
                }
            }
            return;
        }
        buffer.length = 0;
        return;
    }

    if (key.length === 1 && BARCODE_KEY.test(key)) {
        if (buffer.length > 0 && now - buffer[buffer.length - 1].time > MAX_INTERVAL) {
            buffer.length = 0;
        }
        buffer.push({ char: key, time: now });
        if (buffer.length > MAX_BUFFER) buffer.shift();
    } else if (!IGNORED_KEYS.has(key)) {
        buffer.length = 0;
    }
}

// ── Toast bridge: receive notifications from main-world xhr-hook ───────────────
window.addEventListener('message', e => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.type !== TOAST_MSG || typeof d.payload !== 'object' || d.payload === null) return;
    const { original, modified, paramName } = d.payload;
    if (typeof original !== 'string' || typeof modified !== 'string') return;
    showToast({
        original,
        modified,
        source: 'network',
        paramName: typeof paramName === 'string' ? paramName : undefined
    });
});

// ── Bootstrap ──────────────────────────────────────────────────────────────────
loadSettings().then(() => {
    mountToast();
    document.addEventListener('keydown', onKeyDown, true);
});
