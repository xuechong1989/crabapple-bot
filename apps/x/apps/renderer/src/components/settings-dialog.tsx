"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Server, Key, Shield, Palette, Monitor, Sun, Moon, Loader2, CheckCircle2, Plus, Minus, X, Wrench, Search, ChevronRight, Link2, Tags, Mail, BookOpen, User, Plug, HelpCircle, MessageCircle, Terminal, AlertTriangle, RefreshCw, PanelRight, Bell, Smartphone } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import * as analytics from "@/lib/analytics"
import { useTheme } from "@/contexts/theme-context"
import { toast } from "sonner"
import { AnthropicIcon, GitHubIcon, OpenAIIcon } from "@/components/onboarding/provider-icons"
import { AccountSettings } from "@/components/settings/account-settings"
import { ConnectedAccountsSettings } from "@/components/settings/connected-accounts-settings"
import { MobileChannelsSettings } from "@/components/settings/mobile-channels-settings"
import type { ApprovalPolicy } from "@x/shared/src/code-mode.js"
import { DEFAULT_TURN_LIMITS_SETTINGS } from "@x/shared/src/turn-limits.js"
import type { ipc as ipcShared } from "@x/shared"
import { startProvisioning, useProvisioning, enabledOptimistic, type AgentStatus, type CodeModeAgentStatus } from "@/lib/code-mode-provisioning"
import { ModelSelectionSection } from "@/components/settings/model-selection-section"
import { ProvidersSection } from "@/components/settings/providers-section"
import { useModels } from "@/hooks/use-models"

type ConfigTab = "account" | "connections" | "mobile" | "models" | "mcp" | "security" | "code-mode" | "appearance" | "notifications" | "note-tagging" | "advanced" | "help"

interface TabConfig {
  id: ConfigTab
  label: string
  icon: React.ElementType
  path?: string
  description: string
}

const tabs: TabConfig[] = [
  {
    id: "account",
    label: "账号",
    icon: User,
    description: "管理你的账号",
  },
  {
    id: "connections",
    label: "连接",
    icon: Plug,
    description: "管理账号和工具",
  },
  {
    id: "mobile",
    label: "移动端",
    icon: Smartphone,
    description: "通过 WhatsApp 或 Telegram 与海棠数字员工 对话",
  },
  {
    id: "models",
    label: "模型",
    icon: Key,
    path: "config/models.json",
    description: "配置大模型供应商和 API 密钥",
  },
  {
    id: "mcp",
    label: "MCP 服务器",
    icon: Server,
    path: "config/mcp.json",
    description: "配置 MCP 服务器连接",
  },
  {
    id: "security",
    label: "安全",
    icon: Shield,
    path: "config/security.json",
    description: "配置允许执行的 shell 命令",
  },
  {
    id: "code-mode",
    label: "代码模式",
    icon: Terminal,
    description: "将编码任务委托给 Claude Code 或 Codex",
  },
  {
    id: "appearance",
    label: "外观",
    icon: Palette,
    description: "自定义外观和界面风格",
  },
  {
    id: "notifications",
    label: "通知",
    icon: Bell,
    description: "选择接收哪些通知",
  },
  {
    id: "note-tagging",
    label: "笔记标签",
    icon: Tags,
    path: "config/tags.json",
    description: "配置笔记和邮件的标签",
  },
  {
    id: "advanced",
    label: "高级",
    icon: Wrench,
    description: "高级运行时和成本控制",
  },
  {
    id: "help",
    label: "帮助",
    icon: HelpCircle,
    description: "获取帮助和支持",
  },
]

/** Sidebar nav grouping: identity first, capabilities, then app-level. */
const NAV_SECTIONS: { label: string | null; ids: ConfigTab[] }[] = [
  { label: null, ids: ["account", "connections", "mobile"] },
  { label: "配置", ids: ["models", "mcp", "security", "code-mode", "note-tagging", "advanced"] },
  { label: "应用", ids: ["appearance", "notifications", "help"] },
]

interface SettingsDialogProps {
  /** Optional trigger element. Omit when controlling `open` externally. */
  children?: React.ReactNode
  /** Tab to open on when the dialog is shown. Defaults to "account". */
  defaultTab?: ConfigTab
  /** Controlled open state. When provided, the dialog is fully controlled. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// --- Updates section (Help tab) ---

type UpdaterStatus = ipcShared.IPCChannels['updater:status']['req']

function UpdateSettings() {
  const [status, setStatus] = useState<UpdaterStatus | null>(null)

  useEffect(() => {
    void window.ipc.invoke('updater:getStatus', null).then(setStatus)
    return window.ipc.on('updater:status', setStatus)
  }, [])

  if (!status) return null

  const checkNow = () => {
    // Progress arrives via updater:status pushes; using the invoke's snapshot
    // here could stomp a newer pushed state.
    void window.ipc.invoke('updater:check', null)
  }

  let body: React.ReactNode
  switch (status.state) {
    case 'disabled':
      body = (
        <p className="text-xs text-muted-foreground">
          {status.reason === 'not-configured'
            ? '自动更新未启用（当前构建未配置发布仓库）。'
            : '开发版本不支持自动更新。'}
        </p>
      )
      break
    case 'unsupported':
      body = status.reason === 'not-in-applications' ? (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-500" />
          退出 Crabapple Bot 并将其移动到「应用程序」文件夹以启用自动更新。
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          当前平台不支持自动更新。
        </p>
      )
      break
    case 'checking':
    case 'downloading':
      body = (
        <Button size="sm" variant="outline" disabled>
          <Loader2 className="size-3.5 animate-spin" />
          {status.state === 'checking' ? '正在检查更新…' : '正在下载更新…'}
        </Button>
      )
      break
    case 'ready':
      body = (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {status.newVersion
              ? `Crabapple Bot ${status.newVersion} 已准备好安装。`
              : '更新已准备好安装。'}
          </p>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => void window.ipc.invoke('updater:quitAndInstall', null)}
          >
            重启以更新
          </Button>
        </div>
      )
      break
    case 'error':
      body = (
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-destructive" />
            {`更新检查失败：${status.error ?? '未知错误'}`}
          </p>
          <Button size="sm" variant="outline" className="shrink-0" onClick={checkNow}>
            重试
          </Button>
        </div>
      )
      break
    case 'idle':
      body = (
        <div className="space-y-2">
          {/* lastCheckedAt only exists after a check that found no update
              (an available update moves the state to downloading/ready), so
              idle + lastCheckedAt genuinely means "on the latest version". */}
          {status.lastCheckedAt !== undefined && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
              <span>
                {`已是最新版本：Crabapple Bot v${status.version}。`}
                <span className="text-muted-foreground/60">
                  {` 检查时间 ${new Date(status.lastCheckedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}。`}
                </span>
              </span>
            </p>
          )}
          <Button size="sm" variant="outline" onClick={checkNow}>
            <RefreshCw className="size-3.5" />
            检查更新
          </Button>
        </div>
      )
      break
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium">更新</h4>
        <p className="text-xs text-muted-foreground mt-0.5">海棠数字员工 v{status.version}</p>
      </div>
      {body}
    </div>
  )
}

