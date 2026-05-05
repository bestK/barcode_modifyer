import { createApp, defineComponent, h, ref } from "vue"
import { Storage } from "@plasmohq/storage"

import { type Lang, t } from "~i18n"

const storage = new Storage({ area: "sync" })

const BARCODE_KEY = /^[a-zA-Z0-9\-./+$%*\s]$/
const MAX_INTERVAL = 80
const MIN_BARCODE_LEN = 3
const MAX_BUFFER = 100
const TERMINATOR_KEYS = new Set(["Enter", "Tab"])
const IGNORED_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "NumLock",
  "ScrollLock",
  "Fn",
  "FnLock",
  "Hyper",
  "Super",
  "OS",
  "ContextMenu",
  "Dead",
  "Process",
  "Unidentified",
])

// ── Toast ──────────────────────────────────────────────────────────────────────
interface ToastData {
  original: string
  modified: string
}

const toastData = ref<ToastData | null>(null)
const toastLang = ref<Lang>("en")

const ToastApp = defineComponent({
  setup() {
    return () => {
      const d = toastData.value
      if (!d) return null
      const lang = toastLang.value
      return h(
        "div",
        {
          style: {
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 2147483647,
            background: "#1f2937",
            color: "#f9fafb",
            borderRadius: "10px",
            padding: "12px 18px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: "13px",
            lineHeight: 1.5,
            minWidth: "200px",
            animation: "barcodeToastIn 0.3s ease-out",
          },
        },
        [
          h("div", { style: { fontWeight: 700, marginBottom: "6px", fontSize: "14px" } }, t(lang, "toastModified")),
          h("div", { style: { opacity: 0.7, fontSize: "11px" } }, t(lang, "original") + ":"),
          h("div", { style: { wordBreak: "break-all", marginBottom: "4px" } }, d.original),
          h("div", { style: { opacity: 0.7, fontSize: "11px" } }, t(lang, "modified") + ":"),
          h("div", { style: { wordBreak: "break-all", fontWeight: 600, color: "#60a5fa" } }, d.modified),
        ],
      )
    }
  },
})

function mountToast() {
  // Inject keyframe CSS once
  const styleId = "barcode-toast-style"
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `@keyframes barcodeToastIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }`
    document.head.appendChild(style)
  }
  const host = document.createElement("div")
  document.body.appendChild(host)
  createApp(ToastApp).mount(host)
}

let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(data: ToastData) {
  toastData.value = data
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastData.value = null
  }, 2500)
}

// ── Settings ───────────────────────────────────────────────────────────────────
const settings = {
  enabled: true,
  prefix: "",
  suffix: "_111",
  appendEnter: true,
}

async function loadSettings() {
  const [e, p, s, ae, l] = await Promise.all([
    storage.get<boolean>("enabled"),
    storage.get<string>("prefix"),
    storage.get<string>("suffix"),
    storage.get<boolean>("appendEnter"),
    storage.get<Lang>("lang"),
  ])
  settings.enabled = e !== undefined ? e : true
  settings.prefix = p ?? ""
  settings.suffix = s ?? "_111"
  settings.appendEnter = ae !== undefined ? ae : true
  toastLang.value = l ?? "en"
}

storage.watch({
  enabled: (c) => { if (c.newValue !== undefined) settings.enabled = c.newValue },
  prefix: (c) => { if (c.newValue !== undefined) settings.prefix = c.newValue },
  suffix: (c) => { if (c.newValue !== undefined) settings.suffix = c.newValue },
  appendEnter: (c) => { if (c.newValue !== undefined) settings.appendEnter = c.newValue },
  lang: (c) => { if (c.newValue !== undefined) toastLang.value = c.newValue as Lang },
})

// ── Input helper ───────────────────────────────────────────────────────────────
function replaceLastChars(el: HTMLInputElement | HTMLTextAreaElement, count: number, replacement: string) {
  const start = el.selectionStart ?? el.value.length
  const before = el.value.slice(0, start - count)
  const after = el.value.slice(start)
  el.value = before + replacement + after
  const newPos = before.length + replacement.length
  el.setSelectionRange(newPos, newPos)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

// ── Keyboard interceptor ────────────────────────────────────────────────────────
const buffer: { char: string; time: number }[] = []

function onKeyDown(e: KeyboardEvent) {
  if (!settings.enabled) return

  const key = e.key

  if (TERMINATOR_KEYS.has(key) && buffer.length >= MIN_BARCODE_LEN) {
    let rapid = true
    for (let i = 1; i < buffer.length; i++) {
      if (buffer[i].time - buffer[i - 1].time > MAX_INTERVAL) {
        rapid = false
        break
      }
    }

    if (rapid) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      const raw = buffer.map((b) => b.char).join("")
      const modified = settings.prefix + raw + settings.suffix

      const active = document.activeElement
      if (active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
        replaceLastChars(active, buffer.length, modified)
      } else {
        document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: modified, bubbles: true }))
      }

      showToast({ original: raw, modified })
      buffer.length = 0

      if (settings.appendEnter) {
        if (active && active instanceof HTMLInputElement && active.form) {
          if (typeof active.form.requestSubmit === "function") {
            active.form.requestSubmit()
          } else {
            active.form.submit()
          }
        } else if (active) {
          const opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }
          active.dispatchEvent(new KeyboardEvent("keydown", opts))
          active.dispatchEvent(new KeyboardEvent("keypress", opts))
          active.dispatchEvent(new KeyboardEvent("keyup", opts))
        }
      }
      return
    }
  }

  if (key.length === 1 && BARCODE_KEY.test(key)) {
    buffer.push({ char: key, time: Date.now() })
    if (buffer.length > MAX_BUFFER) buffer.shift()
  } else if (!TERMINATOR_KEYS.has(key) && !IGNORED_KEYS.has(key)) {
    buffer.length = 0
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────
loadSettings().then(() => {
  mountToast()
  document.addEventListener("keydown", onKeyDown, true)
})
