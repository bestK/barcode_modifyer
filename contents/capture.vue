<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { Storage } from '@plasmohq/storage';

import { type Lang, t } from '~i18n';

const storage = new Storage({ area: 'sync' });

const BARCODE_KEY = /^[a-zA-Z0-9\-./+$%*\s]$/;
const MAX_INTERVAL = 80;
const MIN_BARCODE_LEN = 3;
const MAX_BUFFER = 100;
const TERMINATOR_KEYS = new Set(['Enter', 'Tab']);

interface ToastData {
    original: string;
    modified: string;
}

const toast = ref<ToastData | null>(null);
const lang = ref<Lang>('en');

const settings = reactive({ enabled: true, prefix: '', suffix: '_111' });
const buffer: { char: string; time: number }[] = [];

let toastTimer: ReturnType<typeof setTimeout> | null = null;
const showToast = (data: ToastData) => {
    toast.value = data;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.value = null;
    }, 2500);
};

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

const onKeyDown = (e: KeyboardEvent) => {
    if (!settings.enabled) return;

    const key = e.key;

    if (TERMINATOR_KEYS.has(key) && buffer.length >= MIN_BARCODE_LEN) {
        let rapid = true;
        for (let i = 1; i < buffer.length; i++) {
            if (buffer[i].time - buffer[i - 1].time > MAX_INTERVAL) {
                rapid = false;
                break;
            }
        }

        if (rapid) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const raw = buffer.map(b => b.char).join('');
            const modified = settings.prefix + raw + settings.suffix;

            const active = document.activeElement;
            if (active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
                replaceLastChars(active, buffer.length, modified);
            } else {
                const ev = new KeyboardEvent('keydown', { key: modified, bubbles: true });
                document.activeElement?.dispatchEvent(ev);
            }

            showToast({ original: raw, modified });
            buffer.length = 0;
            return;
        }
    }

    if (key.length === 1 && BARCODE_KEY.test(key)) {
        buffer.push({ char: key, time: Date.now() });
        if (buffer.length > MAX_BUFFER) buffer.shift();
    } else if (!TERMINATOR_KEYS.has(key)) {
        buffer.length = 0;
    }
};

let unwatch: (() => void) | null = null;

onMounted(async () => {
    const [e, p, s, l] = await Promise.all([
        storage.get<boolean>('enabled'),
        storage.get<string>('prefix'),
        storage.get<string>('suffix'),
        storage.get<Lang>('lang'),
    ]);
    settings.enabled = e !== undefined ? e : true;
    settings.prefix = p ?? '';
    settings.suffix = s ?? '_111';
    lang.value = l ?? 'zh';

    unwatch = storage.watch({
        enabled: c => {
            if (c.newValue !== undefined) settings.enabled = c.newValue;
        },
        prefix: c => {
            if (c.newValue !== undefined) settings.prefix = c.newValue;
        },
        suffix: c => {
            if (c.newValue !== undefined) settings.suffix = c.newValue;
        },
        lang: c => {
            if (c.newValue !== undefined) lang.value = c.newValue as Lang;
        },
    });

    // Inject keyframe animation once
    const id = 'barcode-toast-style';
    if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
      @keyframes barcodeToastIn {
        from { opacity: 0; transform: translateX(40px); }
        to   { opacity: 1; transform: translateX(0); }
      }`;
        document.head.appendChild(style);
    }

    document.addEventListener('keydown', onKeyDown, true);
});

onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown, true);
    if (unwatch) unwatch();
    if (toastTimer) clearTimeout(toastTimer);
});
</script>

<template>
    <div v-if="toast" class="barcode-toast">
        <div class="toast-title">{{ t(lang, 'toastModified') }}</div>
        <div class="toast-label">{{ t(lang, 'original') }}:</div>
        <div class="toast-value">{{ toast.original }}</div>
        <div class="toast-label">{{ t(lang, 'modified') }}:</div>
        <div class="toast-modified">{{ toast.modified }}</div>
    </div>
</template>

<style scoped>
.barcode-toast {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    background: #1f2937;
    color: #f9fafb;
    border-radius: 10px;
    padding: 12px 18px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    min-width: 200px;
    animation: barcodeToastIn 0.3s ease-out;
}
.toast-title {
    font-weight: 700;
    margin-bottom: 6px;
    font-size: 14px;
}
.toast-label {
    opacity: 0.7;
    font-size: 11px;
}
.toast-value {
    word-break: break-all;
    margin-bottom: 4px;
}
.toast-modified {
    word-break: break-all;
    font-weight: 600;
    color: #60a5fa;
}
</style>