// --- Help & Support tab ---

function HelpSettings() {
  return (
    <div className="space-y-4">
      <UpdateSettings />
      <Separator />
      <div>
        <h4 className="text-sm font-medium">帮助与支持</h4>
        <p className="text-xs text-muted-foreground mt-0.5">从社区获取帮助</p>
      </div>
      <Button
        variant="outline"
        className="w-full justify-start gap-3 h-auto py-3"
        onClick={() => window.open("https://github.com/YOUR_GITHUB_USERNAME/crabapple-bot/issues/new", "_blank")}
      >
        <GitHubIcon className="size-5 shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">报告问题</span>
          <span className="text-xs text-muted-foreground">向海棠数字员工 团队发送反馈</span>
        </div>
      </Button>
    </div>
  )
}

// --- Theme option for Appearance tab ---

function ThemeOption({
  label,
  icon: Icon,
  isSelected,
  onClick,
}: {
  label: string
  icon: React.ElementType
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <Icon className={cn("size-6", isSelected ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>
        {label}
      </span>
    </button>
  )
}

function LaunchAtLoginSetting() {
  const [openAtLogin, setOpenAtLogin] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.ipc.invoke("app:getLoginItemSettings", null)
      .then(({ openAtLogin }) => setOpenAtLogin(openAtLogin))
      .catch(() => { /* dev builds report off */ })
      .finally(() => setLoaded(true))
  }, [])

  const handleToggle = async (next: boolean) => {
    setOpenAtLogin(next)
    try {
      await window.ipc.invoke("app:setLoginItemSettings", { openAtLogin: next })
    } catch {
      setOpenAtLogin(!next)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">登录时启动海棠数字员工</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          将海棠数字员工 保留在菜单栏中，无需打开应用即可使用会议笔记和通知
        </div>
      </div>
      <Switch checked={openAtLogin} onCheckedChange={handleToggle} disabled={!loaded} />
    </div>
  )
}

function AppearanceSettings() {
  const { theme, setTheme, chatPanePlacement, setChatPanePlacement, chatPaneSize, setChatPaneSize } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">系统</h4>
        <LaunchAtLoginSetting />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-3">主题</h4>
        <p className="text-xs text-muted-foreground mb-4">
          选择你偏好的配色方案
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ThemeOption
            label="浅色"
            icon={Sun}
            isSelected={theme === "light"}
            onClick={() => setTheme("light")}
          />
          <ThemeOption
            label="深色"
            icon={Moon}
            isSelected={theme === "dark"}
            onClick={() => setTheme("dark")}
          />
          <ThemeOption
            label="跟随系统"
            icon={Monitor}
            isSelected={theme === "system"}
            onClick={() => setTheme("system")}
          />
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-3">对话</h4>
        <p className="text-xs text-muted-foreground mb-4">
          选择打开其他面板时对话窗口的位置
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ThemeOption
            label="对话在右侧"
            icon={PanelRight}
            isSelected={chatPanePlacement === "right"}
            onClick={() => setChatPanePlacement("right")}
          />
          <ThemeOption
            label="对话在中间"
            icon={MessageCircle}
            isSelected={chatPanePlacement === "middle"}
            onClick={() => setChatPanePlacement("middle")}
          />
        </div>
        <h4 className="mt-6 text-sm font-medium mb-3">对话宽度</h4>
        <p className="text-xs text-muted-foreground mb-4">
          选择打开其他面板时对话窗口占用的宽度
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ThemeOption
            label="对话更窄"
            icon={MessageCircle}
            isSelected={chatPaneSize === "chat-smaller"}
            onClick={() => setChatPaneSize("chat-smaller")}
          />
          <ThemeOption
            label="对话均分"
            icon={Monitor}
            isSelected={chatPaneSize === "chat-equal"}
            onClick={() => setChatPaneSize("chat-equal")}
          />
          <ThemeOption
            label="对话更宽"
            icon={PanelRight}
            isSelected={chatPaneSize === "chat-bigger"}
            onClick={() => setChatPaneSize("chat-bigger")}
          />
        </div>
      </div>
    </div>
  )
}



interface ToolkitInfo {
  slug: string
  name: string
  meta: { description: string; logo: string; tools_count: number; triggers_count: number }
  no_auth?: boolean
  auth_schemes?: string[]
  composio_managed_auth_schemes?: string[]
}

