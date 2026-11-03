import { isDemoMode } from '../../lib/env'
import { functionsApi } from '../../lib/functions'
import { newIdempotencyKey } from '../../lib/api'
import { ApiError } from '../../lib/errors'
import { localDateKey } from '../../lib/dates'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import type { BookingRequest } from '../../lib/schemas'
import { demoAvailability, demoDelay, demoProfile, demoSessionTypes } from '../demo/fixtures'

export interface PublicSessionType { id: string; name: string; description: string; durationMinutes: number; pricePaise: number }
export interface PublicProfile {
  slug: string; displayName: string; title: string; bio: string; city: string; languages: string[]
  specialties: string[]; yearsExperience: number | null; timezone: string
  cancellationCutoffHours: number; bookingWindowDays: number; minNoticeMinutes: number; sessionTypes: PublicSessionType[]
}
export interface Hold {
  bookingId: string; code: string; startsAt: Date; endsAt: Date; holdExpiresAt: Date; manageToken: string
  payment: { keyId: string; orderId: string; amount: number; currency: string }
}
export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'expired' | 'completed' | 'no_show'
export interface PaymentProof { orderId: string; paymentId: string; signature: string }

interface ProfileJson {
  slug: string; display_name: string; title: string; bio: string; city: string; languages: string[]
  specialties?: string[]; years_experience?: number | null; timezone: string
  cancellation_cutoff_hours: number; booking_window_days: number; min_notice_minutes?: number
  session_types: { id: string; name: string; description: string; duration_minutes: number; price_paise: number }[]
}

const toProfile = (j: ProfileJson): PublicProfile => ({
  slug: j.slug, displayName: j.display_name, title: j.title, bio: j.bio, city: j.city, languages: j.languages,
  specialties: j.specialties ?? [], yearsExperience: j.years_experience ?? null, timezone: j.timezone,
  cancellationCutoffHours: j.cancellation_cutoff_hours, bookingWindowDays: j.booking_window_days, minNoticeMinutes: j.min_notice_minutes ?? 0,
  sessionTypes: j.session_types.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMinutes: s.duration_minutes, pricePaise: s.price_paise })),
})

const DEMO_SLUGS = new Set([demoProfile.slug, 'demo'])

export async function getPublicProfile(slug: string): Promise<PublicProfile> {
  if (isDemoMode) {
    if (!DEMO_SLUGS.has(slug)) throw new ApiError('NOT_FOUND')
    return demoDelay({
      slug: demoProfile.slug ?? 'demo', displayName: demoProfile.displayName, title: demoProfile.title, bio: demoProfile.bio,
      city: demoProfile.city, languages: demoProfile.languages, specialties: ['Anxiety & overwhelm', 'Avoidance & procrastination'],
      yearsExperience: 8, timezone: demoProfile.timezone, cancellationCutoffHours: demoProfile.cancellationCutoffHours,
      bookingWindowDays: demoProfile.bookingWindowDays, minNoticeMinutes: demoProfile.minNoticeMinutes,
      sessionTypes: demoSessionTypes.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMinutes: s.durationMinutes, pricePaise: s.pricePaise })),
    })
  }
  const json = unwrap(await db().rpc('public_profile', { p_slug: slug })) as ProfileJson | null
  if (!json) throw new ApiError('NOT_FOUND')
  return toProfile(json)
}

export async function getSlots(slug: string, sessionTypeId: string, from: Date, to: Date, timeZone: string): Promise<Date[]> {
  if (isDemoMode) {
    const out: Date[] = []
    const STEP = 1_800_000
    for (let t = Math.ceil(from.getTime() / STEP) * STEP; t <= to.getTime() + 86_400_000; t += STEP) {
      const d = new Date(t)
      const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
      const weekday = new Date(`${localDateKey(d, timeZone)}T12:00:00Z`).getUTCDay()
      const rule = demoAvailability.find((r) => r.weekday === weekday)
      if (rule && hhmm >= rule.startTime && hhmm < '19:00' && d.getTime() > Date.now() + 12 * 3_600_000) out.push(d)
    }
    return demoDelay(out.filter((d) => localDateKey(d, timeZone) <= localDateKey(to, timeZone)))
  }
  const rows = unwrap(
    await db().rpc('public_available_slots', { p_slug: slug, p_session_type_id: sessionTypeId, p_from: localDateKey(from, timeZone), p_to: localDateKey(to, timeZone) }),
  ) as { starts_at: string }[]
  return rows.map((r) => new Date(r.starts_at))
}

