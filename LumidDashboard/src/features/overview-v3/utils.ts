import { localDateKey, localDayBounds } from '../../lib/dates'
import type { BookingSummary } from '../../types/domain'

export const DAY = 86_400_000
const TZ = 'Asia/Kolkata'

export const isPaid = (b: BookingSummary) => b.paymentStatus === 'captured' || b.paymentStatus === 'partially_refunded'
export const isLive = (b: BookingSummary) => b.status !== 'cancelled' && b.status !== 'expired'
export const durationMin = (b: BookingSummary) => Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000)
export const firstName = (name: string) => name.replace(/^Dr\.?\s+/i, '').split(' ')[0] ?? name

export const dayStart = (d: Date) => localDayBounds(d).start

/** First instant of the IST month `offset` months from `d`'s month. */
export function monthStart(d: Date, offset = 0): Date {
  const [y, m] = localDateKey(d).split('-').map(Number) as [number, number]
  const idx = y * 12 + (m - 1) + offset
  return new Date(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}-01T00:00:00+05:30`)
}

/** Monday 00:00 IST of `d`'s week. */
export function weekStart(d: Date): Date {
  const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d))
  return new Date(dayStart(d).getTime() - wd * DAY)
}

export const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...o }).format(d)

/** "Today", "Tomorrow" or "Fri, 29 Aug". */
export function dayLabel(d: Date, now: number): string {
  const days = Math.round((dayStart(d).getTime() - dayStart(new Date(now)).getTime()) / DAY)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Opens the user's mail app with a payment reminder for one or more bookings. */
export function reminderMailto(bookings: BookingSummary[], practice: string): string | null {
  const to = [...new Set(bookings.map((b) => b.patientEmail).filter(Boolean))] as string[]
  if (to.length === 0) return null
  const one = bookings.length === 1 ? bookings[0]! : null
  const body = one
    ? `Hi ${firstName(one.patientName)},\n\nA gentle reminder that the fee for your session on ${fmt(one.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} at ${fmt(one.startsAt, { hour: 'numeric', minute: '2-digit' })} is still pending.\n\nThank you,\n${practice}`
    : `Hi,\n\nA gentle reminder that the fee for your upcoming session is still pending.\n\nThank you,\n${practice}`
  const params = new URLSearchParams({ subject: 'Payment reminder for your session', body })
  const addr = one ? to.join(',') : ''
  if (!one) params.set('bcc', to.join(','))
  return `mailto:${addr}?${params.toString().replace(/\+/g, '%20')}`
}
