import type { ReactNode } from 'react'
import { toApiError } from '../../lib/errors'
import { AlertTriangle } from '../../lib/icons'

/** Placeholder block sized like the content it stands in for. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded-[8px] bg-[var(--color-hairline)] animate-pulse ${className}`} />
}

/** N skeleton rows at a list's real row height, so nothing jumps when data arrives. */
export function SkeletonRows({ rows = 6, height = 'h-[64px]' }: { rows?: number; height?: string }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-[var(--hairline)]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${height} px-6 flex items-center gap-3`}>
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-[38%]" />
            <Skeleton className="h-2.5 w-[24%]" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** What will appear here and the one action that gets the person there. */
export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="py-12 px-6 flex flex-col items-center text-center gap-2">
      {icon && <div className="w-10 h-10 rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--badge-green-fg)] flex items-center justify-center mb-1">{icon}</div>}
      <p className="text-[16px] font-semibold text-[var(--ink)]">{title}</p>
      <p className="text-[13px] text-[var(--stone)] max-w-[360px] leading-relaxed">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/** Inline error for one card or list. Never blanks the page; keeps a retry. */
export function ErrorState({ error, onRetry, compact = false }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const apiError = toApiError(error)
  return (
    <div role="alert" className={`flex ${compact ? 'items-center' : 'flex-col items-center text-center py-10'} gap-3 px-6`}>
      <span className="w-9 h-9 rounded-full bg-[var(--badge-rose-bg)] text-[var(--badge-rose-fg)] flex items-center justify-center shrink-0">
        <AlertTriangle size={16} />
      </span>
      <div className={compact ? 'flex-1' : ''}>
        <p className="text-[13px] font-semibold text-[var(--ink)]">Couldn’t load this</p>
        <p className="text-[12px] text-[var(--stone)]">
          {apiError.userMessage}
          {apiError.requestId && <span className="ml-1 opacity-70">Ref {apiError.requestId}</span>}
        </p>
      </div>
      {onRetry && <button onClick={onRetry} className="btn-secondary">Retry</button>}
    </div>
  )
}

export function PrimaryButton({ children, loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...props} disabled={props.disabled || loading} aria-busy={loading || undefined} className={`btn-primary ${props.className ?? ''}`}>
      {loading ? <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : null}
      {children}
    </button>
  )
}
