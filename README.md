# Crabapple Bot · 海棠数字员工

> 品牌色：海棠红 `#B3123B` · 海棠粉 `#E63B5F` · 叶绿 `#4F9D69`

本地优先的桌面 AI 助手：把邮件、会议、笔记与助理对话索引成可持续生长的知识图谱（Obsidian 风格双向链接），并基于长期记忆在电脑上完成工作。

<p align="center"><img src="apps/x/apps/main/icons/icon.png" width="96" height="96" alt="Crabapple Bot" /></p>

## 项目定位与适用范围

Crabapple Bot 是一个 **Electron 桌面应用**，不是 Web 服务，也没有需要部署的服务端：

- 适合个人或小团队在本机使用；
- 适合希望数据保存在本地、模型可换成本地 Ollama/LM Studio 的用户；
- 适合需要 Gmail/Calendar/Drive、Slack、会议记录、内置浏览器、编码 Agent 的场景；
- 不提供多租户、云端同步、集中管理后台；
- 需要用户自备模型 API Key 或本地模型，Google 等集成需要自行创建 OAuth 凭据。

支持 macOS、Windows、Linux 的 Electron 打包；本仓库 CI 在 Ubuntu 上执行安装、构建、lint、typecheck 和单元测试。实际安装包需要各自平台的构建工具。

## 功能特性

- **知识图谱（Brain）**：把邮件、会议、Slack 与助理对话索引为本地 Markdown 知识图谱
- **邮件客户端**：区分「重要」与「其他」，结合上下文起草回复
- **后台 Agent**：按事件或日程触发，可搜索网页、驱动 Claude Code / Codex
- **内置浏览器**：与主浏览器隔离，只登录允许助手访问的账号
- **会议记录**：本地录音（麦克风 + 扬声器），转写并生成 Markdown 纪要
- **代码模式**：并行启动多个编码 Agent
- **Apps**：在应用内构建可分享的工作界面
- **集成与 MCP**：支持常用产品与任意 Model Context Protocol 服务器

## 环境要求

| 依赖 | 要求 |
|---|---|
| Node.js | 22+ |
| pnpm | 10+（必须用 pnpm，工作区使用 `workspace:*`） |
| 操作系统 | macOS / Windows / Linux |
| 构建工具 | 对应平台的 Electron 原生依赖、Python/Node 编译工具（部分原生模块需要） |

> 本仓库根目录没有 `package.json`，应用工作区在 `apps/x`。不要在仓库根目录执行 `pnpm install`。

## 安装与开发启动

```bash
git clone https://github.com/xuechong1989/crabapple-bot.git
cd crabapple-bot/apps/x

# 如果没有 pnpm 10：
corepack enable
corepack prepare pnpm@10 --activate

pnpm install
npm run deps      # 构建 shared → core → preload
npm run dev       # 启动 Vite 渲染进程 + Electron 主进程
```

`npm run dev` 会先执行 `npm run deps`，然后并行启动 renderer 和 main；main 会等待 `http://localhost:5173` 就绪后再启动 Electron。

### 常用开发命令

```bash
cd apps/x
npm run lint          # ESLint
npm run typecheck     # shared + core + renderer 类型检查
npm test              # 312 个单元测试（当前版本）
npm run deps          # 只构建工作区包
```

## 打包桌面安装包

先确保依赖和工作区包已经构建：

```bash
cd apps/x
pnpm install
npm run deps

cd apps/main
npm run package       # 生成未压缩应用目录
npm run make          # 生成平台安装包
```

Electron Forge 默认输出在：

```text
apps/x/apps/main/out/
```

`npm run make` 会根据当前平台选择 maker：

- macOS：DMG
- Windows：Squirrel.Windows
- Linux：deb / rpm / pacman（pacman 可通过 `CRABAPPLE_SKIP_PACMAN=1` 跳过）

