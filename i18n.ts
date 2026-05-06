export const zh = {
    title: '扫码枪修改器',
    enable: '启用',
    prefix: '前缀',
    suffix: '后缀',
    prefixPlaceholder: '输入前缀（可选）',
    suffixPlaceholder: '输入后缀（可选）',
    save: '保存',
    saved: '已保存',
    language: '语言',
    toastEnabled: '扫码枪修改已启用',
    toastDisabled: '扫码枪修改已禁用',
    toastModified: '条码已修改',
    toastNetworkFixed: '请求参数已修复',
    original: '原始',
    modified: '修改后',
    settings: '设置',
    appendEnter: '追加回车',
    appendEnterHint: '改写后触发回车 / 提交',
    interceptInput: '前端改写输入框',
    interceptInputHint: '关闭后扫码原样写入，仅由网络层兜底修复',
    rulesTitle: '请求拦截规则',
    addRule: '添加',
    noRules: '暂无规则',
    urlPatternPlaceholder: 'URL 包含（留空 = 全部）',
    paramName: '参数',
    paramNamePlaceholder: '参数名（如 productSku）',
    method: '方法',
    removeRule: '删除'
};

export const en: typeof zh = {
    title: 'Barcode Modifier',
    enable: 'Enable',
    prefix: 'Prefix',
    suffix: 'Suffix',
    prefixPlaceholder: 'Enter prefix (optional)',
    suffixPlaceholder: 'Enter suffix (optional)',
    save: 'Save',
    saved: 'Saved',
    language: 'Language',
    toastEnabled: 'Barcode modifier enabled',
    toastDisabled: 'Barcode modifier disabled',
    toastModified: 'Barcode modified',
    toastNetworkFixed: 'Request param fixed',
    original: 'Original',
    modified: 'Modified',
    settings: 'Settings',
    appendEnter: 'Append Enter',
    appendEnterHint: 'Trigger Enter/submit after modification',
    interceptInput: 'Modify Input Field',
    interceptInputHint: 'When off, scan writes raw value; only network layer fixes it',
    rulesTitle: 'Request Intercept Rules',
    addRule: 'Add',
    noRules: 'No rules',
    urlPatternPlaceholder: 'URL contains (empty = all)',
    paramName: 'Param',
    paramNamePlaceholder: 'Param name (e.g. productSku)',
    method: 'Method',
    removeRule: 'Remove'
};

export type Lang = 'zh' | 'en';

export const translations: Record<Lang, typeof zh> = { zh, en };

export function t(lang: Lang, key: keyof typeof zh): string {
    return translations[lang]?.[key] ?? translations.zh[key] ?? key;
}
