<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Storage } from '@plasmohq/storage';

import { type Lang, t } from '~i18n';

const storage = new Storage({ area: 'sync' });

const enabled = ref(true);
const prefix = ref('');
const suffix = ref('_111');
const appendEnter = ref(true);
const lang = ref<Lang>('en');
const saved = ref(false);

onMounted(async () => {
    const [e, p, s, ae, l] = await Promise.all([
        storage.get<boolean>('enabled'),
        storage.get<string>('prefix'),
        storage.get<string>('suffix'),
        storage.get<boolean>('appendEnter'),
        storage.get<Lang>('lang'),
    ]);
    if (e !== undefined) enabled.value = e;
    if (p !== undefined) prefix.value = p;
    if (s !== undefined) suffix.value = s;
    if (ae !== undefined) appendEnter.value = ae;
    if (l) lang.value = l;
});

const saveSettings = async () => {
    await Promise.all([
        storage.set('enabled', enabled.value),
        storage.set('prefix', prefix.value),
        storage.set('suffix', suffix.value),
        storage.set('appendEnter', appendEnter.value),
        storage.set('lang', lang.value),
    ]);
    saved.value = true;
    setTimeout(() => (saved.value = false), 1500);
};
</script>

<template>
    <div class="container">
        <div class="title">{{ t(lang, 'title') }}</div>

        <div class="row">
            <span class="label">{{ t(lang, 'enable') }}</span>
            <button class="toggle" :style="{ background: enabled ? '#3b82f6' : '#d1d5db' }" @click="enabled = !enabled">
                <span class="toggle-knob" :style="{ left: enabled ? '22px' : '2px' }" />
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
                        color: lang === 'zh' ? '#fff' : '#333',
                    }"
                    @click="lang = 'zh'"
                >
                    中文
                </button>
                <button
                    class="lang-btn"
                    :style="{
                        background: lang === 'en' ? '#3b82f6' : '#fff',
                        color: lang === 'en' ? '#fff' : '#333',
                    }"
                    @click="lang = 'en'"
                >
                    EN
                </button>
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
</style>
