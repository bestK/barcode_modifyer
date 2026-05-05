export const zh = {
  title: "扫码枪修改器",
  enable: "启用",
  prefix: "前缀",
  suffix: "后缀",
  prefixPlaceholder: "输入前缀（可选）",
  suffixPlaceholder: "输入后缀（可选）",
  save: "保存",
  saved: "已保存",
  language: "语言",
  toastEnabled: "扫码枪修改已启用",
  toastDisabled: "扫码枪修改已禁用",
  toastModified: "条码已修改",
  original: "原始",
  modified: "修改后",
  settings: "设置",
}

export const en: typeof zh = {
  title: "Barcode Modifier",
  enable: "Enable",
  prefix: "Prefix",
  suffix: "Suffix",
  prefixPlaceholder: "Enter prefix (optional)",
  suffixPlaceholder: "Enter suffix (optional)",
  save: "Save",
  saved: "Saved",
  language: "Language",
  toastEnabled: "Barcode modifier enabled",
  toastDisabled: "Barcode modifier disabled",
  toastModified: "Barcode modified",
  original: "Original",
  modified: "Modified",
  settings: "Settings",
  appendEnter: "Append Enter",
  appendEnterHint: "Trigger Enter/submit after modification",
}

export type Lang = "zh" | "en"

export const translations: Record<Lang, typeof zh> = { zh, en }

export function t(lang: Lang, key: keyof typeof zh): string {
  return translations[lang]?.[key] ?? translations.zh[key] ?? key
}
