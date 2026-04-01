# simple-translator（仅桌面端 Tauri）

<p align="center">
    <br> <a href="README.md">English</a> | 中文
</p>

一个极简的桌面翻译器：**Tauri + React**，并且 **仅支持 Ollama**。

## 包含功能

- **翻译**
- **历史记录**
- **全局快捷键**
- **供应商**：仅 Ollama

已移除浏览器插件 / userscript / OCR / 更新器 / Thumb / 动作管理等所有非核心功能。

## 环境要求

- **Rust 工具链**（Tauri 需要）
- **本地 Ollama** 正在运行
  - 默认 URL：`http://127.0.0.1:11434`
  - 建议使用 `127.0.0.1`，比 `localhost` 更稳定

## 开发运行

```bash
pnpm install
pnpm dev-tauri
```

## 构建

```bash
pnpm build-tauri
```

## 说明

- 如果你之前配置过代理，本地 Ollama 请求可能出现 502。本版本会对 `localhost/127.0.0.1` 强制绕过代理。

## License

[LICENSE](./LICENSE)
