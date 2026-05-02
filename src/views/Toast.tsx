// Lightweight transient notification used after game reports.
// Lives at the top of the Game viewport, fades out after the configured
// duration. Per PLAN.md §6.3, this is the auto-advance recap:
// "April 22 → April 25 · 18 league games simmed".

import { useEffect } from 'react'

export interface ToastMessage {
  id: number
  text: string
  /** ms before auto-dismiss. Defaults to 2000 (~2s) per PLAN. */
  durationMs?: number
}

interface Props {
  message: ToastMessage | null
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: Props) {
  const duration = message?.durationMs ?? 2000

  useEffect(() => {
    if (!message) return
    const handle = setTimeout(onDismiss, duration)
    return () => clearTimeout(handle)
    // Re-arm whenever a new message id arrives.
  }, [message?.id, duration, onDismiss])

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="post-report-toast"
      className="pointer-events-none fixed inset-x-0 top-3 z-20 mx-auto flex max-w-sm items-center justify-center px-4"
    >
      <div className="pointer-events-auto rounded-full bg-slate-900/90 px-4 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur-sm dark:bg-slate-100/95 dark:text-slate-900">
        {message.text}
      </div>
    </div>
  )
}