代码签名不是本地开发的必需项；正式发布需要自行配置 Apple/Windows 签名凭据。`forge.config.cjs` 中的 GitHub publisher 已指向 `xuechong1989/crabapple-bot`，发布前请确认 publisher 权限和 release 策略。

## 配置与首次使用

配置目录：

```text
macOS/Linux: ~/.crabapple/config/
Windows:     %USERPROFILE%\.crabapple\config\
```

主要文件：

| 文件 | 用途 |
|---|---|
| `models.json` | 模型 provider、API Key、主模型/任务模型 |
| `deepgram.json` | 语音输入 API Key（可选） |
| `elevenlabs.json` | 语音输出 API Key（可选） |
| `exa-search.json` | 联网搜索 API Key（可选） |
| `composio.json` | Composio/MCP 集成（可选） |

API Key 文件格式：

```json
{
  "apiKey": "<your-key>"
}
```

Google（Gmail / Calendar / Drive）需要按 [google-setup.md](google-setup.md) 在 Google Cloud 创建 OAuth Client，并在应用提示处填入 Client ID / Client Secret。不要把这些凭据提交到仓库。

模型支持本地 Ollama / LM Studio，以及 OpenAI / Anthropic / Google / OpenRouter 等自带 Key 的托管服务。所有数据默认保存在本机，具体路径以应用设置为准。

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面 | Electron 39 |
| UI | React 19、Vite、TailwindCSS、Radix UI |
| 状态 | React hooks |
| AI | Vercel AI SDK、OpenAI/Anthropic/Google/OpenRouter、Ollama、models.dev |
| IPC | Electron contextBridge |
| 构建 | TypeScript、esbuild、Electron Forge |

## 安全与隐私边界

- 本地优先：知识库以 Markdown 保存在本机，不上传到项目自己的服务器。
- 模型请求会发送到你选择的模型 provider；使用本地模型时数据不出本机。
- Google/Slack/会议等集成会访问对应第三方服务，请自行评估授权范围。
- Electron 窗口使用 `contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`。
- 不要把 `~/.crabapple/config/`、API Key、OAuth 凭据提交到 Git。
- `@e965/xlsx` 0.20.3 用于替代 npm 上停留在 0.18.5 的 `xlsx`；`baileys` 目前是 `7.0.0-rc14` 预发布版本，升级时请重点回归 WhatsApp 链路。

## 目录结构

```text
crabapple-bot/
├── apps/
│   └── x/                 # Electron 工作区（真正的应用根）
│       ├── apps/
│       │   ├── main/      # Electron 主进程、Forge 配置、打包
│       │   ├── renderer/  # React + Vite UI
│       │   └── preload/   # contextBridge preload
│       ├── packages/
│       │   ├── shared/    # 共享类型/工具
│       │   └── core/      # AI、OAuth、MCP、运行时
│       ├── package.json   # 工作区脚本
│       └── pnpm-lock.yaml
├── docs/                  # Google 配置截图
├── AGENTS.md              # 开发/构建上下文
├── google-setup.md
└── README.md
```

## 测试与 CI

```bash
cd apps/x
pnpm install --frozen-lockfile
npm run deps
npm run lint
npm run typecheck
npm test
```

CI 见 [.github/workflows/ci.yml](.github/workflows/ci.yml)，使用 Node 22、pnpm 10 和 `pnpm install --frozen-lockfile`。

## 适用与不适用

**适合：**

- 希望本地保存知识库、自己掌控模型的桌面用户；
- 需要邮件/会议/浏览器/编码 Agent 联动的个人工作流；
- 想基于 Electron + React 二次开发的人。

**不适合：**

- 需要多租户、集中权限、云端同步的企业 SaaS；
- 没有 Node/pnpm 或原生构建环境、只想“下载即用”的服务端部署；
- 不愿意自行申请模型/Google/Slack 凭据的用户。

## 许可证

[Apache-2.0](LICENSE) © 2026 xuechong。上游 Rowboat 的版权与许可见 [NOTICE](NOTICE)。
