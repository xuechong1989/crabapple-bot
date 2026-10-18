import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import type { OnboardingState } from "../use-onboarding-state"

interface WelcomeStepProps {
  state: OnboardingState
}

export function WelcomeStep({ state }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center flex-1">
      {/* Logo + main heading on the same level */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4 mb-4"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to Crabapple Bot
        </h1>
        {/* Logo with ambient glow */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 size-12 rounded-2xl bg-primary/10 blur-xl scale-[2.5]" />
          <img src="/logo-only.png" alt="Crabapple Bot" className="relative size-12" />
        </div>
      </motion.div>

      {/* Tagline badge */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground mb-10"
      >
        <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
        Your AI coworker, with memory
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-base text-muted-foreground leading-relaxed max-w-sm mb-10"
      >
        Crabapple Bot connects to your work, builds a knowledge graph, and uses that context to help you get things done. Private and on your machine.
      </motion.p>

      {/* xuechong 2026-08-08 crabapple-bot 本地化改造-去除官网登录 */}
      {/* 本地模式：不提供 Crabapple Bot 官网账号登录，直接进入自带 API Key 的模型配置 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-xs"
      >
        <Button
          onClick={() => {
            state.setOnboardingPath('byok')
            state.setCurrentStep(1)
          }}
          size="lg"
          className="w-full h-12 text-base font-medium"
        >
          Continue with my own API key
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          No Crabapple Bot account needed — your data stays on this machine.
        </p>
      </motion.div>
    </div>
  )
}
