# Barcode Modifier

[English](#english) | [中文](#中文)

A Chrome MV3 browser extension that intercepts barcode scanner input and/or outgoing network requests to auto-prepend / append custom prefix and suffix to barcodes. Built with [Plasmo](https://www.plasmo.com/) + Vue 3.

> **v1.2.0**: keyboard interception + XHR / fetch network interception (dual-layer fix), multi-rule configuration, config import / export with confirmation, dual-source toast.

---

## English

### Features

#### Two independent fix layers

| Layer | How it works | Use case |
| --- | --- | --- |
| **Input layer** (off by default) | Listens to `keydown`, recognizes high-speed continuous input (≤ 80 ms / ≥ 3 chars / ends with `Enter` / `Tab`), rewrites the input value with `prefix + raw + suffix`, then dispatches `input` / `change` / synthetic `Enter` so frameworks (Vue / React, etc.) pick up the change | Plain pages where the rewrite should be visible immediately |
| **Network layer** (on by default) | A Plasmo `world: "MAIN"` content script that monkey-patches `XMLHttpRequest` and `fetch` in the page world, fixes `productSku` and other configured params in URL / body before the request goes out | Last-ditch fix for React / Ant Design controlled inputs the input layer cannot rewrite cleanly; or when scanner writes raw value but submission must be normalized |

The two layers work independently: even if the input layer fails (framework rejects the value, user uses their own input flow, etc.), the network layer still patches the request right before it leaves the browser.

#### Configurable rules (network layer)

Each rule has three fields:

- `urlPattern` — substring match against the request URL; empty string = match all
- `paramName` — the param to fix (covers query / JSON / urlencoded / `URLSearchParams` / `FormData`)
- `method` — `ALL` / `GET` / `POST` / `PUT` / `DELETE` / `PATCH`

Default rule:

```
URL contains: /api/tenant/outbound/pickupprint/savePrint
Param:        productSku
Method:       GET
```

#### Config import / export

- One-click **export** — all settings serialized to JSON (rules, prefix / suffix, toggles, language), filename includes ISO timestamp
- **Import** — picks a JSON file, shows a confirmation dialog with summary (filename / prefix / suffix / rule count), only applies and saves after user confirms
- File format includes a `version` field for forward compatibility

#### Dual-source toast

- Input layer success → top-right toast titled "Barcode modified"
- Network layer success → toast titled "Request param fixed" with the param name
- Only the most recent one is shown; auto-dismisses after 2.5 s

#### Other

- Master enable switch, prefix / suffix, append-Enter, zh / en language toggle
- Settings persist in `chrome.storage.sync`, syncs across devices via Chrome account
- Content scripts react to popup changes in real time via `storage.watch`
- Version number shown next to popup title (auto-tracks `package.json`)

### Tech stack

- [Plasmo](https://www.plasmo.com/) `0.90.5`
- [Vue 3](https://vuejs.org/) `3.4.x` (`<script setup lang="ts">` Composition API)
- [@plasmohq/storage](https://github.com/PlasmoHQ/storage) `^1.9.2`
- TypeScript `5.3`

### Project structure

```
.
├── assets/                 # icon.png (≥ 512×512); Plasmo auto-generates all sizes
├── contents/
│   ├── capture.ts          # isolated world: keyboard intercept + input rewrite + Toast + settings bridge
│   └── xhr-hook.ts         # main world: XHR / fetch monkey patch, fixes request params per rule
├── scan-rules.ts           # ScanRule type / default rules / normalizer / message constants
├── popup.vue               # settings panel (rules editor, import / export, version display)
├── i18n.ts                 # zh / en strings
├── package.json
└── tsconfig.json
```

### Develop

```bash
pnpm install
pnpm dev          # dev server, output: build/chrome-mv3-dev
```

In Chrome go to `chrome://extensions`, enable Developer mode, click **Load unpacked**, pick `build/chrome-mv3-dev`. Plasmo rebuilds on save; refresh the page (or click the reload icon on the extension card) to apply.

### Build

```bash
pnpm build        # output: build/chrome-mv3-prod
pnpm package      # zip ready for Chrome Web Store
```

> **Note**: `assets/icon.png` must exist (recommend 512×512 PNG). Plasmo derives 16 / 32 / 48 / 64 / 128 sizes from it.

If you see a runtime `xxx is not defined` after adding new exports, Parcel cached an old module. Clear and rebuild:

```powershell
Remove-Item -Recurse -Force .plasmo, build, .parcel-cache -ErrorAction SilentlyContinue
pnpm build
```

### Usage

1. Install the extension, click its toolbar icon to open the settings panel
2. Set prefix / suffix (default suffix is `_111`)
3. (Optional) Enable **Modify Input Field** for the input layer
4. (Optional) Add rules under **Request Intercept Rules** for the network layer
5. Click **Save**
6. Scan in any web input — the input value (or the final outgoing request) becomes `<prefix><raw>(<suffix>`

#### Three usage modes

| `enabled` | `interceptInput` | Behavior |
| :---: | :---: | --- |
| ✅ | ✅ | Input layer rewrites + network layer fixes (double safety) |
| ✅ | ❌ | **Default**. Scanner writes raw value; only the network layer fixes the outgoing request |
| ❌ | — | Fully disabled |

### Testing without a scanner

Open DevTools Console on any page, focus an input, then run:

```js
function simulateScan(text, interval = 20) {
  const target = document.activeElement || document.body
  let i = 0
  const tick = () => {
    if (i < text.length) {
      target.dispatchEvent(new KeyboardEvent("keydown", { key: text[i], bubbles: true }))
      i++
      setTimeout(tick, interval)
    } else {
      target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    }
  }
  tick()
}
simulateScan("ABC123456")          // should trigger rewrite
simulateScan("ABC123456", 200)     // too slow, should NOT trigger
```

For the network layer, just trigger any request that matches a rule and watch the final URL / Request Payload in DevTools Network. Console logs a line like:

```
[Barcode Modifier] productSku fixed (url): 1111 → 1111_111
```

### Detection params (input layer)

Defined in `contents/capture.ts`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `MAX_INTERVAL` | `80` ms | Max gap between adjacent keys; longer = drop old buffer (treated as human input or new scan) |
| `MIN_BARCODE_LEN` | `3` | Min char count to trigger rewrite |
| `MAX_BUFFER` | `100` | Buffer size cap |
| `BARCODE_KEY` | `/^[\x20-\x7E]$/` | Allowed chars (all ASCII printable) |
| `TERMINATOR_KEYS` | `Enter`, `Tab` | Terminators |

### Config file format (import / export)

```json
{
  "type": "barcode-modifier-config",
  "version": 1,
  "exportedAt": "2026-05-06T03:33:00.000Z",
  "appVersion": "1.2.0",
  "settings": {
    "enabled": true,
    "prefix": "",
    "suffix": "_111",
    "appendEnter": true,
    "interceptInput": false,
    "lang": "en",
    "rules": [
      { "urlPattern": "/api/.../savePrint", "paramName": "productSku", "method": "GET" }
    ]
  }
}
```

Import accepts both `{settings: {...}}` and a flat settings object; each field is type-checked individually, invalid fields are ignored.

### Architecture

```
┌─────────────── Extension process ───────────────┐
│  popup.vue (settings UI)                         │
│      │   ↕ chrome.storage.sync                   │
└──────┼───────────────────────────────────────────┘
       │ storage.watch
       ▼
┌── Page: isolated world ─────────────────────────┐
│  contents/capture.ts                             │
│   - keydown listener, scan recognition + rewrite │
│   - mounts Toast (Vue 3)                         │
│   - receives TOAST_MSG from main world → toast   │
│   - posts SETTINGS_MSG ↓                         │
└──────────────────────────────────────────────────┘
       │ window.postMessage
       ▼
┌── Page: main (page) world ──────────────────────┐
│  contents/xhr-hook.ts                            │
│   - monkey-patches XHR / fetch                   │
│   - fixes request URL / body params per rule     │
│   - emits TOAST_MSG ↑ on each fix                │
└──────────────────────────────────────────────────┘
```

### Changelog

#### 1.2.0

- Config import / export with confirmation dialog showing summary

#### 1.1.0

- Network-layer fix (XHR / fetch monkey patch via Plasmo `world: "MAIN"`)
- Multi-rule configuration (URL substring + param name + HTTP method)
- `interceptInput` toggle (off by default — network layer only)
- Network-layer toast distinct from input-layer toast
- Version number shown in popup title
- **Fix** scan-stops-working caused by stale buffer residue (drop old buffer when gap > `MAX_INTERVAL`; clear on every terminator)
- **Fix** scans containing special chars (`_` `:` `,` `=` `?` etc.) being dropped (whitelist widened to all ASCII printable)

#### 1.0.0

- Initial release: keyboard intercept + input rewrite + prefix / suffix + bilingual popup

### License

MIT

---

## 中文

劫持扫码枪输入并/或拦截网络请求，自动为条码添加自定义前缀 / 后缀。基于 [Plasmo](https://www.plasmo.com/) + Vue 3 构建的浏览器扩展（Chrome MV3）。

> **v1.2.0**：键盘拦截 + XHR / fetch 网络层拦截（双层修复）、多规则配置、配置导入导出（带二次确认）、双源 Toast。

### 功能

#### 双层修复，互不依赖

| 层 | 工作原理 | 适用场景 |
| --- | --- | --- |
| **前端层**（默认关闭）| 监听 keydown，识别高速连续输入（≤ 80 ms / ≥ 3 字符 / 以 `Enter` / `Tab` 结束）后，先用 `prefix + raw + suffix` 改写输入框值，再 dispatch `input` / `change` / `Enter`，触发 Vue / React 等框架的 onChange / submit 流程 | 大多数普通页面、希望立刻看到改写效果 |
| **网络层**（默认开启）| Plasmo `world: "MAIN"` 的 content script，在页面 JS 上下文里 monkey patch `XMLHttpRequest` 与 `fetch`，按规则匹配请求 URL / body 并就地修复 `productSku` 等参数 | React / Ant Design 等受控组件无法被前端层成功改写的兜底；扫码原样写入但提交时强制规范 |

两层独立工作：前端层改写失败 / 框架未识别 / 用户走自己的输入路径，网络层仍能在最后一刻把出站请求里的关键参数补全。

#### 多规则可配置（网络层）

每条规则三个字段：

- `urlPattern` — 子串匹配，留空 = 匹配所有 URL
- `paramName` — 要修复的参数名（query / JSON / urlencoded / `URLSearchParams` / `FormData` 都覆盖）
- `method` — `ALL` / `GET` / `POST` / `PUT` / `DELETE` / `PATCH`

默认一条：

```
URL contains: /api/tenant/outbound/pickupprint/savePrint
Param:        productSku
Method:       GET
```

#### 配置导入 / 导出

- 一键 **导出** 所有设置为 JSON（含规则、前后缀、开关、语言），文件名带时间戳
- **导入** 时弹二次确认框显示摘要（文件名 / 前缀 / 后缀 / 规则数量），确认后自动覆盖并保存
- 文件格式带 `version` 字段，便于未来兼容

#### 双源 Toast

- 前端层改写成功 → 右上角弹 toast「条码已修改」
- 网络层修复成功 → 弹 toast「请求参数已修复」并显示参数名
- 同一时刻只显示最近一次，2.5 s 后自动消失

#### 其它

- 扩展启用总开关、前缀 / 后缀、追加回车、中英文切换
- 配置存在 `chrome.storage.sync`，跨设备 Chrome 账号自动同步
- 内容脚本通过 `storage.watch` 实时响应 popup 修改
- popup 标题旁显示版本号（自动跟随 `package.json`）

### 技术栈

- [Plasmo](https://www.plasmo.com/) `0.90.5`
- [Vue 3](https://vuejs.org/) `3.4.x`（`<script setup lang="ts">` Composition API）
- [@plasmohq/storage](https://github.com/PlasmoHQ/storage) `^1.9.2`
- TypeScript `5.3`

### 项目结构

```
.
├── assets/                 # 放置 icon.png（≥ 512×512），Plasmo 自动生成各尺寸
├── contents/
│   ├── capture.ts          # isolated world：键盘拦截 + 输入框改写 + Toast 渲染 + settings 桥接
│   └── xhr-hook.ts         # main world：XHR / fetch monkey patch，按规则修复请求参数
├── scan-rules.ts           # 规则类型 / 默认规则 / 反序列化校验 / 协议常量
├── popup.vue               # 设置面板（含规则编辑、导入导出、版本号）
├── i18n.ts                 # 中英文文案
├── package.json
└── tsconfig.json
```

### 开发

```bash
pnpm install
pnpm dev          # 启动开发服务器，输出到 build/chrome-mv3-dev
```

在 Chrome 打开 `chrome://extensions`，开启「开发者模式」，点「加载已解压的扩展程序」，选择 `build/chrome-mv3-dev` 目录即可。修改源码后 Plasmo 会自动重新打包，**刷新页面**或在扩展卡片上点刷新按钮即可生效。

### 打包发布

```bash
pnpm build        # 输出到 build/chrome-mv3-prod
pnpm package      # 生成可上传 Chrome Web Store 的 zip
```

> **注意**：`assets/icon.png` 必须存在（建议 512×512 PNG），否则构建会失败。Plasmo 会从该源图自动生成 16 / 32 / 48 / 64 / 128 各尺寸图标。

如果新增 export 后运行时报 `xxx is not defined`，说明 Parcel 缓存了旧模块，清缓存重建即可：

```powershell
Remove-Item -Recurse -Force .plasmo, build, .parcel-cache -ErrorAction SilentlyContinue
pnpm build
```

### 使用

1. 安装扩展后，点击工具栏图标打开设置面板
2. 设置前缀 / 后缀（默认后缀 `_111`）
3. （可选）按需打开「前端改写输入框」开关
4. （可选）在「请求拦截规则」中添加规则匹配你的业务接口
5. 点「保存」
6. 在网页输入框扫码 —— 输入框的值或最终发出的请求会变成 `<前缀><原条码><后缀>`

#### 三种使用模式

| `enabled` | `interceptInput` | 行为 |
| :---: | :---: | --- |
| ✅ | ✅ | 前端键盘拦截改写 + 网络层兜底（双保险） |
| ✅ | ❌ | **默认**。扫码原样写入输入框，仅由网络层在请求出去前修复参数 |
| ❌ | — | 全部停用 |

### 无扫码枪测试

打开任意页面的 DevTools Console，聚焦输入框后执行：

```js
function simulateScan(text, interval = 20) {
  const target = document.activeElement || document.body
  let i = 0
  const tick = () => {
    if (i < text.length) {
      target.dispatchEvent(new KeyboardEvent("keydown", { key: text[i], bubbles: true }))
      i++
      setTimeout(tick, interval)
    } else {
      target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    }
  }
  tick()
}
simulateScan("ABC123456")          // 应触发改写
simulateScan("ABC123456", 200)     // 间隔过慢，应不触发
```

测试网络层只需触发任意命中规则的请求，并观察 DevTools Network 面板里的最终 URL / Request Payload 是否已被改写；控制台会同时打印形如：

```
[Barcode Modifier] productSku fixed (url): 1111 → 1111_111
```

### 识别参数（前端层）

定义在 `contents/capture.ts`：

| 常量 | 值 | 含义 |
| --- | --- | --- |
| `MAX_INTERVAL` | `80` ms | 相邻字符最大间隔，超过则丢弃旧 buffer，视为人类手动输入或新一轮扫码 |
| `MIN_BARCODE_LEN` | `3` | 触发改写的最小字符数 |
| `MAX_BUFFER` | `100` | 缓冲区上限 |
| `BARCODE_KEY` | `/^[\x20-\x7E]$/` | 允许进入缓冲区的字符集合（全部 ASCII 可打印字符） |
| `TERMINATOR_KEYS` | `Enter`, `Tab` | 终止符 |

### 配置文件格式（导入 / 导出）

```json
{
  "type": "barcode-modifier-config",
  "version": 1,
  "exportedAt": "2026-05-06T03:33:00.000Z",
  "appVersion": "1.2.0",
  "settings": {
    "enabled": true,
    "prefix": "",
    "suffix": "_111",
    "appendEnter": true,
    "interceptInput": false,
    "lang": "zh",
    "rules": [
      { "urlPattern": "/api/.../savePrint", "paramName": "productSku", "method": "GET" }
    ]
  }
}
```

导入时同时支持 `{settings: {...}}` 包装格式和直接的扁平 settings 对象；字段类型逐一校验，错误字段被忽略。

### 架构图

```
┌─────────────── 扩展进程 ────────────────┐
│  popup.vue (设置 UI)                    │
│      │   ↕ chrome.storage.sync          │
└──────┼──────────────────────────────────┘
       │ storage.watch
       ▼
┌── 页面: isolated world ────────────────┐
│  contents/capture.ts                    │
│   - 监听 keydown，扫码识别 + 改写输入框 │
│   - mount Toast (Vue 3)                 │
│   - 接收 main world TOAST_MSG → toast   │
│   - 推送 SETTINGS_MSG ↓                 │
└─────────────────────────────────────────┘
       │ window.postMessage
       ▼
┌── 页面: main (page) world ─────────────┐
│  contents/xhr-hook.ts                   │
│   - monkey patch XHR / fetch            │
│   - 按规则修复请求 URL / body 参数      │
│   - 修复后回送 TOAST_MSG ↑              │
└─────────────────────────────────────────┘
```

### 更新日志

#### 1.2.0

- 配置导入 / 导出，导入带二次确认对话框（显示文件名 / 前缀 / 后缀 / 规则数量摘要）

#### 1.1.0

- 网络层兜底拦截（XHR / fetch monkey patch via Plasmo `world: "MAIN"`）
- 多规则配置（URL 子串 + 参数名 + HTTP 方法）
- `interceptInput` 开关（默认关闭，仅走网络层）
- 网络层修复成功后弹独立 toast，与前端层 toast 区分显示
- popup 标题旁显示版本号
- **修复** buffer 残留导致的"用着用着扫码失效"（push 时按时间间隔自动丢弃旧 buffer；terminator 路径无论是否触发都清空 buffer）
- **修复** 字符白名单太窄导致含特殊字符（`_` `:` `,` `=` `?` 等）的条码失效（白名单放宽到全部 ASCII 可打印字符）

#### 1.0.0

- 初始版本：键盘拦截 + 输入框改写 + 前缀 / 后缀 + 中英文 popup

### License

MIT
