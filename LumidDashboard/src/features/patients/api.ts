import { isDemoMode } from '../../lib/env'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import { ApiError } from '../../lib/errors'
import type { PatientSummary, PatientStatus } from '../../types/domain'
import { demoBookings, demoDelay, demoPatients } from '../demo/fixtures'
import { demoLatestFocus } from '../care/api'

// Demo: the fixture counts include sessions older than the demo bookings, so
// keep that offset and derive the rest from the bookings, like patient_overview.
const completedIn = (id: string) => demoBookings.filter((b) => b.patientId === id && b.status === 'completed')
const demoBaseline = new Map(demoPatients.map((p) => [p.id, Math.max(0, p.sessionsCompleted - completedIn(p.id).length)]))

function demoPatient(p: PatientSummary): PatientSummary {
  const now = Date.now()
  const done = completedIn(p.id)
  const sessionsCompleted = (demoBaseline.get(p.id) ?? 0) + done.length
  const lastBooked = done.reduce<Date | null>((m, b) => (!m || b.startsAt > m ? b.startsAt : m), null)
  const baselineLast = demoBaseline.get(p.id) ? p.lastSessionAt : null
  const lastSessionAt = lastBooked && (!baselineLast || lastBooked > baselineLast) ? lastBooked : baselineLast ?? lastBooked
  const nextSessionAt = demoBookings
    .filter((b) => b.patientId === p.id && (b.status === 'confirmed' || b.status === 'pending_payment') && b.startsAt.getTime() > now)
    .reduce<Date | null>((m, b) => (!m || b.startsAt < m ? b.startsAt : m), null)
  const status: PatientStatus = p.status === 'archived' ? 'archived'
    : sessionsCompleted === 0 ? 'new'
    : !nextSessionAt && lastSessionAt && lastSessionAt.getTime() < now - 21 * 86_400_000 ? 'lapsed'
    : 'active'
  return { ...p, sessionsCompleted, lastSessionAt, nextSessionAt, status, focus: demoLatestFocus(p.id) ?? p.focus }
}

interface PatientOverviewRow {
  id: string
  full_name: string
  email: string
  phone: string | null
  sessions_completed: number
  last_session_at: string | null
  next_session_at: string | null
  current_focus: string | null
  status: PatientStatus
}

const COLUMNS = 'id, full_name, email, phone, sessions_completed, last_session_at, next_session_at, current_focus, status'

function toPatient(row: PatientOverviewRow): PatientSummary {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    phone: row.phone,
    sessionsCompleted: row.sessions_completed,
    lastSessionAt: row.last_session_at ? new Date(row.last_session_at) : null,
    nextSessionAt: row.next_session_at ? new Date(row.next_session_at) : null,
    focus: row.current_focus,
    status: row.status,
  }
}

export async function listPatients(): Promise<PatientSummary[]> {
  if (isDemoMode) return demoDelay(demoPatients.map(demoPatient).sort((a, b) => a.name.localeCompare(b.name)))
  const rows = unwrap(
    await db().from('patient_overview').select(COLUMNS).is('archived_at', null).order('full_name'),
  ) as PatientOverviewRow[]
  return rows.map(toPatient)
}

export async function getPatient(id: string): Promise<PatientSummary> {
  if (isDemoMode) {
    const found = demoPatients.find((p) => p.id === id)
    if (!found) throw new ApiError('NOT_FOUND', { detail: 'Patient not found.' })
    return demoDelay(demoPatient(found))
  }
  const row = unwrap(await db().from('patient_overview').select(COLUMNS).eq('id', id).maybeSingle()) as PatientOverviewRow | null
  if (!row) throw new ApiError('NOT_FOUND', { detail: 'Patient not found.' })
  // Audit: every patient-record view is logged (BLUEPRINT §13).
  await db().rpc('log_patient_view', { p_patient_id: id })
  return toPatient(row)
}
