"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, User, CreditCard, LogOut, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { useBilling } from "@/hooks/useBilling"
import { useCrabappleConfig } from "@/hooks/use-crabapple-config"
import { CreditRewards } from "@/components/settings/credit-rewards"
import { toast } from "sonner"
import { getBillingPlanData, type BillingUsageBucket } from "@x/shared/dist/billing.js"

interface AccountSettingsProps {
  dialogOpen: boolean
}

function CreditUsageBar({ label, bucket, helper }: {
  label: string
  bucket: BillingUsageBucket
  helper?: string
}) {
  const pct = bucket.sanctionedCredits > 0
    ? Math.min(100, Math.max(0, Math.round((bucket.usedCredits / bucket.sanctionedCredits) * 100)))
    : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {helper ? <p className="text-[11px] text-muted-foreground">{helper}</p> : null}
        </div>
        <p className="shrink-0 text-xs font-medium tabular-nums">
          {pct}%
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AccountSettings({ dialogOpen }: AccountSettingsProps) {
  const [isCrabappleConnected, setIsCrabappleConnected] = useState(false)
  const [connectionLoading, setConnectionLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const appUrl = useCrabappleConfig()?.appUrl ?? null
  const { billing, isLoading: billingLoading, refresh: refreshBilling } = useBilling(isCrabappleConnected)
  const currentPlan = billing ? getBillingPlanData(billing.catalog, billing.subscriptionPlanId) : null
  const hasPaidSubscription = currentPlan?.category === 'starter' || currentPlan?.category === 'pro'

  const checkConnection = useCallback(async () => {
    try {
      setConnectionLoading(true)
      const result = await window.ipc.invoke('oauth:getState', null)
      const connected = result.config?.crabapple?.connected ?? false
      setIsCrabappleConnected(connected)
    } catch {
      setIsCrabappleConnected(false)
    } finally {
      setConnectionLoading(false)
    }
  }, [])

  useEffect(() => {
    if (dialogOpen) {
      checkConnection()
    }
  }, [dialogOpen, checkConnection])

  useEffect(() => {
    const cleanup = window.ipc.on('oauth:didConnect', (event) => {
      if (event.provider === 'crabapple') {
        setIsCrabappleConnected(event.success)
        if (event.success) {
          toast.success('Logged in to Crabapple Bot')
        }
      }
    })
    return cleanup
  }, [])

  // A confirmed reward grant changes the bonus-credit balance; refetch so the
  // Earn-credits section shows the updated number while the dialog is open.
  useEffect(() => {
    return window.ipc.on('credits:didActivate', () => {
      refreshBilling()
    })
  }, [refreshBilling])

  const handleDisconnect = useCallback(async () => {
    try {
      setDisconnecting(true)
      const result = await window.ipc.invoke('oauth:disconnect', { provider: 'crabapple' })
      if (result.success) {
        setIsCrabappleConnected(false)
        toast.success('Logged out of Crabapple Bot')
      } else {
        toast.error('Failed to log out of Crabapple Bot')
      }
    } catch {
      toast.error('Failed to log out of Crabapple Bot')
    } finally {
      setDisconnecting(false)
    }
  }, [])

  if (connectionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isCrabappleConnected) {
    // xuechong 2026-08-08 crabapple-bot 本地化改造-去除官网登录
    // 本地模式：未连接 Crabapple Bot 账号，仅展示说明，不提供登录入口
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <User className="size-7 text-muted-foreground" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Local mode</p>
          <p className="text-xs text-muted-foreground">
            Not connected to Crabapple Bot. All data stays on this machine — configure your own model in Models settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <User className="size-6 text-primary" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {billing?.userEmail ?? 'Loading...'}
            </p>
          <p className="text-xs text-muted-foreground">海棠数字员工 账号</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Plan Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">套餐</h4>
        </div>

        {billingLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Loading plan details...
          </div>
        ) : billing ? (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium capitalize">
                  {currentPlan?.displayName ?? (billing.subscriptionPlanId ? 'Unknown' : 'No plan')}
                </p>
                {billing.subscriptionStatus === 'trialing' && billing.trialExpiresAt ? (() => {
                  const days = Math.max(0, Math.ceil((new Date(billing.trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  return (
                    <p className="text-xs text-muted-foreground">
                      Trial · {days === 0 ? 'expires today' : days === 1 ? '1 day left' : `${days} days left`}
                    </p>
                  )
                })() : billing.subscriptionStatus ? (
                  <p className="text-xs text-muted-foreground capitalize">{billing.subscriptionStatus}</p>
                ) : null}
                {!billing.subscriptionPlanId && (
                  <p className="text-xs text-muted-foreground">订阅以使用 AI 功能</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => appUrl && window.open(`${appUrl}?intent=upgrade`)}>
                {!billing.subscriptionPlanId ? 'Subscribe' : currentPlan?.category === 'free' ? 'Upgrade' : 'Change plan'}
              </Button>
            </div>
            <div className="space-y-3 border-t pt-3">
              <CreditUsageBar label="套餐用量" bucket={billing.monthly} />
              <CreditUsageBar
                label="每日用量"
                bucket={billing.daily}
                helper="每日用量于 00:00 UTC 重置"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">无法加载套餐详情</p>
        )}
      </div>

      <Separator />

      {/* Earn Credits Section */}
      <CreditRewards store={billing?.store ?? null} />

      <Separator />

      {/* Payment Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">支付</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage invoices, payment methods, and billing details.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPaidSubscription}
          onClick={() => appUrl && window.open(appUrl)}
          className="gap-1.5"
        >
          <ExternalLink className="size-3" />
          Manage in Stripe
        </Button>
        {!hasPaidSubscription && (
          <p className="text-[11px] text-muted-foreground">请先升级到付费套餐</p>
        )}
      </div>

      <Separator />

      {/* Log Out Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <LogOut className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">退出登录</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Logging out will remove access to synced data and Crabapple Bot-provided models.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              Log Out
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>退出海棠数字员工 账号？</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove access to synced data and Crabapple Bot-provided models. You can log back in at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {disconnecting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Log Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
