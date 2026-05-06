<script setup lang="ts">
import { Storage } from '@plasmohq/storage';
import { onMounted, ref } from 'vue';

import { type Lang, t } from '~i18n';
import { DEFAULT_RULES, METHODS, normalizeRules, type ScanRule } from './scan-rules';

const storage = new Storage({ area: 'sync' });

const version =
    typeof chrome !== 'undefined' && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : '';

const enabled = ref(true);
const prefix = ref('');
const suffix = ref('_111');
const appendEnter = ref(true);
const interceptInput = ref(false);
const lang = ref<Lang>('en');
const rules = ref<ScanRule[]>(DEFAULT_RULES.map(r => ({ ...r })));
const saved = ref(false);

onMounted(async () => {
    const [e, p, s, ae, ii, l, r] = await Promise.all([
        storage.get<boolean>('enabled'),
        storage.get<string>('prefix'),
        storage.get<string>('suffix'),
        storage.get<boolean>('appendEnter'),
        storage.get<boolean>('interceptInput'),
        storage.get<Lang>('lang'),
        storage.get<ScanRule[]>('rules')
    ]);
    if (e !== undefined) enabled.value = e;
    if (p !== undefined) prefix.value = p;
    if (s !== undefined) suffix.value = s;
    if (ae !== undefined) appendEnter.value = ae;
    if (ii !== undefined) interceptInput.value = ii;
    if (l) lang.value = l;
    if (r !== undefined) rules.value = normalizeRules(r);
});

const addRule = () => {
    rules.value.push({ urlPattern: '', paramName: '', method: 'ALL' });
};

const removeRule = (idx: number) => {
    rules.value.splice(idx, 1);
};

const saveSettings = async () => {
    const cleaned = normalizeRules(rules.value);
    rules.value = cleaned;
    await Promise.all([
        storage.set('enabled', enabled.value),
        storage.set('prefix', prefix.value),
        storage.set('suffix', suffix.value),
        storage.set('appendEnter', appendEnter.value),
        storage.set('interceptInput', interceptInput.value),
        storage.set('lang', lang.value),
        storage.set('rules', cleaned)
    ]);
    saved.value = true;
    setTimeout(() => (saved.value = false), 1500);
};
</script>

