import { isDemoMode } from '../../lib/env'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import { ApiError } from '../../lib/errors'
import { demoDelay, demoPatients } from '../demo/fixtures'

// ---------------------------------------------------------------------------
// Session notes: bodies are encrypted in the database and read one at a time.
// ---------------------------------------------------------------------------

export interface NoteMeta {
  id: string
  patientId: string
  bookingId: string | null
  focus: string
  nextSteps: string
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface NoteInput {
  patientId: string
  body: string
  focus: string
  nextSteps: string
  bookingId?: string | null
  noteId?: string
  expectedVersion?: number
}

interface NoteRow {
  id: string; patient_id: string; booking_id: string | null; focus: string; next_steps: string
  version: number; created_at: string; updated_at: string
}

const toNote = (r: NoteRow): NoteMeta => ({
  id: r.id, patientId: r.patient_id, bookingId: r.booking_id, focus: r.focus, nextSteps: r.next_steps,
  version: r.version, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
})

const demoNotes: (NoteMeta & { body: string })[] = []

/** Demo: the focus of a patient's latest note, like patient_overview.current_focus. */
export function demoLatestFocus(patientId: string): string | null {
  const latest = demoNotes.filter((n) => n.patientId === patientId && n.focus.trim()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
  return latest?.focus ?? null
}

export async function listNotes(patientId: string): Promise<NoteMeta[]> {
  if (isDemoMode) return demoDelay(demoNotes.filter((n) => n.patientId === patientId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  const rows = unwrap(await db().from('session_notes')
    .select('id, patient_id, booking_id, focus, next_steps, version, created_at, updated_at')
    .eq('patient_id', patientId).order('created_at', { ascending: false }).limit(100)) as NoteRow[]
  return rows.map(toNote)
}

export async function readNote(noteId: string): Promise<string> {
  if (isDemoMode) return demoDelay(demoNotes.find((n) => n.id === noteId)?.body ?? '')
  return unwrap(await db().rpc('read_note', { p_note_id: noteId })) as string
}

export async function saveNote(input: NoteInput): Promise<{ id: string; version: number }> {
  const fields: Record<string, string> = {}
  if (!input.body.trim()) fields.body = 'Write something before saving.'
  if (input.body.length > 20000) fields.body = 'Notes are limited to 20,000 characters.'
  if (input.focus.length > 300) fields.focus = 'Keep the focus under 300 characters.'
  if (input.nextSteps.length > 1000) fields.next_steps = 'Keep next steps under 1,000 characters.'
  if (Object.keys(fields).length) throw new ApiError('VALIDATION_FAILED', { fields })

  if (isDemoMode) {
    const existing = input.noteId ? demoNotes.find((n) => n.id === input.noteId) : undefined
    if (existing) {
      Object.assign(existing, { body: input.body, focus: input.focus, nextSteps: input.nextSteps, version: existing.version + 1, updatedAt: new Date() })
      return demoDelay({ id: existing.id, version: existing.version })
    }
    const note = { id: crypto.randomUUID(), patientId: input.patientId, bookingId: input.bookingId ?? null, body: input.body, focus: input.focus, nextSteps: input.nextSteps, version: 1, createdAt: new Date(), updatedAt: new Date() }
    demoNotes.push(note)
    return demoDelay({ id: note.id, version: 1 })
  }
  return unwrap(await db().rpc('save_note', {
    p_patient_id: input.patientId, p_body: input.body, p_focus: input.focus, p_next_steps: input.nextSteps,
    p_booking_id: input.bookingId ?? null, p_note_id: input.noteId ?? null, p_expected_version: input.expectedVersion ?? null,
  })) as { id: string; version: number }
}

// ---------------------------------------------------------------------------
// Follow-ups: reminders to reach a patient on a date. Until email delivery is
// connected they surface in the dashboard and are marked done by hand.
// ---------------------------------------------------------------------------

export type FollowUpStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled'

export interface FollowUp {
  id: string
  patientId: string
  patientName: string
  dueAt: Date
  message: string
  status: FollowUpStatus
  sentAt: Date | null
}

interface FollowUpRow {
  id: string; patient_id: string; due_at: string; message: string; status: FollowUpStatus; sent_at: string | null
  patients: { full_name: string } | null
}

const toFollowUp = (r: FollowUpRow): FollowUp => ({
  id: r.id, patientId: r.patient_id, patientName: r.patients?.full_name ?? 'Patient', dueAt: new Date(r.due_at),
  message: r.message, status: r.status, sentAt: r.sent_at ? new Date(r.sent_at) : null,
})

const demoFollowUps: FollowUp[] = [
  { id: 'fu-1', patientId: '1', patientName: 'Divya Prasad', dueAt: new Date(Date.now() - 3_600_000), message: 'Check in on the sleep routine before Friday’s review.', status: 'scheduled', sentAt: null },
  { id: 'fu-2', patientId: '3', patientName: 'Arjun Nair', dueAt: new Date(Date.now() + 2 * 86_400_000), message: 'Share the grounding exercise worksheet.', status: 'scheduled', sentAt: null },
]

export async function listFollowUps(patientId?: string): Promise<FollowUp[]> {
  if (isDemoMode) return demoDelay(demoFollowUps.filter((f) => !patientId || f.patientId === patientId).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()))
  let q = db().from('follow_ups').select('id, patient_id, due_at, message, status, sent_at, patients(full_name)')
  if (patientId) q = q.eq('patient_id', patientId)
  const rows = unwrap(await q.order('due_at', { ascending: true }).limit(200)) as unknown as FollowUpRow[]
  return rows.map(toFollowUp)
}

export interface FollowUpInput { patientId: string; dueAt: Date; message: string }

export async function createFollowUp(input: FollowUpInput): Promise<void> {
  const fields: Record<string, string> = {}
  if (!input.patientId) fields.patient = 'Choose a patient.'
  if (!input.message.trim()) fields.message = 'Add what to follow up on.'
  if (input.message.length > 1000) fields.message = 'Keep it under 1,000 characters.'
  if (Number.isNaN(input.dueAt.getTime())) fields.due_at = 'Choose a date.'
  if (Object.keys(fields).length) throw new ApiError('VALIDATION_FAILED', { fields })

  if (isDemoMode) {
    demoFollowUps.push({ id: crypto.randomUUID(), patientId: input.patientId, patientName: demoPatients.find((p) => p.id === input.patientId)?.name ?? 'Patient', dueAt: input.dueAt, message: input.message.trim(), status: 'scheduled', sentAt: null })
    return demoDelay(undefined)
  }
  const { data: auth } = await db().auth.getUser()
  unwrap(await db().from('follow_ups').insert({
    psychologist_id: auth.user?.id, patient_id: input.patientId, due_at: input.dueAt.toISOString(), message: input.message.trim(), channel: 'email',
  }))
}

/** Done = handled by the psychologist; cancelled = no longer needed. */
export async function setFollowUpStatus(id: string, status: 'sent' | 'cancelled' | 'scheduled'): Promise<void> {
  if (isDemoMode) {
    const f = demoFollowUps.find((x) => x.id === id)
    if (f) { f.status = status; f.sentAt = status === 'sent' ? new Date() : null }
    return demoDelay(undefined)
  }
  unwrap(await db().from('follow_ups').update({ status, sent_at: status === 'sent' ? new Date().toISOString() : null }).eq('id', id))
}
