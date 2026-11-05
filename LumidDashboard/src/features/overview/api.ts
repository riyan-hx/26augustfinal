import { isDemoMode } from '../../lib/env'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import { ApiError } from '../../lib/errors'
import { demoDelay } from '../demo/fixtures'

export type WaitlistStatus = 'waiting' | 'offered' | 'booked' | 'removed'
export interface WaitlistEntry { id: string; fullName: string; email: string | null; phone: string | null; preference: string | null; status: WaitlistStatus; createdAt: Date }
export interface WaitlistInput { fullName: string; email: string; phone: string; preference: string }

interface WaitlistRow { id: string; full_name: string; email: string | null; phone: string | null; preference: string | null; status: WaitlistStatus; created_at: string }
const toEntry = (r: WaitlistRow): WaitlistEntry => ({
  id: r.id, fullName: r.full_name, email: r.email, phone: r.phone, preference: r.preference, status: r.status, createdAt: new Date(r.created_at),
})

const demoWaitlist: WaitlistEntry[] = []

/** People waiting for a slot (oldest first), excluding booked or removed. */
export async function listWaitlist(): Promise<WaitlistEntry[]> {
  if (isDemoMode) return demoDelay(demoWaitlist.filter((w) => w.status === 'waiting' || w.status === 'offered'))
  const rows = unwrap(await db().from('waitlist_entries').select('id, full_name, email, phone, preference, status, created_at')
    .in('status', ['waiting', 'offered']).order('created_at', { ascending: true }).limit(50)) as WaitlistRow[]
  return rows.map(toEntry)
}

export async function addToWaitlist(input: WaitlistInput): Promise<void> {
  const fields: Record<string, string> = {}
  if (!input.fullName.trim()) fields.full_name = 'Add a name.'
  if (input.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) fields.email = 'Check the email.'
  if (input.phone.trim() && !/^\+?[0-9 ()-]{7,20}$/.test(input.phone.trim())) fields.phone = 'Check the phone number.'
  if (Object.keys(fields).length) throw new ApiError('VALIDATION_FAILED', { fields })
  const row = { full_name: input.fullName.trim(), email: input.email.trim() || null, phone: input.phone.trim() || null, preference: input.preference.trim() || null }
  if (isDemoMode) {
    demoWaitlist.push(toEntry({ ...row, id: crypto.randomUUID(), status: 'waiting', created_at: new Date().toISOString() }))
    return demoDelay(undefined)
  }
  unwrap(await db().from('waitlist_entries').insert(row))
}

export async function setWaitlistStatus(id: string, status: WaitlistStatus): Promise<void> {
  if (isDemoMode) {
    const w = demoWaitlist.find((x) => x.id === id)
    if (w) w.status = status
    return demoDelay(undefined)
  }
  unwrap(await db().from('waitlist_entries')
    .update({ status, ...(status === 'offered' ? { offered_at: new Date().toISOString() } : {}) }).eq('id', id))
}
