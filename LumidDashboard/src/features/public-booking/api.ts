import { isDemoMode } from '../../lib/env'
import { functionsApi } from '../../lib/functions'
import { newIdempotencyKey } from '../../lib/api'
import { ApiError } from '../../lib/errors'
import { localDateKey } from '../../lib/dates'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import type { BookingRequest } from '../../lib/schemas'
import { demoAvailability, demoBookings, demoDelay, demoPatients, demoProfile, demoSessionTypes } from '../demo/fixtures'
import { assertDemoSlotFree } from '../bookings/api'
import { demoProfileDetails } from '../practice/details'

const hhmmToMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

export interface PublicSessionType { id: string; name: string; description: string; durationMinutes: number; pricePaise: number }
export interface PublicProfile {
  slug: string; displayName: string; title: string; bio: string; city: string; languages: string[]
  specialties: string[]; yearsExperience: number | null; timezone: string; photoPath: string | null
  cancellationCutoffHours: number; bookingWindowDays: number; minNoticeMinutes: number; sessionTypes: PublicSessionType[]
  /** Optional profile detail. Sections stay hidden until the psychologist fills them in. */
  approach: string; modalities: string[]; audiences: string[]; qualifications: PublicQualification[]
  sessionModes: ('online' | 'in_person')[]; registration: string | null
}
export interface PublicQualification { title: string; place: string; year: string | null }
export interface Hold {
  bookingId: string; code: string; startsAt: Date; endsAt: Date; holdExpiresAt: Date; manageToken: string
  payment: { keyId: string; orderId: string; amount: number; currency: string }
}
export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'expired' | 'completed' | 'no_show'
export interface PaymentProof { orderId: string; paymentId: string; signature: string }

interface ProfileJson {
  slug: string; display_name: string; title: string; bio: string; city: string; languages: string[]
  specialties?: string[]; years_experience?: number | null; timezone: string; photo_path?: string | null
  approach?: string | null; modalities?: string[] | null; audiences?: string[] | null
  qualifications?: { title: string; place?: string; year?: string | null }[] | null
  session_modes?: ('online' | 'in_person')[] | null; registration?: string | null
  cancellation_cutoff_hours: number; booking_window_days: number; min_notice_minutes?: number
  session_types: { id: string; name: string; description: string; duration_minutes: number; price_paise: number }[]
}

const toProfile = (j: ProfileJson): PublicProfile => ({
  slug: j.slug, displayName: j.display_name, title: j.title, bio: j.bio, city: j.city, languages: j.languages,
  specialties: j.specialties ?? [], yearsExperience: j.years_experience ?? null, timezone: j.timezone, photoPath: j.photo_path ?? null,
  cancellationCutoffHours: j.cancellation_cutoff_hours, bookingWindowDays: j.booking_window_days, minNoticeMinutes: j.min_notice_minutes ?? 0,
  sessionTypes: j.session_types.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMinutes: s.duration_minutes, pricePaise: s.price_paise })),
  approach: j.approach ?? '', modalities: j.modalities ?? [], audiences: j.audiences ?? [],
  qualifications: (j.qualifications ?? []).filter((q) => q?.title).map((q) => ({ title: q.title, place: q.place ?? '', year: q.year ?? null })),
  sessionModes: j.session_modes?.length ? j.session_modes : ['online'], registration: j.registration ?? null,
})

const DEMO_SLUGS = new Set([demoProfile.slug, 'demo'])

