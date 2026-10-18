# 安全政策

## 支持范围

当前维护 `main` 分支，安全修复会合入最新版本。

## 报告安全问题

请勿通过公开 Issue 披露安全问题。请在 GitHub 仓库的 Security 页面使用「Report a vulnerability」私密报告，或直接联系仓库维护者。

报告中建议包含：问题描述、影响范围、复现步骤、可能的修复建议。请勿附带真实用户数据、邮箱内容或 API Key。

## 安全边界

Crabapple Bot 是本地优先的桌面应用，会接触以下敏感能力，相关实现请重点评审：

- 本地 Markdown 知识库与配置文件（`~/.crabapple/`）
- 邮件、日历、云盘等 OAuth 授权
- 麦克风与系统音频录制
- 屏幕共享与内置浏览器会话
- 全局快捷键与本地终端（`node-pty`）
- 模型与第三方服务的 API Key

## 依赖安全说明

- `@e965/xlsx` 0.20.3（Apache-2.0）用于替代 npm 上停留在 0.18.5 的 `xlsx`，规避其已知原型污染/ReDoS 问题。
- `baileys` 目前为 `7.0.0-rc14` 预发布版本；上游尚无稳定的 7.x 正式版，升级时请重点回归 WhatsApp 连接与消息收发链路。
- 已通过 `apps/x/pnpm-workspace.yaml` 的 overrides 修复 `proxy-addr`、`axios`、`fast-uri`、`undici`、`sharp`、`source-map-js`、`tar`、`shell-quote`、`prosemirror-model`/`prosemirror-view` 等可兼容升级的依赖。
- 仍需关注：Electron 39.x 的多项 high 安全公告要求升级到 41.10.6，这属于 Electron 主版本升级，需要完整回归内置浏览器、sandbox、preload 与打包流程，未在本次维护中强制升级。
- `@eigenpal/docx-editor`、`@tiptap/*`、`image-size`、`js-yaml` 等仍有 high/medium 公告；升级涉及编辑器/文档渲染链路，需单独回归后再合并。
- 其余传递依赖告警以 GitHub Security 页的 Dependabot 列表为准；不要为了清零告警盲目跨主版本升级。

## 处理流程

- 收到报告后 3 个工作日内确认；
- 修复发布前请勿公开披露细节；
- 修复完成后会在 Release Notes 中致谢（如需匿名请提前说明）。
