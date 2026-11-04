import { isDemoMode } from '../../lib/env'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import { ApiError } from '../../lib/errors'
import type { PatientSummary, PatientStatus } from '../../types/domain'
import { demoDelay, demoPatients } from '../demo/fixtures'

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
  if (isDemoMode) return demoDelay(demoPatients)
  const rows = unwrap(
    await db().from('patient_overview').select(COLUMNS).is('archived_at', null).order('full_name'),
  ) as PatientOverviewRow[]
  return rows.map(toPatient)
}

export async function getPatient(id: string): Promise<PatientSummary> {
  if (isDemoMode) {
    const found = demoPatients.find((p) => p.id === id)
    if (!found) throw new ApiError('NOT_FOUND', { detail: 'Patient not found.' })
    return demoDelay(found)
  }
  const row = unwrap(await db().from('patient_overview').select(COLUMNS).eq('id', id).maybeSingle()) as PatientOverviewRow | null
  if (!row) throw new ApiError('NOT_FOUND', { detail: 'Patient not found.' })
  // Audit: every patient-record view is logged (BLUEPRINT §13).
  await db().rpc('log_patient_view', { p_patient_id: id })
  return toPatient(row)
}
