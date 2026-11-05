import { formatDay, formatTime, localDateKey } from './dates'

export function initials(name: string): string {
  const parts = name.replace(/^\s*(dr|mr|mrs|ms)\.?\s+/i, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

/** "Today, 5:00 PM", "Tomorrow, 10:00 AM", "Fri, 7 Nov · 3:00 PM" */
export function relativeDateTime(date: Date, now = new Date()): string {
  const day = localDateKey(date)
  const today = localDateKey(now)
  const tomorrow = localDateKey(new Date(now.getTime() + 86_400_000))
  const yesterday = localDateKey(new Date(now.getTime() - 86_400_000))
  if (day === today) return `Today, ${formatTime(date)}`
  if (day === tomorrow) return `Tomorrow, ${formatTime(date)}`
  if (day === yesterday) return `Yesterday, ${formatTime(date)}`
  return `${formatDay(date)} · ${formatTime(date)}`
}

/** Whole calendar days between two IST date keys (YYYY-MM-DD). */
function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) / 86_400_000
}

/** "2 days ago", "Yesterday", "Today" — for past dates, counted in IST calendar days. */
export function relativeDaysAgo(date: Date, now = new Date()): string {
  const days = dayNumber(localDateKey(now)) - dayNumber(localDateKey(date))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return formatDay(date)
}
