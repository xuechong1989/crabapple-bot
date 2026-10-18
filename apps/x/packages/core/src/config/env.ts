// 云端后端地址。未通过环境变量配置时使用不可解析的占位域名，
// 云端相关功能（账号/计费/远程配置等）自动不可用，本机功能不受影响。
// 通过环境变量 API_URL 指定自建或自部署后端即可恢复云端功能。
export const API_URL =
  process.env.API_URL || 'https://api.invalid';

// GitHub OAuth app used for Apps publishing (device flow, public_repo scope).
// Client IDs are public identifiers, not secrets (spec §3).
// 上游的 OAuth App 已移除；请为你的 GitHub OAuth App 配置
// 环境变量 CRABAPPLE_GITHUB_CLIENT_ID 后使用该功能（默认不可用）。
export const GITHUB_OAUTH_CLIENT_ID =
  process.env.CRABAPPLE_GITHUB_CLIENT_ID || '';
