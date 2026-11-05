import { isDemoMode } from '../../lib/env'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import { cancelSchema } from '../../lib/schemas'
import { ApiError } from '../../lib/errors'
import type { BookingStatus, BookingSummary } from '../../types/domain'
import { demoBookings, demoDelay, demoPatients, demoSessionTypes } from '../demo/fixtures'

interface BookingListRow {
  id: string
  code: string
  status: BookingStatus
  starts_at: string
  ends_at: string
  price_paise: number
  patient_id: string
  patient_name: string
  patient_email: string | null
  session_type_name: string
  meet_url: string | null
  hold_expires_at: string | null
  payment_status: string | null
}

const COLUMNS =
  'id, code, status, starts_at, ends_at, price_paise, patient_id, patient_name, patient_email, session_type_name, meet_url, hold_expires_at, payment_status'

function toBooking(r: BookingListRow): BookingSummary {
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    startsAt: new Date(r.starts_at),
    endsAt: new Date(r.ends_at),
    pricePaise: r.price_paise,
    patientId: r.patient_id,
    patientName: r.patient_name,
    patientEmail: r.patient_email,
    sessionTypeName: r.session_type_name,
    meetUrl: r.meet_url,
    holdExpiresAt: r.hold_expires_at ? new Date(r.hold_expires_at) : null,
    paymentStatus: r.payment_status,
  }
}

export interface BookingRange {
  from?: Date
  to?: Date
  patientId?: string
  /** Server-side status filter, e.g. 'pending_payment' for payments to collect. */
  status?: BookingStatus
}

/** Most bookings returned by one list call. */
export const BOOKING_LIST_LIMIT = 500

/**
 * Bookings in `range`, oldest first. When more than the limit match, the
 * latest ones are kept (fetched newest first), so recent and upcoming
 * sessions are never the ones cut off.
 */
export async function listBookings(range: BookingRange = {}): Promise<BookingSummary[]> {
  if (isDemoMode) {
    return demoDelay(
      demoBookings
        .filter((b) => (!range.from || b.startsAt >= range.from) && (!range.to || b.startsAt < range.to))
        .filter((b) => !range.patientId || b.patientId === range.patientId)
        .filter((b) => !range.status || b.status === range.status)
        .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
        .slice(0, BOOKING_LIST_LIMIT)
        .reverse(),
    )
  }
  let query = db().from('booking_list').select(COLUMNS)
  if (range.from) query = query.gte('starts_at', range.from.toISOString())
  if (range.to) query = query.lt('starts_at', range.to.toISOString())
  if (range.patientId) query = query.eq('patient_id', range.patientId)
  if (range.status) query = query.eq('status', range.status)
  const rows = unwrap(await query.order('starts_at', { ascending: false }).limit(BOOKING_LIST_LIMIT)) as BookingListRow[]
  return rows.map(toBooking).reverse()
}

/** Demo stand-in for the database's no-overlap constraint on live bookings. */
export function assertDemoSlotFree(start: Date, end: Date, ignoreId?: string) {
  const clash = demoBookings.find((b) =>
    b.id !== ignoreId && (b.status === 'confirmed' || b.status === 'pending_payment') &&
    b.startsAt.getTime() < end.getTime() && start.getTime() < b.endsAt.getTime())
  if (clash) throw new ApiError('SLOT_UNAVAILABLE', { detail: `You already have a session at that time (${clash.patientName}).` })
}

/** Demo: how and when payments marked by hand were collected (live: the payments table). */
export const demoPaymentInfo = new Map<string, { method: PaymentMethod | 'offline'; capturedAt: Date }>(
  // Sample payments were collected at the session; pin that date so a later reschedule doesn't move the money.
  demoBookings.filter((b) => b.paymentStatus === 'captured' || b.paymentStatus === 'refunded').map((b) => [b.id, { method: 'upi', capturedAt: b.startsAt }]),
)

export async function cancelBooking(id: string, reason: string): Promise<void> {
  const parsed = cancelSchema.safeParse({ reason })
  if (!parsed.success) throw new ApiError('VALIDATION_FAILED', { detail: parsed.error.issues[0]?.message })
  if (isDemoMode) {
    const b = demoBookings.find((x) => x.id === id)
    // Like the offline-refund trigger: a collected payment is recorded as refunded.
    if (b) { b.status = 'cancelled'; b.holdExpiresAt = null; if (b.paymentStatus === 'captured') b.paymentStatus = 'refunded' }
    return demoDelay(undefined)
  }
  unwrap(await db().rpc('transition_booking', { p_booking_id: id, p_to: 'cancelled', p_reason: parsed.data.reason }))
}

export async function markOutcome(id: string, outcome: 'completed' | 'no_show'): Promise<void> {
  if (isDemoMode) {
    const b = demoBookings.find((x) => x.id === id)
    if (b) b.status = outcome
    return demoDelay(undefined)
  }
  unwrap(await db().rpc('transition_booking', { p_booking_id: id, p_to: outcome }))
}

export type PaymentMethod = 'upi' | 'cash' | 'bank_transfer' | 'card'