<template>
    <div class="container">
        <div class="title">
            {{ t(lang, 'title') }}
            <span v-if="version" class="version">v{{ version }}</span>
        </div>

        <div class="row">
            <span class="label">{{ t(lang, 'enable') }}</span>
            <button class="toggle" :style="{ background: enabled ? '#3b82f6' : '#d1d5db' }" @click="enabled = !enabled">
                <span class="toggle-knob" :style="{ left: enabled ? '22px' : '2px' }" />
            </button>
        </div>

        <div class="row">
            <span class="label" :title="t(lang, 'interceptInputHint')">{{ t(lang, 'interceptInput') }}</span>
            <button
                class="toggle"
                :style="{ background: interceptInput ? '#3b82f6' : '#d1d5db' }"
                @click="interceptInput = !interceptInput"
            >
                <span class="toggle-knob" :style="{ left: interceptInput ? '22px' : '2px' }" />
            </button>
        </div>

        <div class="row">
            <span class="label">{{ t(lang, 'prefix') }}</span>
            <input class="input" :placeholder="t(lang, 'prefixPlaceholder')" v-model="prefix" />
        </div>

        <div class="row">
            <span class="label">{{ t(lang, 'suffix') }}</span>
            <input class="input" :placeholder="t(lang, 'suffixPlaceholder')" v-model="suffix" />
        </div>

        <div class="row">
            <span class="label" :title="t(lang, 'appendEnterHint')">{{ t(lang, 'appendEnter') }}</span>
            <button
                class="toggle"
                :style="{ background: appendEnter ? '#3b82f6' : '#d1d5db' }"
                @click="appendEnter = !appendEnter"
            >
                <span class="toggle-knob" :style="{ left: appendEnter ? '22px' : '2px' }" />
            </button>
        </div>

        <div class="row">
            <span class="label">{{ t(lang, 'language') }}</span>
            <div style="display: flex; gap: 6px">
                <button
                    class="lang-btn"
                    :style="{
                        background: lang === 'zh' ? '#3b82f6' : '#fff',
                        color: lang === 'zh' ? '#fff' : '#333'
                    }"
                    @click="lang = 'zh'"
                >
                    中文
                </button>
                <button
                    class="lang-btn"
                    :style="{
                        background: lang === 'en' ? '#3b82f6' : '#fff',
                        color: lang === 'en' ? '#fff' : '#333'
                    }"
                    @click="lang = 'en'"
                >
                    EN
                </button>
            </div>
        </div>

        <div class="section">
            <div class="section-head">
                <span class="section-title">{{ t(lang, 'rulesTitle') }}</span>
                <button class="add-btn" @click="addRule">+ {{ t(lang, 'addRule') }}</button>
            </div>
            <div class="rule-empty" v-if="rules.length === 0">{{ t(lang, 'noRules') }}</div>
            <div class="rule" v-for="(rule, idx) in rules" :key="idx">
                <div class="rule-row">
                    <span class="rule-label">URL</span>
                    <input
                        class="input rule-input"
                        :placeholder="t(lang, 'urlPatternPlaceholder')"
                        v-model="rule.urlPattern"
                    />
                </div>
                <div class="rule-row">
                    <span class="rule-label">{{ t(lang, 'paramName') }}</span>
                    <input
                        class="input rule-input"
                        :placeholder="t(lang, 'paramNamePlaceholder')"
                        v-model="rule.paramName"
                    />
                </div>
                <div class="rule-row">
                    <span class="rule-label">{{ t(lang, 'method') }}</span>
                    <select class="input rule-input" v-model="rule.method">
                        <option v-for="m in METHODS" :key="m" :value="m">{{ m }}</option>
                    </select>
                    <button class="remove-btn" @click="removeRule(idx)" :title="t(lang, 'removeRule')">×</button>
                </div>
            </div>
        </div>

        <button class="btn" @click="saveSettings">
            {{ saved ? `✓ ${t(lang, 'saved')}` : t(lang, 'save') }}
        </button>
    </div>
</template>

<style scoped>
.container {
    width: 300px;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: #333;
}
.title {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 16px;
    text-align: center;
}
.version {
    margin-left: 6px;
    font-size: 11px;
    font-weight: 500;
    color: #9ca3af;
    vertical-align: middle;
}
.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}
.label {
    font-weight: 500;
    min-width: 50px;
}
.input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    margin-left: 8px;
}
.toggle {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
}
.toggle-knob {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    position: absolute;
    top: 2px;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.btn {
    width: 100%;
    padding: 8px 0;
    border: none;
    border-radius: 6px;
    background: #3b82f6;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 8px;
}
.lang-btn {
    padding: 4px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-size: 13px;
}
.section {
    border-top: 1px solid #e5e7eb;
    margin-top: 12px;
    padding-top: 12px;
}
.section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}
.section-title {
    font-weight: 600;
    font-size: 13px;
    color: #374151;
}
.add-btn {
    padding: 2px 10px;
    border: 1px solid #3b82f6;
    border-radius: 4px;
    background: #fff;
    color: #3b82f6;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
}
.add-btn:hover {
    background: #eff6ff;
}
.rule-empty {
    color: #9ca3af;
    font-size: 12px;
    text-align: center;
    padding: 8px 0;
}
.rule {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px;
    margin-bottom: 8px;
}
.rule-row {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    gap: 6px;
}
.rule-row:last-child {
    margin-bottom: 0;
}
.rule-label {
    font-size: 11px;
    color: #6b7280;
    min-width: 38px;
    flex-shrink: 0;
}
.rule-input {
    flex: 1;
    margin-left: 0;
    padding: 4px 8px;
    font-size: 12px;
}
.remove-btn {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: 1px solid #fecaca;
    background: #fff;
    color: #ef4444;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0;
    flex-shrink: 0;
}
.remove-btn:hover {
    background: #fef2f2;
}
</style>
