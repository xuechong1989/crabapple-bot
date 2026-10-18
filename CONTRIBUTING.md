# 参与贡献

感谢参与 Crabapple Bot！以下约定用于保证协作顺畅。

## 环境准备

- Node.js 22+
- pnpm 10+
- Windows / macOS / Linux 桌面环境（开发调试建议 Windows 或 macOS）

## 本地开发

```bash
cd apps/x
pnpm install
npm run deps      # 构建 shared → core → preload
npm run dev       # 启动 Electron 应用
```

## 提交前检查

```bash
cd apps/x
npm run lint
npm run typecheck
npm test
```

## 代码约定

- TypeScript / React，遵循现有目录划分：主进程在 `apps/main`，渲染进程在 `apps/renderer`，业务逻辑在 `packages/core`，共享类型在 `packages/shared`；
- 新增共享类型先改 `packages/shared`，再执行 `npm run deps`；
- 主进程改动需要重启开发服务，渲染进程支持热更新；
- 不要提交 `node_modules`、`dist`、`.package` 等构建产物。

## 安全与隐私

- 严禁提交任何 API Key、OAuth Secret、证书、用户数据或内部地址；
- 运行时配置统一放在 `~/.crabapple/config/`，不要写入仓库；
- 涉及麦克风、屏幕、浏览器、终端等敏感能力时，请在 PR 中说明权限边界与用户可见的授权提示。

## 提交信息

使用简洁的中文或英文描述改动内容，一个 PR 聚焦一个问题。

## 许可证

贡献的代码将按 [Apache License 2.0](LICENSE) 许可发布。
