import { localDayBounds } from '../../lib/dates'
import type { BookingSummary } from '../../types/domain'

export const DAY = 86_400_000

export const isPaid = (b: BookingSummary) => b.paymentStatus === 'captured' || b.paymentStatus === 'partially_refunded'
export const durationMin = (b: BookingSummary) => Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000)
export const firstName = (name: string) => name.replace(/^Dr\.?\s+/i, '').split(' ')[0] ?? name
export const dayStart = (d: Date) => localDayBounds(d).start

const formatters = new Map<string, Intl.DateTimeFormat>()
/** IST date formatting with cached formatters. */
export function fmt(d: Date, o: Intl.DateTimeFormatOptions): string {
  const key = JSON.stringify(o)
  let f = formatters.get(key)
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...o })))
  return f.format(d)
}

/** "Today", "Tomorrow", "Yesterday" or "Fri, 29 Aug". */
export function dayLabel(d: Date, now: number): string {
  const days = Math.round((dayStart(d).getTime() - dayStart(new Date(now)).getTime()) / DAY)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })
}

export const mailto = (to: string, subject: string, body: string) =>
  `mailto:${to}?${new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20')}`

/** Mail-app link with a payment reminder, or null when there's no email on file. */
export function reminderMailto(b: BookingSummary, practice: string): string | null {
  if (!b.patientEmail) return null
  const when = `${fmt(b.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} at ${fmt(b.startsAt, { hour: 'numeric', minute: '2-digit' })}`
  return mailto(b.patientEmail, 'Payment reminder for your session',
    `Hi ${firstName(b.patientName)},\n\nA gentle reminder that the fee for your session on ${when} is still pending.\n\nThank you,\n${practice}`)
}

/** The message sent when offering a slot — a specific opened slot, or an invitation to pick a time. */
export function offerMessage(name: string, slot: string | null, link: string, practice: string): { subject: string; body: string } {
  const hi = `Hi ${firstName(name)},\n\n`
  const sign = practice ? `\n\n${practice}` : ''
  if (slot) {
    return { subject: 'A session slot opened up', body: `${hi}A slot has opened up: ${slot}.${link ? ` You can book it here: ${link}` : ' Reply to this message if you’d like it.'}${sign}` }
  }
  return {
    subject: 'A session time for you',
    body: `${hi}I have some time for a session now.${link ? ` You can pick a time that suits you here: ${link}` : ' Reply to this message and we’ll find a time that suits you.'}${sign}`,
  }
}