interface HoldJson {
  booking_id: string; code: string; starts_at: string; ends_at: string; hold_expires_at: string; manage_token: string
  payment: { key_id: string; order_id: string; amount: number; currency: string }
}

/** `idempotencyKey` must be reused for retries of the same attempt so a double-click never double-books. */
export async function createHold(input: BookingRequest, idempotencyKey: string): Promise<Hold> {
  if (isDemoMode) {
    await demoDelay(null, 500)
    return {
      bookingId: crypto.randomUUID(), code: `B-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      startsAt: new Date(input.starts_at), endsAt: new Date(new Date(input.starts_at).getTime() + 50 * 60_000),
      holdExpiresAt: new Date(Date.now() + 10 * 60_000), manageToken: 'demo',
      payment: { keyId: 'demo', orderId: 'order_demo', amount: 0, currency: 'INR' },
    }
  }
  const j = await functionsApi.post<HoldJson>('/public-bookings', input, { idempotencyKey })
  return {
    bookingId: j.booking_id, code: j.code, startsAt: new Date(j.starts_at), endsAt: new Date(j.ends_at),
    holdExpiresAt: new Date(j.hold_expires_at), manageToken: j.manage_token,
    payment: { keyId: j.payment.key_id, orderId: j.payment.order_id, amount: j.payment.amount, currency: j.payment.currency },
  }
}

export async function verifyPayment(proof: PaymentProof): Promise<'confirmed' | 'refund_pending'> {
  if (isDemoMode) return demoDelay('confirmed', 700)
  const r = await functionsApi.post<{ status: 'confirmed' | 'refund_pending' }>('/public-bookings/verify', {
    razorpay_order_id: proof.orderId, razorpay_payment_id: proof.paymentId, razorpay_signature: proof.signature,
  }, { idempotencyKey: newIdempotencyKey() })
  return r.status
}

export async function getBookingStatus(bookingId: string, manageToken: string): Promise<BookingStatus> {
  if (isDemoMode) return 'confirmed'
  const j = unwrap(await db().rpc('public_booking_status', { p_booking_id: bookingId, p_manage_token: manageToken })) as { status: BookingStatus }
  return j.status
}

export interface BookingRequestResult { bookingId: string; code: string; startsAt: Date; endsAt: Date; pricePaise: number }

/** Pay-at-session request: reserves the slot; the psychologist collects payment and marks it paid. */
export async function requestBooking(input: BookingRequest): Promise<BookingRequestResult> {
  if (isDemoMode) {
    await demoDelay(null, 500)
    const start = new Date(input.starts_at)
    return { bookingId: crypto.randomUUID(), code: `B-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, startsAt: start, endsAt: new Date(start.getTime() + 50 * 60_000), pricePaise: 0 }
  }
  const token = crypto.randomUUID() + crypto.randomUUID()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  const j = unwrap(await db().rpc('request_booking', {
    p_slug: input.slug, p_session_type_id: input.session_type_id, p_start: input.starts_at,
    p_full_name: input.full_name, p_email: input.email, p_phone: input.phone || null, p_note: input.note || null,
    p_manage_token_hash: hash,
  })) as { booking_id: string; code: string; starts_at: string; ends_at: string; price_paise: number }
  return { bookingId: j.booking_id, code: j.code, startsAt: new Date(j.starts_at), endsAt: new Date(j.ends_at), pricePaise: j.price_paise }
}