/** Records a payment collected outside Razorpay and confirms the booking. */
export async function markPaid(id: string, method: PaymentMethod): Promise<void> {
  if (isDemoMode) {
    const b = demoBookings.find((x) => x.id === id)
    if (b) { b.status = 'confirmed'; b.paymentStatus = 'captured'; b.holdExpiresAt = null; demoPaymentInfo.set(b.id, { method, capturedAt: new Date() }) }
    return demoDelay(undefined)
  }
  unwrap(await db().rpc('mark_booking_paid', { p_booking_id: id, p_method: method }))
}

export interface NewBookingInput {
  patient: { id: string } | { fullName: string; email: string; phone: string }
  sessionTypeId: string
  startsAt: Date
  paid: boolean
}

const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)

/** Books a session from the dashboard, creating the patient first when needed. */
export async function createBooking(input: NewBookingInput): Promise<string> {
  const fields: Record<string, string> = {}
  if (!('id' in input.patient)) {
    if (!input.patient.fullName.trim()) fields.full_name = 'Add the patient’s name.'
    if (!emailOk(input.patient.email.trim())) fields.email = 'Add a valid email.'
    if (input.patient.phone && !/^\+?[0-9 ()-]{7,20}$/.test(input.patient.phone.trim())) fields.phone = 'Check the phone number.'
  }
  if (!input.sessionTypeId) fields.session_type = 'Choose a session type.'
  if (Number.isNaN(input.startsAt.getTime())) fields.starts_at = 'Choose a date and time.'
  else if (input.startsAt.getTime() < Date.now()) fields.starts_at = 'Pick a time in the future.'
  if (Object.keys(fields).length) throw new ApiError('VALIDATION_FAILED', { fields })

  if (isDemoMode) {
    const st = demoSessionTypes.find((t) => t.id === input.sessionTypeId)!
    await demoDelay(undefined)
    assertDemoSlotFree(input.startsAt, new Date(input.startsAt.getTime() + st.durationMinutes * 60_000))
    let patientId: string, patientName: string, patientEmail: string
    const email = 'id' in input.patient ? '' : input.patient.email.trim().toLowerCase()
    // Like the live flow, a new patient with a known email reuses that record.
    const known = 'id' in input.patient
      ? demoPatients.find((p) => p.id === (input.patient as { id: string }).id)
      : demoPatients.find((p) => p.email.toLowerCase() === email)
    if (known) {
      patientId = known.id; patientName = known.name; patientEmail = known.email
    } else {
      const person = input.patient as { fullName: string; phone: string }
      patientId = crypto.randomUUID(); patientName = person.fullName.trim(); patientEmail = email
      demoPatients.push({ id: patientId, name: patientName, email, phone: person.phone.trim() || null, sessionsCompleted: 0, lastSessionAt: null, nextSessionAt: null, focus: null, status: 'new' })
    }
    const id = crypto.randomUUID()
    const endsAt = new Date(input.startsAt.getTime() + st.durationMinutes * 60_000)
    demoBookings.push({
      id, code: `B-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: input.paid ? 'confirmed' : 'pending_payment',
      startsAt: input.startsAt, endsAt, pricePaise: st.pricePaise,
      patientId, patientName, patientEmail, sessionTypeName: st.name, meetUrl: null,
      holdExpiresAt: input.paid ? null : new Date(endsAt.getTime() + 3 * 86_400_000), paymentStatus: input.paid ? 'captured' : null,
    })
    if (input.paid) demoPaymentInfo.set(id, { method: 'offline', capturedAt: new Date() })
    return id
  }

  let patientId: string
  if ('id' in input.patient) patientId = input.patient.id
  else {
    const email = input.patient.email.trim().toLowerCase()
    const { data: me } = await db().auth.getUser()
    const existing = unwrap(await db().from('patients').select('id').eq('email', email).limit(1)) as { id: string }[]
    patientId = existing[0]?.id ?? (unwrap(await db().from('patients').insert({
      psychologist_id: me.user?.id, full_name: input.patient.fullName.trim(), email, phone: input.patient.phone.trim() || null,
    }).select('id').single()) as { id: string }).id
  }
  return unwrap(await db().rpc('create_manual_booking', {
    p_patient_id: patientId, p_session_type_id: input.sessionTypeId, p_start: input.startsAt.toISOString(), p_paid_offline: input.paid,
  })) as string
}

/** Moves a confirmed session to a new time. The slot must be free. */
export async function rescheduleBooking(id: string, startsAt: Date): Promise<void> {
  if (Number.isNaN(startsAt.getTime())) throw new ApiError('VALIDATION_FAILED', { detail: 'Choose a date and time.' })
  if (startsAt.getTime() < Date.now()) throw new ApiError('VALIDATION_FAILED', { detail: 'Pick a time in the future.' })
  if (isDemoMode) {
    const b = demoBookings.find((x) => x.id === id)
    await demoDelay(undefined)
    if (b) {
      const len = b.endsAt.getTime() - b.startsAt.getTime()
      assertDemoSlotFree(startsAt, new Date(startsAt.getTime() + len), b.id)
      b.startsAt = startsAt; b.endsAt = new Date(startsAt.getTime() + len)
    }
    return
  }
  unwrap(await db().rpc('reschedule_booking', { p_booking_id: id, p_new_start: startsAt.toISOString() }))
}
