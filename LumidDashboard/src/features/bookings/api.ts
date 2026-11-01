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
  session_type_name: string
  meet_url: string | null
  hold_expires_at: string | null
  payment_status: string | null
}

const COLUMNS =
  'id, code, status, starts_at, ends_at, price_paise, patient_id, patient_name, session_type_name, meet_url, hold_expires_at, payment_status'

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
}

export async function listBookings(range: BookingRange = {}): Promise<BookingSummary[]> {
  if (isDemoMode) {
    return demoDelay(
      demoBookings
        .filter((b) => (!range.from || b.startsAt >= range.from) && (!range.to || b.startsAt < range.to))
        .filter((b) => !range.patientId || b.patientId === range.patientId)
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    )
  }
  let query = db().from('booking_list').select(COLUMNS)
  if (range.from) query = query.gte('starts_at', range.from.toISOString())
  if (range.to) query = query.lt('starts_at', range.to.toISOString())
  if (range.patientId) query = query.eq('patient_id', range.patientId)
  const rows = unwrap(await query.order('starts_at', { ascending: true }).limit(500)) as BookingListRow[]
  return rows.map(toBooking)
}

export async function cancelBooking(id: string, reason: string): Promise<void> {
  const parsed = cancelSchema.safeParse({ reason })
  if (!parsed.success) throw new ApiError('VALIDATION_FAILED', { detail: parsed.error.issues[0]?.message })
  if (isDemoMode) {
    const b = demoBookings.find((x) => x.id === id)
    if (b) b.status = 'cancelled'
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
    if (b) { b.status = 'confirmed'; b.paymentStatus = 'captured'; b.holdExpiresAt = null }
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
    let patientId: string, patientName: string
    if ('id' in input.patient) {
      patientId = input.patient.id; patientName = demoPatients.find((p) => p.id === patientId)?.name ?? 'Patient'
    } else {
      patientId = crypto.randomUUID(); patientName = input.patient.fullName.trim()
      demoPatients.push({ id: patientId, name: patientName, email: input.patient.email.trim(), phone: input.patient.phone || null, sessionsCompleted: 0, lastSessionAt: null, nextSessionAt: input.startsAt, focus: null, status: 'new' })
    }
    const id = crypto.randomUUID()
    demoBookings.push({
      id, code: `B-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: input.paid ? 'confirmed' : 'pending_payment',
      startsAt: input.startsAt, endsAt: new Date(input.startsAt.getTime() + st.durationMinutes * 60_000), pricePaise: st.pricePaise,
      patientId, patientName, sessionTypeName: st.name, meetUrl: null, holdExpiresAt: input.paid ? null : input.startsAt, paymentStatus: input.paid ? 'captured' : null,
    })
    return demoDelay(id)
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