export async function getPublicProfile(slug: string): Promise<PublicProfile> {
  if (isDemoMode) {
    if (!DEMO_SLUGS.has(slug)) throw new ApiError('NOT_FOUND')
    return demoDelay({
      slug: demoProfile.slug ?? 'demo', displayName: demoProfile.displayName, photoPath: demoProfile.photoPath, title: demoProfile.title, bio: demoProfile.bio,
      city: demoProfile.city, languages: demoProfile.languages,
      specialties: demoProfileDetails.specialties, yearsExperience: demoProfileDetails.yearsExperience,
      approach: demoProfileDetails.approach, modalities: demoProfileDetails.modalities, audiences: demoProfileDetails.audiences,
      qualifications: demoProfileDetails.qualifications, sessionModes: ['online'],
      registration: demoProfileDetails.showRci && demoProfileDetails.rciNumber ? `RCI reg. ${demoProfileDetails.rciNumber}` : null,
      timezone: demoProfile.timezone, cancellationCutoffHours: demoProfile.cancellationCutoffHours,
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
    // Mirrors public_available_slots: weekly hours, session length, notice,
    // booking window, and no overlap with live bookings (plus buffer).
    const st = demoSessionTypes.find((t) => t.id === sessionTypeId && t.isActive)
    if (!st) throw new ApiError('NOT_FOUND', { detail: 'Session type not found.' })
    const MIN = 60_000
    const earliest = Date.now() + demoProfile.minNoticeMinutes * MIN
    const latest = Date.now() + demoProfile.bookingWindowDays * 86_400_000
    const lastDay = localDateKey(to, timeZone)
    const out: Date[] = []
    for (let day = localDateKey(from, timeZone); day <= lastDay; day = localDateKey(new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000), 'UTC')) {
      const weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
      const midnight = Date.parse(`${day}T00:00:00+05:30`) // demo practice is in IST
      for (const r of demoAvailability.filter((x) => x.weekday === weekday)) {
        for (let m = hhmmToMin(r.startTime); m <= hhmmToMin(r.endTime) - st.durationMinutes; m += 30) {
          const s = midnight + m * MIN
          if (s < earliest || s > latest) continue
          const end = s + (st.durationMinutes + st.bufferMinutes) * MIN
          const clash = demoBookings.some((b) => (b.status === 'confirmed' || b.status === 'pending_payment') &&
            b.startsAt.getTime() < end && s < b.endsAt.getTime() + st.bufferMinutes * MIN)
          if (!clash) out.push(new Date(s))
        }
      }
    }
    return demoDelay(out.sort((a, b) => a.getTime() - b.getTime()))
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

export interface BookingRequestResult { bookingId: string; code: string; startsAt: Date; endsAt: Date; pricePaise: number; manageToken: string }

/** Pay-at-session request: reserves the slot; the psychologist collects payment and marks it paid. */
export async function requestBooking(input: BookingRequest): Promise<BookingRequestResult> {
  if (isDemoMode) {
    // Like request_booking: upsert the patient by email and hold the slot as awaiting payment.
    await demoDelay(null, 500)
    const st = demoSessionTypes.find((t) => t.id === input.session_type_id && t.isActive)
    if (!st) throw new ApiError('NOT_FOUND', { detail: 'Session type not found.' })
    const start = new Date(input.starts_at)
    const end = new Date(start.getTime() + st.durationMinutes * 60_000)
    if (start.getTime() < Date.now() + demoProfile.minNoticeMinutes * 60_000) throw new ApiError('SLOT_UNAVAILABLE', { detail: 'That time can’t be booked.' })
    assertDemoSlotFree(start, end)
    const email = input.email.trim().toLowerCase()
    let patient = demoPatients.find((p) => p.email.toLowerCase() === email)
    if (patient) { patient.name = input.full_name.trim(); patient.phone = input.phone?.trim() || patient.phone }
    else {
      patient = { id: crypto.randomUUID(), name: input.full_name.trim(), email, phone: input.phone?.trim() || null, sessionsCompleted: 0, lastSessionAt: null, nextSessionAt: null, focus: null, status: 'new' }
      demoPatients.push(patient)
    }
    const booking = {
      id: crypto.randomUUID(), code: `B-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: 'pending_payment' as const,
      startsAt: start, endsAt: end, pricePaise: st.pricePaise, patientId: patient.id, patientName: patient.name, patientEmail: patient.email,
      sessionTypeName: st.name, meetUrl: null, holdExpiresAt: new Date(end.getTime() + 3 * 86_400_000), paymentStatus: null,
    }
    demoBookings.push(booking)
    return { bookingId: booking.id, code: booking.code, startsAt: start, endsAt: end, pricePaise: st.pricePaise, manageToken: 'demo' }
  }
  const token = crypto.randomUUID() + crypto.randomUUID()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  const j = unwrap(await db().rpc('request_booking', {
    p_slug: input.slug, p_session_type_id: input.session_type_id, p_start: input.starts_at,
    p_full_name: input.full_name, p_email: input.email, p_phone: input.phone || null, p_note: input.note || null,
    p_manage_token_hash: hash,
  })) as { booking_id: string; code: string; starts_at: string; ends_at: string; price_paise: number }
  return { bookingId: j.booking_id, code: j.code, startsAt: new Date(j.starts_at), endsAt: new Date(j.ends_at), pricePaise: j.price_paise, manageToken: token }
}

/** Private link a patient keeps to view, move or cancel their booking. The token stays in the URL fragment. */
export const manageUrl = (bookingId: string, token: string) => `${window.location.origin}/m/${bookingId}#${token}`

export interface ManagedBooking {
  bookingId: string; code: string; status: BookingStatus; startsAt: Date; endsAt: Date; pricePaise: number; meetUrl: string | null
  sessionTypeId: string; sessionTypeName: string; practiceName: string; practiceSlug: string; timezone: string
  cancellationCutoffHours: number; changesAllowedUntil: Date
}

interface ManagedJson {
  booking_id: string; code: string; status: BookingStatus; starts_at: string; ends_at: string; price_paise: number; meet_url: string | null
  session_type_id: string; session_type_name: string; practice_name: string; practice_slug: string; timezone: string
  cancellation_cutoff_hours: number; changes_allowed_until: string
}

const demoManaged = (): ManagedBooking => {
  const start = new Date(Date.now() + 3 * 86_400_000); start.setUTCHours(4, 30, 0, 0)
  return {
    bookingId: 'demo', code: 'B-DEMO01', status: 'confirmed', startsAt: start, endsAt: new Date(start.getTime() + 50 * 60_000), pricePaise: 150000, meetUrl: null,
    sessionTypeId: demoSessionTypes[0]!.id, sessionTypeName: demoSessionTypes[0]!.name, practiceName: demoProfile.displayName, practiceSlug: demoProfile.slug ?? 'demo',
    timezone: 'Asia/Kolkata', cancellationCutoffHours: 24, changesAllowedUntil: new Date(start.getTime() - 24 * 3_600_000),
  }
}

export async function getManagedBooking(bookingId: string, token: string): Promise<ManagedBooking> {
  if (isDemoMode) {
    // A booking requested on the demo page in this visit; otherwise a sample one.
    const b = demoBookings.find((x) => x.id === bookingId)
    if (!b) return demoDelay(demoManaged())
    const st = demoSessionTypes.find((t) => t.name === b.sessionTypeName) ?? demoSessionTypes[0]!
    return demoDelay({
      ...demoManaged(), bookingId: b.id, code: b.code, status: b.status, startsAt: b.startsAt, endsAt: b.endsAt, pricePaise: b.pricePaise,
      meetUrl: b.meetUrl, sessionTypeId: st.id, sessionTypeName: b.sessionTypeName,
      changesAllowedUntil: new Date(b.startsAt.getTime() - demoProfile.cancellationCutoffHours * 3_600_000),
    })
  }
  const j = unwrap(await db().rpc('public_manage_booking', { p_booking_id: bookingId, p_token: token })) as ManagedJson
  return {
    bookingId: j.booking_id, code: j.code, status: j.status, startsAt: new Date(j.starts_at), endsAt: new Date(j.ends_at), pricePaise: j.price_paise,
    meetUrl: j.meet_url, sessionTypeId: j.session_type_id, sessionTypeName: j.session_type_name, practiceName: j.practice_name,
    practiceSlug: j.practice_slug, timezone: j.timezone, cancellationCutoffHours: j.cancellation_cutoff_hours, changesAllowedUntil: new Date(j.changes_allowed_until),
  }
}

export async function patientCancel(bookingId: string, token: string, reason: string): Promise<void> {
  if (isDemoMode) {
    const b = demoBookings.find((x) => x.id === bookingId)
    if (b) { b.status = 'cancelled'; b.holdExpiresAt = null; if (b.paymentStatus === 'captured') b.paymentStatus = 'refunded' }
    return demoDelay(undefined)
  }
  unwrap(await db().rpc('public_cancel_booking', { p_booking_id: bookingId, p_token: token, p_reason: reason || null }))
}

export async function patientReschedule(bookingId: string, token: string, startsAt: Date): Promise<void> {
  if (isDemoMode) {
    const b = demoBookings.find((x) => x.id === bookingId)
    if (b) {
      const len = b.endsAt.getTime() - b.startsAt.getTime()
      assertDemoSlotFree(startsAt, new Date(startsAt.getTime() + len), b.id)
      b.startsAt = startsAt; b.endsAt = new Date(startsAt.getTime() + len)
    }
    return demoDelay(undefined)
  }
  unwrap(await db().rpc('public_reschedule_booking', { p_booking_id: bookingId, p_token: token, p_new_start: startsAt.toISOString() }))
}
