import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

// How long the popup stays up before dismissing itself. The countdown (and
// its progress line) pauses while the pointer is over the popup — main only
// keeps a much longer crash-safety fallback.
const AUTO_DISMISS_MS = 30_000

type PopupPayload = {
  title: string
  message: string
  hasCalendarEvent: boolean
}

// Robot glyph (black on transparent, same asset as the tray icon) —
// rendered on a white chip inside the "Take notes" pill.
const SAIL_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAD/SURBVFhH7ZYhDgIxFERXIpFIJMdAcgQkkmPgkBwDsYIjYHFIjoBEImGGpMnPZmA/bbdhyb7kCehvO92WpdVAnxnDPbzCA5zCouzgw3iEReGENsANFmUDbQBuQ1FGsIac/AR5Joozhwywen3qgAXcQu638gwZ4GK+a8rDuoRfw4nD/uaQZ4Tb5oKPVA2SKhflgo9ODZCq+6fKQjVADiewFdWRWlQ7Dag26nplq46KtppmO+0sgMK2B4cA2QLE1kQHyOV/BPiEqrf2IwAvmqqz9R2q1up6FfOvU3VOlQtzEW46uV1DN7zF3KEaKEb3XcDCA8MgvAHHylXP4MAvUlVPm1R2iR9HZxUAAAAASUVORK5CYII='

/**
 * Content of the "Meeting detected" always-on-top popup panel (see
 * `showMeetingPopup` in the main process). Granola-style consent prompt —
 * a lean horizontal bar: dashed rule (ad-hoc) or solid accent (calendar
 * match), "Meeting detected" + platform, and a "Take notes" pill. The ×
 * floats on the card's top-left corner; the window itself is transparent.
 * Detection never records — the user has to click "Take notes".
 */
// Opened directly in a browser (vite only, no Electron) there is no IPC
// bridge — render sample data so the popup can be styled with plain HMR.
// `?variant=calendar` previews the calendar-linked look.
const isPreview = typeof window.ipc === 'undefined'

export function MeetingDetectedPopup() {
  const [payload, setPayload] = useState<PopupPayload | null>(null)

  useEffect(() => {
    if (isPreview) {
      const calendar = new URLSearchParams(window.location.search).get('variant') === 'calendar'
      setPayload(
        calendar
          ? { title: 'Weekly design sync', message: 'Chrome', hasCalendarEvent: true }
          : { title: 'Meeting detected', message: 'Chrome', hasCalendarEvent: false },
      )
      return
    }
    const cleanup = window.ipc.on('meetingDetect:payload', (next) => setPayload(next))
    // The main process pushes on did-finish-load, but that can race this
    // listener's registration — fetch explicitly too.
    window.ipc
      .invoke('meetingDetect:getPayload', null)
      .then(({ payload: cached }) => {
        if (cached) setPayload(cached)
      })
      .catch(() => {})
    return cleanup
  }, [])

  const act = useCallback((action: 'take-notes' | 'dismiss') => {
    if (isPreview) {
      console.log(`[preview] action: ${action}`)
      return
    }
    void window.ipc.invoke('meetingDetect:action', { action }).catch(() => {})
  }, [])

  // Subtle arrival chime, synthesized (no asset, no process spawn): a soft
  // sine ding gliding up a fourth, ~0.35s, low gain. Once per popup.
  const chimedRef = useRef(false)
  useEffect(() => {
    if (!payload || chimedRef.current || isPreview) return
    chimedRef.current = true
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
      osc.onended = () => void ctx.close()
    } catch { /* audio is best-effort */ }
  }, [payload])

  // Auto-dismiss countdown, rendered as the progress line at the bottom.
  // Hovering pauses it (elapsed only accrues while the pointer is away).
  const [remainingFrac, setRemainingFrac] = useState(1)
  const hoveredRef = useRef(false)
  useEffect(() => {
    const TICK_MS = 100
    let elapsed = 0
    const timer = setInterval(() => {
      if (hoveredRef.current) return
      elapsed += TICK_MS
      const frac = Math.max(0, 1 - elapsed / AUTO_DISMISS_MS)
      setRemainingFrac(frac)
      if (frac <= 0) {
        clearInterval(timer)
        act('dismiss')
      }
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [act])

  // The Electron window IS the card (376×48, card background, native macOS
  // rounded corners + shadow — no transparency, which panels don't honor).
  // The preview emulates that frame with its own rounding/shadow.
  // No drag region: draggable areas swallow mouse events, which would keep
  // the hover-revealed × from ever showing while over the card body.
  const popup = (
    <div
      className={`group relative flex items-center gap-3 pl-4 pr-2 bg-[#1d1d1d] overflow-hidden ${
        isPreview ? 'rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.45)]' : 'h-screen w-screen'
      }`}
      style={isPreview ? { width: 376, height: 48 } : undefined}
      onMouseEnter={() => { hoveredRef.current = true }}
      onMouseLeave={() => { hoveredRef.current = false }}
    >
      {/* Close — top-left corner, revealed on hover */}
      <button
        onClick={() => act('dismiss')}
        className="absolute left-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-neutral-800 border border-neutral-600 text-neutral-200 shadow-md hover:bg-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>

      <div className="flex-1 min-w-0 transition-[padding] group-hover:pl-6">
        <div className="text-sm font-semibold text-white leading-tight truncate">
          {payload?.title ?? 'Meeting detected'}
        </div>
        <div className="text-[13px] text-neutral-400 leading-tight truncate mt-0.5">
          {payload?.message ?? ''}
        </div>
      </div>
      <button
        onClick={() => act('take-notes')}
        className="flex h-8.5 shrink-0 items-center gap-1.5 rounded-lg bg-neutral-800/90 border border-neutral-700 pl-1.5 pr-2.5 hover:bg-neutral-700 transition-colors"
      >
        <span className="flex size-6 items-center justify-center">
          <img src={SAIL_ICON} alt="" className="size-4.5 invert" />
        </span>
        <span className="text-[13px] font-semibold text-white">记笔记</span>
      </button>

      {/* Time-left line: drains toward dismissal, frozen while hovered */}
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-white/25 transition-[width] duration-100 ease-linear"
        style={{ width: `${remainingFrac * 100}%` }}
      />
    </div>
  )

  if (!isPreview) return popup
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-200 via-indigo-200 to-rose-200 p-6">
      {popup}
    </div>
  )
}
