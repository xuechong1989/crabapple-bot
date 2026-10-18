# Crabapple Bot · 海棠数字员工

本地优先的桌面 AI 助手：把你的邮件、会议、笔记与助理对话索引成一张持续生长的知识图谱（Obsidian 风格双向链接），并基于这份长期记忆，直接在你的电脑上完成工作。

<p align="center"><img src="apps/x/apps/main/icons/icon.png" width="96" height="96" alt="Crabapple Bot" /></p>

## 功能特性

- **知识图谱（Brain）**：将邮件、会议、Slack 与助理对话索引为可浏览、可编辑的本地 Markdown 知识图谱
- **邮件客户端**：自动将邮件分为「重要」与「其他」，重要邮件由助手结合工作上下文起草回复
- **后台 Agent**：按事件（如新邮件）或日程（如每天 8:00）触发，可使用工具、搜索网页、驱动 Claude Code / Codex 写代码
- **内置浏览器**：与主浏览器隔离，只登录你允许助手访问的账号
- **会议记录**：本地录音（麦克风 + 扬声器），实时转写并生成 Markdown 会议纪要
- **代码模式**：并行启动多个编码 Agent（Claude Code / Codex），由 Crabapple Bot 用工作上下文驱动
- **Apps**：在 Crabapple Bot 内构建自己的工作界面，可访问全部工具与集成，并可分享给他人
- **集成与 MCP**：一键接入常用产品，支持任意 Model Context Protocol 服务器

## 快速开始

环境要求：Node.js 22+ 与 pnpm 10+。

```bash
# 开发模式（构建工作区包并启动应用）
cd apps/x
pnpm install
npm run dev
```

打包安装包：

```bash
cd apps/x/apps/main
npm run package   # 生成应用（.app / 可执行目录）
npm run make      # 生成安装包（dmg / Squirrel.Windows / deb / rpm / pacman）
```

## 仓库结构

```
apps/
└── x/            # 桌面应用（Electron）
    ├── apps/     # main / renderer / preload
    └── packages/ # shared / core
```

## 配置

配置目录：`~/.crabapple/config/`（Windows 为 `%USERPROFILE%\.crabapple\config`），保存模型、账号与各可选能力的 API Key。

- **模型（models.json）**：支持 Ollama / LM Studio 本地模型，以及 OpenAI / Anthropic / Google / OpenRouter 等自带 API Key 的托管模型
- **Google（Gmail / Calendar / Drive）**：见 [google-setup.md](google-setup.md)
- **语音输入**（可选）：Deepgram API Key → `~/.crabapple/config/deepgram.json`
- **语音输出**（可选）：ElevenLabs API Key → `~/.crabapple/config/elevenlabs.json`
- **联网搜索**（可选）：Exa API Key → `~/.crabapple/config/exa-search.json`
- **外部工具**（可选）：MCP 服务器 / Composio API Key → `~/.crabapple/config/composio.json`

所有 API Key 文件格式一致：

```json
{
  "apiKey": "<key>"
}
```

## 数据与隐私

- 全部数据以纯 Markdown 保存在本地，无专有格式、无托管锁定
- 模型可换成本地部署（Ollama / LM Studio），数据不出本机
- 随时检查、编辑、备份或删除你的数据

## 许可证

[Apache-2.0](LICENSE) © 2026 xuechong。上游版权声明见 [NOTICE](NOTICE)。

---

## English

Crabapple Bot is a local-first desktop AI coworker. It indexes your work into a living knowledge graph and acts on it with built-in surfaces: email client, browser, meeting notes, code mode, and shareable apps. Bring your own model — local via Ollama/LM Studio, or hosted providers with your own API key. Everything is stored on your machine as plain Markdown.

Build from source:

```bash
cd apps/x
pnpm install
npm run dev
```

Licensed under the Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