function ToolsLibrarySettings({ dialogOpen, crabappleConnected }: { dialogOpen: boolean; crabappleConnected: boolean }) {
  // API key state
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)

  // Toolkit browsing state
  const [toolkits, setToolkits] = useState<ToolkitInfo[]>([])
  const [toolkitsLoading, setToolkitsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Connection state
  const [connectedToolkits, setConnectedToolkits] = useState<Set<string>>(new Set())
  const [connectingToolkit, setConnectingToolkit] = useState<string | null>(null)

  // Check API key configuration
  const checkApiKey = useCallback(async () => {
    try {
      const result = await window.ipc.invoke("composio:is-configured", null)
      setApiKeyConfigured(result.configured)
      if (!result.configured) {
        setShowApiKeyInput(true)
      }
    } catch {
      setApiKeyConfigured(false)
    }
  }, [])

  // Load connected toolkits
  const loadConnected = useCallback(async () => {
    try {
      const result = await window.ipc.invoke("composio:list-connected", null)
      setConnectedToolkits(new Set(result.toolkits))
    } catch {
      // ignore
    }
  }, [])

  // Load toolkits
  const loadToolkits = useCallback(async () => {
    setToolkitsLoading(true)
    try {
      const result = await window.ipc.invoke("composio:list-toolkits", {})
      setToolkits(result.items)
    } catch {
      toast.error("加载工具包失败")
    } finally {
      setToolkitsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (!dialogOpen) return
    checkApiKey()
    loadConnected()
  }, [dialogOpen, checkApiKey, loadConnected])

  // Load toolkits when API key is configured
  useEffect(() => {
    if (dialogOpen && apiKeyConfigured) {
      loadToolkits()
    }
  }, [dialogOpen, apiKeyConfigured, loadToolkits])

  // Listen for composio connection events
  useEffect(() => {
    const cleanup = window.ipc.on('composio:didConnect', (event) => {
      const { toolkitSlug, success, error } = event
      setConnectingToolkit(null)
      if (success) {
        setConnectedToolkits(prev => new Set([...prev, toolkitSlug]))
        toast.success(`Connected to ${toolkitSlug}`)
      } else {
        toast.error(error || `Failed to connect to ${toolkitSlug}`)
      }
    })
    return cleanup
  }, [])

  // Save API key
  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) return
    setApiKeySaving(true)
    try {
      const result = await window.ipc.invoke("composio:set-api-key", { apiKey: trimmed })
      if (result.success) {
        setApiKeyConfigured(true)
        setShowApiKeyInput(false)
        setApiKeyInput("")
        toast.success("Composio API 密钥已保存")
      } else {
        toast.error(result.error || "保存 API 密钥失败")
      }
    } catch {
      toast.error("保存 API 密钥失败")
    } finally {
      setApiKeySaving(false)
    }
  }

  // Connect a toolkit
  const handleConnect = async (toolkitSlug: string) => {
    setConnectingToolkit(toolkitSlug)
    try {
      const result = await window.ipc.invoke("composio:initiate-connection", { toolkitSlug })
      if (!result.success) {
        toast.error(result.error || "连接失败")
        setConnectingToolkit(null)
      }
      // Success will be handled by composio:didConnect event
    } catch {
      toast.error("连接失败")
      setConnectingToolkit(null)
    }
  }

  // Disconnect a toolkit
  const handleDisconnect = async (toolkitSlug: string) => {
    try {
      await window.ipc.invoke("composio:disconnect", { toolkitSlug })
      setConnectedToolkits(prev => {
        const next = new Set(prev)
        next.delete(toolkitSlug)
        return next
      })
      toast.success(`Disconnected from ${toolkitSlug}`)
    } catch {
      toast.error("断开失败")
    }
  }

  // Filter toolkits by search
  const filteredToolkits = searchQuery.trim()
    ? toolkits.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.meta.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : toolkits

  return (
    <div className="space-y-4">
      {/* Section A: API Key (only in BYOK mode) */}
      {!crabappleConnected && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Composio API 密钥</span>
          {apiKeyConfigured && !showApiKeyInput ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="size-4" />
                API 密钥已配置
              </div>
              <button
                onClick={() => setShowApiKeyInput(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                修改
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                输入你的 Composio API 密钥以浏览和启用工具集成。
                从以下地址获取密钥：{" "}
                <a
                  href="https://app.composio.dev/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  app.composio.dev/settings
                </a>
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="粘贴你的 Composio API 密钥"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim() || apiKeySaving}
                  size="sm"
                >
                  {apiKeySaving ? <Loader2 className="size-4 animate-spin" /> : "保存"}
                </Button>
                {apiKeyConfigured && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowApiKeyInput(false); setApiKeyInput("") }}
                  >
                    取消
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section B: Toolkit Browser (only when API key configured) */}
      {apiKeyConfigured && (
        <>
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">可用工具包</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索工具包..."
                className="pl-8"
              />
            </div>
          </div>

          {toolkitsLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin mr-2" />
              正在加载工具包...
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {filteredToolkits.map((toolkit) => {
                const isConnected = connectedToolkits.has(toolkit.slug)
                const isConnecting = connectingToolkit === toolkit.slug

                return (
                  <div key={toolkit.slug} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {/* Logo */}
                      {toolkit.meta.logo ? (
                        <img
                          src={toolkit.meta.logo}
                          alt=""
                          className="size-7 rounded object-contain shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="size-7 rounded bg-muted flex items-center justify-center shrink-0">
                          <Wrench className="size-3.5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Name & description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{toolkit.name}</span>
                          {isConnected && (
                            <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-green-600">
                              已连接
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {toolkit.meta.description}
                        </p>
                      </div>

                      {/* Connect / Disconnect button */}
                      {isConnected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(toolkit.slug)}
                          className="text-xs h-7 shrink-0"
                        >
                          断开
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(toolkit.slug)}
                          disabled={isConnecting}
                          className="text-xs h-7 shrink-0"
                        >
                          {isConnecting ? (
                            <><Loader2 className="size-3 animate-spin mr-1" />正在连接...</>
                          ) : (
                            <><Link2 className="size-3 mr-1" />连接</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}

              {filteredToolkits.length === 0 && !toolkitsLoading && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {searchQuery ? "没有匹配搜索的工具包" : "没有可用的工具包"}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// --- Note Tagging Settings ---

interface TagDef {
  tag: string
  type: string
  applicability: "email" | "notes" | "both"
  description: string
  example?: string
  noteEffect?: "create" | "skip" | "none"
}

const NOTE_TAG_TYPE_ORDER = [
  "relationship", "relationship-sub", "topic", "action", "status", "source",
]

const EMAIL_TAG_TYPE_ORDER = [
  "relationship", "topic", "email-type", "noise", "action", "status",
]

const TAG_TYPE_LABELS: Record<string, string> = {
  "relationship": "关系",
  "relationship-sub": "关系子标签",
  "topic": "主题",
  "email-type": "邮件类型",
  "noise": "噪音",
  "action": "行动",
  "status": "状态",
  "source": "来源",
}


function TagGroupTable({
  group,
  tags: _tags,
  collapsed,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
  getGlobalIndex,
  isEmail,
}: {
  group: { type: string; label: string; tags: TagDef[] }
  tags: TagDef[]
  collapsed: boolean
  onToggle: () => void
  onAdd: () => void
  onUpdate: (index: number, field: keyof TagDef, value: string | boolean) => void
  onRemove: (index: number) => void
  getGlobalIndex: (type: string, localIndex: number) => number
  isEmail: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", !collapsed && "rotate-90")} />
          {group.label}
          <span className="text-[10px] ml-0.5">({group.tags.length})</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onAdd}
        >
          <Plus className="size-3 mr-1" />
          添加
        </Button>
      </div>
      {!collapsed && group.tags.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <div className={cn(
            "gap-1 bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider grid",
            isEmail ? "grid-cols-[100px_1fr_1fr_60px_24px]" : "grid-cols-[100px_1fr_1fr_24px]"
          )}>
            <div>标签</div>
            <div>描述</div>
            <div>示例</div>
            {isEmail && <div className="text-center" title="带此标签的邮件将被排除在笔记创建之外">跳过笔记</div>}
            <div />
          </div>
          {group.tags.map((tag, localIdx) => {
            const globalIdx = getGlobalIndex(group.type, localIdx)
            return (
              <div key={globalIdx} className={cn(
                "gap-1 border-t px-2 py-0.5 items-center grid",
                isEmail ? "grid-cols-[100px_1fr_1fr_60px_24px]" : "grid-cols-[100px_1fr_1fr_24px]"
              )}>
                <Input
                  value={tag.tag}
                  onChange={e => onUpdate(globalIdx, "tag", e.target.value)}
                  className="h-7 text-xs"
                  placeholder="tag-name"
                  title={tag.tag}
                />
                <Input
                  value={tag.description}
                  onChange={e => onUpdate(globalIdx, "description", e.target.value)}
                  className="h-7 text-xs"
                  placeholder="描述"
                  title={tag.description}
                />
                <Input
                  value={tag.example || ""}
                  onChange={e => onUpdate(globalIdx, "example", e.target.value)}
                  className="h-7 text-xs"
                  placeholder="示例"
                  title={tag.example || ""}
                />
                {isEmail && (
                  <div className="flex justify-center">
                    <Switch
                      checked={tag.noteEffect === "skip"}
                      onCheckedChange={checked => onUpdate(globalIdx, "noteEffect", checked ? "skip" : "create")}
                      className="scale-75"
                    />
                  </div>
                )}
                <button
                  onClick={() => onRemove(globalIdx)}
                  className="flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
      {!collapsed && group.tags.length === 0 && (
        <div className="text-xs text-muted-foreground italic px-2">此组中没有标签</div>
      )}
    </div>
  )
}

function NoteTaggingSettings({ dialogOpen }: { dialogOpen: boolean }) {
  const [tags, setTags] = useState<TagDef[]>([])
  const [originalTags, setOriginalTags] = useState<TagDef[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [activeSection, setActiveSection] = useState<"notes" | "email">("notes")

  const hasChanges = JSON.stringify(tags) !== JSON.stringify(originalTags)

  useEffect(() => {
    if (!dialogOpen) return
    async function load() {
      setLoading(true)
      try {
        const result = await window.ipc.invoke("workspace:readFile", { path: "config/tags.json" })
        const parsed = JSON.parse(result.data)
        setTags(parsed)
        setOriginalTags(parsed)
      } catch {
        setTags([])
        setOriginalTags([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dialogOpen])

  const noteGroups = useMemo(() => {
    const map = new Map<string, TagDef[]>()
    for (const tag of tags) {
      if (tag.applicability === "email") continue
      const list = map.get(tag.type) ?? []
      list.push(tag)
      map.set(tag.type, list)
    }
    return NOTE_TAG_TYPE_ORDER.filter(type => map.has(type)).map(type => ({
      type,
      label: TAG_TYPE_LABELS[type],
      tags: map.get(type) ?? [],
    }))
  }, [tags])

  const emailGroups = useMemo(() => {
    const map = new Map<string, TagDef[]>()
    for (const tag of tags) {
      if (tag.applicability === "notes") continue
      const list = map.get(tag.type) ?? []
      list.push(tag)
      map.set(tag.type, list)
    }
    return EMAIL_TAG_TYPE_ORDER.filter(type => map.has(type)).map(type => ({
      type,
      label: TAG_TYPE_LABELS[type],
      tags: map.get(type) ?? [],
    }))
  }, [tags])

  const getGlobalIndex = useCallback((type: string, localIndex: number) => {
    let count = 0
    for (let i = 0; i < tags.length; i++) {
      if (tags[i].type === type) {
        if (count === localIndex) return i
        count++
      }
    }
    return -1
  }, [tags])

  const updateTag = useCallback((index: number, field: keyof TagDef, value: string | boolean) => {
    setTags(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }, [])

  const removeTag = useCallback((index: number) => {
    setTags(prev => prev.filter((_, i) => i !== index))
  }, [])

  const addTag = useCallback((type: string) => {
    const isEmailSection = activeSection === "email"
    const applicability = isEmailSection ? "email" as const : "notes" as const
    // For email-only types, always use "email"; for notes-only types, always use "notes"; otherwise use "both"
    const emailOnlyTypes = ["email-type", "noise"]
    const notesOnlyTypes = ["relationship-sub", "source"]
    let finalApplicability: "email" | "notes" | "both" = "both"
    if (emailOnlyTypes.includes(type)) finalApplicability = "email"
    else if (notesOnlyTypes.includes(type)) finalApplicability = "notes"
    else finalApplicability = isEmailSection ? "email" : applicability

    const newTag: TagDef = {
      tag: "",
      type,
      applicability: finalApplicability === "email" && !isEmailSection ? "both" : finalApplicability === "notes" && isEmailSection ? "both" : finalApplicability,
      description: "",
      noteEffect: isEmailSection ? "create" : "none",
    }
    const lastIndex = tags.reduce((acc, t, i) => t.type === type ? i : acc, -1)
    if (lastIndex === -1) {
      setTags(prev => [...prev, newTag])
    } else {
      setTags(prev => [...prev.slice(0, lastIndex + 1), newTag, ...prev.slice(lastIndex + 1)])
    }
  }, [tags, activeSection])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await window.ipc.invoke("workspace:writeFile", {
        path: "config/tags.json",
        data: JSON.stringify(tags, null, 2),
      })
      setOriginalTags([...tags])
      toast.success("标签配置已保存")
    } catch {
      toast.error("保存标签配置失败")
    } finally {
      setSaving(false)
    }
  }, [tags])

  const toggleGroup = useCallback((type: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  const currentGroups = activeSection === "notes" ? noteGroups : emailGroups

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 mb-3 border-b">
        <button
          onClick={() => setActiveSection("notes")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
            activeSection === "notes"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="size-3.5" />
          Note Tags
        </button>
        <button
          onClick={() => setActiveSection("email")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
            activeSection === "email"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Mail className="size-3.5" />
          Email Labels
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {currentGroups.map(group => (
          <TagGroupTable
            key={group.type}
            group={group}
            tags={tags}
            collapsed={collapsedGroups.has(group.type)}
            onToggle={() => toggleGroup(group.type)}
            onAdd={() => addTag(group.type)}
            onUpdate={updateTag}
            onRemove={removeTag}
            getGlobalIndex={getGlobalIndex}
            isEmail={activeSection === "email"}
          />
        ))}
      </div>
      <div className="pt-3 border-t mt-3 flex items-center justify-between">
        <div>
          {hasChanges && (
            <span className="text-xs text-muted-foreground">有未保存的更改</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Code Mode Settings ---

function AgentStatusRow({
  name,
  agent,
  signInCommand,
  status,
  onProvisioned,
}: {
  name: string
  agent: 'claude' | 'codex'
  signInCommand: string
  status: AgentStatus | null
  onProvisioned: () => void
}) {
  const prov = useProvisioning(agent)
  const provisioning = prov !== undefined && prov.error === undefined
  const error = prov?.error ?? null
  const enable = useCallback(() => startProvisioning(agent, onProvisioned), [agent, onProvisioned])

  // Treat a just-enabled engine as installed even before the status refresh lands.
  const installed = (status?.installed ?? false) || enabledOptimistic.has(agent)
  const ready = installed && status?.signedIn
  return (
    <div className="rounded-md border px-3 py-2.5 flex items-center gap-3">
      {agent === 'claude' ? (
        <AnthropicIcon className="size-5 shrink-0" />
      ) : (
        <OpenAIIcon className="size-5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
          <span className={cn("inline-flex items-center gap-1", installed ? "text-green-600" : "text-muted-foreground")}>
            {installed ? <CheckCircle2 className="size-3" /> : <X className="size-3" />}
            {installed ? 'Engine ready' : 'Not enabled'}
          </span>
          <span className={cn("inline-flex items-center gap-1", status?.signedIn ? "text-green-600" : "text-muted-foreground")}>
            {status?.signedIn ? <CheckCircle2 className="size-3" /> : <X className="size-3" />}
            Signed in
          </span>
        </div>
        {error && <div className="text-xs text-red-600 mt-1 break-words">{error}</div>}
      </div>
      {provisioning ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 tabular-nums">
          <Loader2 className="size-3 animate-spin" />
          {prov?.pct != null ? `${prov.pct}%` : null}
        </span>
      ) : ready ? (
        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium leading-none text-green-600">
          Ready
        </span>
      ) : !installed ? (
        <button
          type="button"
          onClick={enable}
          className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 shrink-0"
        >
          Enable
        </button>
      ) : (
        <span className="text-xs text-muted-foreground shrink-0">
          Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">{signInCommand}</code>
        </span>
      )}
    </div>
  )
}

function CodeModeSettings({ dialogOpen }: { dialogOpen: boolean }) {
  const [enabled, setEnabled] = useState(false)
  const [approvalPolicy, setApprovalPolicy] = useState<ApprovalPolicy>('ask')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<CodeModeAgentStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const loadStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const result = await window.ipc.invoke("codeMode:checkAgentStatus", null)
      setStatus(result)
    } catch {
      setStatus(null)
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!dialogOpen) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const result = await window.ipc.invoke("codeMode:getConfig", null)
        if (!cancelled) {
          setEnabled(result.enabled)
          setApprovalPolicy(result.approvalPolicy ?? 'ask')
        }
      } catch {
        if (!cancelled) setEnabled(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    loadStatus()
    return () => { cancelled = true }
  }, [dialogOpen, loadStatus])

  const handleToggle = useCallback(async (next: boolean) => {
    setSaving(true)
    setEnabled(next)
    try {
      await window.ipc.invoke("codeMode:setConfig", { enabled: next, approvalPolicy })
      window.dispatchEvent(new Event("code-mode-config-changed"))
      toast.success(next ? "代码模式已启用" : "代码模式已禁用")
    } catch {
      setEnabled(!next)
      toast.error("更新代码模式失败")
    } finally {
      setSaving(false)
    }
  }, [approvalPolicy])

  const handlePolicyChange = useCallback(async (next: ApprovalPolicy) => {
    const prev = approvalPolicy
    setSaving(true)
    setApprovalPolicy(next)
    try {
      await window.ipc.invoke("codeMode:setConfig", { enabled, approvalPolicy: next })
      window.dispatchEvent(new Event("code-mode-config-changed"))
    } catch {
      setApprovalPolicy(prev)
      toast.error("更新审批策略失败")
    } finally {
      setSaving(false)
    }
  }, [enabled, approvalPolicy])

  const anyReady = status?.claude.installed && status?.claude.signedIn
    || status?.codex.installed && status?.codex.signedIn

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">代码模式</strong>让助手把编码任务委托给你机器上运行的{' '}
          <strong className="text-foreground">Claude Code</strong> 或 <strong className="text-foreground">Codex</strong>。
          在输入框中直接选择代理；助手在本机运行它，并把工具调用、文件差异和审批实时流式显示到对话中。
        </p>
        <p>
          需要一个有效的 <strong className="text-foreground">Claude Code</strong> 订阅或{' '}
          <strong className="text-foreground">ChatGPT/Codex</strong> 订阅。你可以两者都配置。
        </p>
        <p>
          每个要使用的代理都必须在这台机器上{' '}
          <strong className="text-foreground">安装并登录</strong>：点击下方{' '}
          <strong className="text-foreground">启用</strong>下载引擎，然后在终端运行{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">claude login</code>{' '}
          或 <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">codex login</code>{' '}
          登录。代码模式使用已保存的登录状态。
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">代理状态</span>
          <button
            onClick={() => { void loadStatus() }}
            disabled={statusLoading}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {statusLoading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            重新检查
          </button>
        </div>
        <div className="space-y-2">
          <AgentStatusRow
            name="Claude Code"
            agent="claude"
            signInCommand="claude login"
            status={status?.claude ?? null}
            onProvisioned={loadStatus}
          />
          <AgentStatusRow
            name="Codex"
            agent="codex"
            signInCommand="codex login"
            status={status?.codex ?? null}
            onProvisioned={loadStatus}
          />
        </div>
      </div>

      <div className="rounded-md border px-3 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">启用代码模式</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            在输入框中显示代码模式标识，并让助手委托给你已安装的代理。
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={saving}
        />
      </div>

      {enabled && (
        <div className="rounded-md border px-3 py-3 space-y-2">
          <div className="text-sm font-medium">审批</div>
          <div className="text-xs text-muted-foreground">
            编码代理在修改文件或运行命令前如何征得同意。你始终能在时间线中看到它的全部操作——这里只控制提示方式。
          </div>
          <Select
            value={approvalPolicy}
            onValueChange={(v) => handlePolicyChange(v as ApprovalPolicy)}
            disabled={saving}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ask">每次都询问</SelectItem>
              <SelectItem value="auto-approve-reads">自动批准读取</SelectItem>
              <SelectItem value="yolo">自动批准一切 (YOLO)</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            {approvalPolicy === 'ask' && '每个文件修改和命令都需要你批准。'}
            {approvalPolicy === 'auto-approve-reads' && '读取和搜索自动进行；写入、编辑和命令仍需你批准。'}
            {approvalPolicy === 'yolo' && '代理无需询问即可执行一切（写入、编辑、命令）。仅在你信任的文件夹中使用。'}
          </div>
        </div>
      )}

      {enabled && status && !anyReady && (
        <div className="rounded-md border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5 flex items-start gap-2 text-xs">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="text-amber-900 dark:text-amber-200">
            Claude Code 和 Codex 均未就绪。点击上方"启用"下载引擎，用订阅账号登录，然后点击"重新检查"。
          </div>
        </div>
      )}
    </div>
  )
}

// --- Notification Settings ---

type NotificationCategoryKey = "chat_completion" | "new_email" | "agent_permission" | "background_task" | "meeting_detection" | "meeting_notes_ready"

const NOTIFICATION_CATEGORIES: { key: NotificationCategoryKey; label: string; description: string }[] = [
  {
    key: "chat_completion",
    label: "对话回复",
    description: "当代理在应用处于后台时完成回复。",
  },
  {
    key: "new_email",
    label: "新邮件",
    description: "当应用处于后台同步时收到新邮件。",
  },
  {
    key: "agent_permission",
    label: "权限请求",
    description: "当代理需要你批准运行工具时。即使应用处于前台也始终显示。",
  },
  {
    key: "background_task",
    label: "后台代理",
    description: "当你设置的后台代理有内容要展示时。点击可在后台任务页面打开。",
  },
  {
    key: "meeting_detection",
    label: "会议检测",
    description: "当海棠数字员工 检测到你在通话或会议中时弹出记笔记提示。在你接受前不会录制任何内容。",
  },
  {
    key: "meeting_notes_ready",
    label: "会议笔记就绪",
    description: "通话后会议笔记生成完成时。点击打开笔记。仅在应用处于后台时显示。",
  },
]

function NotificationSettings({ dialogOpen }: { dialogOpen: boolean }) {
  const [categories, setCategories] = useState<Record<NotificationCategoryKey, boolean> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!dialogOpen) return
    let cancelled = false
    async function load() {
      try {
        const result = await window.ipc.invoke("notifications:getSettings", null)
        if (!cancelled) setCategories(result.categories)
      } catch {
        if (!cancelled) toast.error("加载通知设置失败")
      }
    }
    load()
    return () => { cancelled = true }
  }, [dialogOpen])

  const handleToggle = useCallback(async (key: NotificationCategoryKey, next: boolean) => {
    // Optimistic update with rollback on failure.
    const previous = categories
    if (!previous) return
    const updated = { ...previous, [key]: next }
    setCategories(updated)
    setSaving(true)
    try {
      await window.ipc.invoke("notifications:setSettings", { categories: updated })
    } catch {
      setCategories(previous)
      toast.error("更新通知设置失败")
    } finally {
      setSaving(false)
    }
  }, [categories])

  if (!categories) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-muted-foreground leading-relaxed">
        选择海棠数字员工 向你发送哪些桌面通知。环境通知仅在应用处于后台时显示。
      </div>

      <div className="space-y-2">
        {NOTIFICATION_CATEGORIES.map((cat) => (
          <div key={cat.key} className="rounded-md border px-3 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{cat.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{cat.description}</div>
            </div>
            <Switch
              checked={categories[cat.key]}
              onCheckedChange={(next) => handleToggle(cat.key, next)}
              disabled={saving}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Advanced (runtime/cost controls) tab ---

const MODEL_CALL_LIMIT_MIN = 1
const MODEL_CALL_LIMIT_MAX = 500

function parseLimit(value: string): number | null {
  const n = Number(value.trim())
  if (!Number.isInteger(n) || n < MODEL_CALL_LIMIT_MIN || n > MODEL_CALL_LIMIT_MAX) return null
  return n
}

/**
 * Compact segmented − / value / + stepper. The native number-input spinners
 * are replaced entirely: typing is free-form digits, stepping clamps to the
 * range and commits immediately. An empty value steps from `fallback` (the
 * chat field starts from the global limit).
 */
function LimitStepper({
  value,
  fallback,
  placeholder,
  onInput,
  onCommit,
}: {
  value: string
  fallback: number
  placeholder?: string
  /** Every keystroke (no save). */
  onInput: (next: string) => void
  /** A settled change: step click or blur. */
  onCommit: (next: string) => void
}) {
  const current = parseLimit(value)

  const step = (delta: number) => {
    // From an empty/invalid field, the first step lands on the fallback so
    // the override starts where the effective value already is.
    const next = current === null
      ? Math.min(MODEL_CALL_LIMIT_MAX, Math.max(MODEL_CALL_LIMIT_MIN, fallback))
      : Math.min(MODEL_CALL_LIMIT_MAX, Math.max(MODEL_CALL_LIMIT_MIN, current + delta))
    onCommit(String(next))
  }

  return (
    <div className="flex h-8 items-center overflow-hidden rounded-md border border-input bg-background shadow-xs shrink-0">
      <button
        type="button"
        aria-label="减少上限"
        onClick={() => step(-1)}
        disabled={current !== null && current <= MODEL_CALL_LIMIT_MIN}
        className="flex h-full w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="size-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onInput(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={() => onCommit(value)}
        className={cn(
          "h-full border-x border-input bg-transparent text-center text-sm tabular-nums outline-none",
          // The 11px placeholder sits on the 14px text baseline, so it reads
          // slightly low; nudge it up for optical centering. Only applies
          // while the placeholder is visible, so typed text is unaffected.
          "placeholder:text-[11px] placeholder:text-muted-foreground/70 placeholder-shown:pb-1",
          placeholder ? "w-24" : "w-16",
        )}
      />
      <button
        type="button"
        aria-label="增加上限"
        onClick={() => step(1)}
        disabled={current !== null && current >= MODEL_CALL_LIMIT_MAX}
        className="flex h-full w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus className="size-3" />
      </button>
    </div>
  )
}

function AdvancedSettings({ dialogOpen }: { dialogOpen: boolean }) {
  // Inputs are kept as strings so the user can clear a field while typing;
  // validation happens on commit (step click or blur).
  const [globalLimit, setGlobalLimit] = useState("")
  const [chatLimit, setChatLimit] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!dialogOpen) return
    let cancelled = false
    window.ipc.invoke("turnLimits:getSettings", null)
      .then((settings) => {
        if (cancelled) return
        setGlobalLimit(String(settings.maxModelCalls))
        // A chat override equal to the global limit is no override — show
        // "Same as above" (legacy files; saves already collapse this).
        setChatLimit(
          settings.chatMaxModelCalls !== undefined && settings.chatMaxModelCalls !== settings.maxModelCalls
            ? String(settings.chatMaxModelCalls)
            : ""
        )
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) toast.error("加载高级设置失败")
      })
    return () => { cancelled = true }
  }, [dialogOpen])

  // Saves silently on success (a toast per stepper click would be noisy,
  // matching the notification toggles); errors still surface.
  const saveLimits = useCallback(async (globalStr: string, chatStr: string) => {
    const global = parseLimit(globalStr)
    if (global === null) {
      toast.error(`Model-call limit must be a whole number between ${MODEL_CALL_LIMIT_MIN} and ${MODEL_CALL_LIMIT_MAX}`)
      return
    }
    let chat: number | undefined
    if (chatStr.trim() !== "") {
      const parsed = parseLimit(chatStr)
      if (parsed === null) {
        toast.error(`Chat limit must be empty or a whole number between ${MODEL_CALL_LIMIT_MIN} and ${MODEL_CALL_LIMIT_MAX}`)
        return
      }
      chat = parsed
    }
    // An override equal to the global limit is meaningless — persist it as
    // "use the global limit" so the field reopens as "Same as above".
    if (chat === global) chat = undefined
    try {
      await window.ipc.invoke("turnLimits:setSettings", {
        maxModelCalls: global,
        ...(chat === undefined ? {} : { chatMaxModelCalls: chat }),
      })
    } catch {
      toast.error("保存模型调用上限失败")
    }
  }, [])

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-muted-foreground leading-relaxed">
        运行时成本和安全管理。一次回合达到模型调用上限后即停止；更改仅对新建回合生效。
      </div>

      <div className="space-y-2">
        <div className="rounded-md border px-3 py-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">模型调用上限</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              每回合的最大模型调用次数。默认适用于所有场景——后台和知识工作、定时代理以及子代理（同时限制子代理预算）。
            </div>
          </div>
          <LimitStepper
            value={globalLimit}
            fallback={DEFAULT_TURN_LIMITS_SETTINGS.maxModelCalls}
            onInput={setGlobalLimit}
            onCommit={(next) => {
              setGlobalLimit(next)
              void saveLimits(next, chatLimit)
            }}
          />
        </div>

        <div className="rounded-md border px-3 py-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">对话模型调用上限</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              交互式对话回合的可选独立上限。留空则使用上面的模型调用上限。
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {chatLimit.trim() !== "" && (
              <button
                type="button"
                aria-label="使用全局上限"
                title="使用全局上限"
                onClick={() => {
                  setChatLimit("")
                  void saveLimits(globalLimit, "")
                }}
                className="flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
            <LimitStepper
              value={chatLimit}
              fallback={parseLimit(globalLimit) ?? DEFAULT_TURN_LIMITS_SETTINGS.maxModelCalls}
              placeholder="同上"
              onInput={setChatLimit}
              onCommit={(next) => {
                setChatLimit(next)
                // An emptied chat field on blur means "use the global
                // limit" — persist the override removal.
                void saveLimits(globalLimit, next)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main Settings Dialog ---

export function SettingsDialog({ children, defaultTab = "account", open: controlledOpen, onOpenChange }: SettingsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = useCallback((next: boolean) => {
    if (onOpenChange) onOpenChange(next)
    else setInternalOpen(next)
  }, [onOpenChange])
  const [activeTab, setActiveTab] = useState<ConfigTab>(defaultTab)
  const [content, setContent] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Sign-in state comes from the shared model store (single source of
  // truth), which refetches on the oauth:didConnect broadcast — emitted on
  // BOTH connect and disconnect (disconnectProvider sends success:false).
  // A dialog-open-time snapshot here went stale when the user signed out
  // with the dialog open, leaving the Models tab on the signed-in section.
  const { isCrabappleConnected: crabappleConnected } = useModels()

  // Reset to the requested default tab each time the dialog is opened
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab)
      analytics.settingsOpened(defaultTab)
    }
  }, [open, defaultTab])

  // Hybrid mode: the Models tab is shown in both modes — signed-in users can
  // pick gateway models AND bring their own providers/models alongside.
  const visibleTabs = tabs

  const activeTabConfig = visibleTabs.find((t) => t.id === activeTab) ?? visibleTabs[0]
  const isJsonTab = activeTab === "mcp" || activeTab === "security"

  const formatJson = (jsonString: string): string => {
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2)
    } catch {
      return jsonString
    }
  }

  const loadConfig = useCallback(async (tab: ConfigTab) => {
    if (tab === "appearance" || tab === "models" || tab === "note-tagging" || tab === "account" || tab === "connections" || tab === "help" || tab === "code-mode" || tab === "notifications" || tab === "advanced") return
    const tabConfig = tabs.find((t) => t.id === tab)!
    if (!tabConfig.path) return
    setLoading(true)
    setError(null)
    try {
      const result = await window.ipc.invoke("workspace:readFile", {
        path: tabConfig.path,
      })
      const formattedContent = formatJson(result.data)
      setContent(formattedContent)
      setOriginalContent(formattedContent)
    } catch {
      setError(`Failed to load ${tabConfig.label} config`)
      setContent("")
      setOriginalContent("")
    } finally {
      setLoading(false)
    }
  }, [])

  const saveConfig = async () => {
    if (!isJsonTab || !activeTabConfig.path) return
    setSaving(true)
    setError(null)
    try {
      JSON.parse(content)
      await window.ipc.invoke("workspace:writeFile", {
        path: activeTabConfig.path,
        data: content,
      })
      setOriginalContent(content)
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("JSON 语法无效")
      } else {
        setError(`保存 ${activeTabConfig.label} 配置失败`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleFormat = () => {
    setContent(formatJson(content))
  }

  const hasChanges = content !== originalContent

  useEffect(() => {
    if (open && isJsonTab) {
      loadConfig(activeTab)
    }
  }, [open, activeTab, isJsonTab, loadConfig])

  const handleTabChange = (tab: ConfigTab) => {
    if (isJsonTab && hasChanges) {
      if (!confirm("你有未保存的更改，确定丢弃吗？")) {
        return
      }
    }
    analytics.settingsTabChanged(tab)
    setActiveTab(tab)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent
        className="max-w-[900px]! w-[900px] h-[600px] p-0 gap-0 overflow-hidden"
      >
        <div className="flex h-full overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r bg-muted/30 p-2 flex flex-col">
            <div className="px-2 pt-3.5 pb-3 mb-2">
              <h2 className="font-semibold text-base tracking-tight">设置</h2>
            </div>
            <nav className="flex flex-col">
              {NAV_SECTIONS.map((section) => {
                const sectionTabs = visibleTabs.filter((tab) => section.ids.includes(tab.id))
                if (sectionTabs.length === 0) return null
                return (
                  <div key={section.label ?? "main"} className="flex flex-col gap-0.5">
                    {section.label ? (
                      <div className="px-2 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {section.label}
                      </div>
                    ) : null}
                    {sectionTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                          activeTab === tab.id
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        <tab.icon className="size-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Header */}
            <div className="px-6 pb-4 pt-5">
              <h3 className="text-lg font-semibold tracking-tight">{activeTabConfig.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === "models"
                  ? "选择海棠数字员工 用于对话和后台工作的模型。"
                  : activeTabConfig.description}
              </p>
            </div>

            {/* Content */}
            {/* JSON tabs render a full-height textarea (it scrolls itself);
                note-tagging manages its own scroll region; everything else
                scrolls here so tall tabs aren't clipped by the fixed dialog. */}
            <div className={cn("flex-1 px-6 pb-5 min-h-0", isJsonTab ? "overflow-hidden" : activeTab === "note-tagging" ? "overflow-hidden flex flex-col" : "overflow-y-auto")}>
              {activeTab === "account" ? (
                <AccountSettings dialogOpen={open} />
              ) : activeTab === "connections" ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">主要账号</h4>
                    <ConnectedAccountsSettings dialogOpen={open} />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">工具库</h4>
                    <ToolsLibrarySettings dialogOpen={open} crabappleConnected={crabappleConnected} />
                  </div>
                </div>
              ) : activeTab === "mobile" ? (
                <MobileChannelsSettings dialogOpen={open} />
              ) : activeTab === "models" ? (
                // ONE model-selection surface for signed-in and BYOK alike:
                // the Assistant model + per-task overrides, then provider
                // (credential) management below.
                <div className="space-y-8">
                  <ModelSelectionSection dialogOpen={open} />
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">{crabappleConnected ? "你的自有供应商" : "供应商"}</h4>
                    <p className="text-xs text-muted-foreground">
                      {crabappleConnected
                        ? "连接你自己的 API 密钥或本地运行时（Ollama、LM Studio）。它们的模型会与你的海棠数字员工 模型一起出现在每个选择器中，并直接向你计费。"
                        : "连接 API 密钥或本地运行时（Ollama、LM Studio）。每个已连接供应商的模型都会出现在上面的选择器中。"}
                    </p>
                    <ProvidersSection dialogOpen={open} />
                  </div>
                </div>
              ) : activeTab === "note-tagging" ? (
                <NoteTaggingSettings dialogOpen={open} />
              ) : activeTab === "appearance" ? (
                <AppearanceSettings />
              ) : activeTab === "notifications" ? (
                <NotificationSettings dialogOpen={open} />
              ) : activeTab === "advanced" ? (
                <AdvancedSettings dialogOpen={open} />
              ) : activeTab === "help" ? (
                <HelpSettings />
              ) : activeTab === "code-mode" ? (
                <CodeModeSettings dialogOpen={open} />
              ) : loading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  加载中...
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full resize-none bg-muted/50 rounded-md p-3 font-mono text-sm border-0 focus:outline-none focus:ring-1 focus:ring-ring"
                  spellCheck={false}
                  placeholder="正在加载配置..."
                />
              )}
            </div>

            {/* Footer - only show for JSON config tabs */}
            {isJsonTab && (
              <div className="px-4 py-3 border-t flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {error && (
                    <span className="text-xs text-destructive">{error}</span>
                  )}
                  {hasChanges && !error && (
                    <span className="text-xs text-muted-foreground">
                      有未保存的更改
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFormat}
                    disabled={loading || saving}
                  >
                    格式化
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveConfig}
                    disabled={loading || saving || !hasChanges}
                  >
                    {saving ? "保存中..." : "保存"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
