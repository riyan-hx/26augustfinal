import { isDemoMode } from '../../lib/env'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import { cancelSchema } from '../../lib/schemas'
import { ApiError } from '../../lib/errors'
import type { BookingStatus, BookingSummary } from '../../types/domain'
import { demoBookings, demoDelay } from '../demo/fixtures'

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
