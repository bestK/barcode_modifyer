# Barcode Modifier

劫持扫码枪输入，自动为扫描到的条码添加自定义前缀 / 后缀。基于 [Plasmo](https://www.plasmo.com/) + Vue 3 构建的浏览器扩展（Chrome MV3）。

## 功能

- 自动识别扫码枪的高速键盘输入（字符间隔 ≤ 80ms，长度 ≥ 3，以 `Enter` / `Tab` 结束）。
- 在写入输入框前为条码加上可配置的前缀和后缀，并触发 `input` / `change` 事件，确保前端框架（Vue / React 等）能感知变化。
- 修改成功后右上角弹出 Toast 提示，显示原始值与修改后的值。
- Popup 设置面板：启用开关、前缀、后缀、语言切换（中 / 英），通过 `@plasmohq/storage`（`sync` 区）持久化到 Chrome 账号。
- 内容脚本与 Popup 通过 `storage.watch` 实时同步设置变更，无需重载页面。

## 技术栈

- [Plasmo](https://www.plasmo.com/) `0.90.5`
- [Vue 3](https://vuejs.org/) `3.4.x`（`<script setup lang="ts">` Composition API）
- [@plasmohq/storage](https://github.com/PlasmoHQ/storage) `^1.9.2`
- TypeScript `5.3`

## 项目结构

```
.
├── assets/               # 放置 icon.png（≥512x512），Plasmo 自动生成各尺寸
├── contents/
│   └── capture.vue       # 内容脚本：键盘监听 + 条码改写 + Toast
├── popup.vue             # 浏览器右上角图标点击后的设置面板
├── i18n.ts               # 中英文文案
├── package.json
└── tsconfig.json
```

## 开发

```bash
pnpm install
pnpm dev          # 启动开发服务器，输出到 build/chrome-mv3-dev
```

在 Chrome 打开 `chrome://extensions`，开启「开发者模式」，点「加载已解压的扩展程序」，选择 `build/chrome-mv3-dev` 目录即可。修改源码后 Plasmo 会自动重新打包，刷新页面生效。

## 打包发布

```bash
pnpm build        # 输出到 build/chrome-mv3-prod
pnpm package      # 生成可上传 Chrome Web Store 的 zip
```

> **注意**：`assets/icon.png` 必须存在（建议 512×512 PNG），否则构建会失败。Plasmo 会从该源图自动生成 16/32/48/64/128 各尺寸图标。

## 使用

1. 安装扩展后，点击工具栏图标打开设置面板。
2. 设置前缀 / 后缀（默认后缀为 `_111`），保存。
3. 在任意网页的输入框聚焦，使用扫码枪扫码 —— 写入的内容会自动变成 `<前缀><原条码><后缀>`。

## 无扫码枪测试

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

## 识别参数

定义在 `contents/capture.vue`：

| 常量 | 值 | 含义 |
| --- | --- | --- |
| `MAX_INTERVAL` | `80` ms | 相邻字符最大间隔，超过则视为人类手动输入 |
| `MIN_BARCODE_LEN` | `3` | 触发改写的最小字符数 |
| `MAX_BUFFER` | `100` | 缓冲区上限 |
| `BARCODE_KEY` | `/^[a-zA-Z0-9\-./+$%*\s]$/` | 允许进入缓冲区的字符集合 |
| `TERMINATOR_KEYS` | `Enter`, `Tab` | 终止符 |

## License

MIT
