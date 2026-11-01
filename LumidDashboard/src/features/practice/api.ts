import { isDemoMode } from '../../lib/env'
import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'
import { ApiError } from '../../lib/errors'
import {
  availabilityRuleSchema, fieldErrors, profileSchema, sessionTypeSchema,
  type AvailabilityRuleInput, type ProfileInput, type SessionTypeInput,
} from '../../lib/schemas'
import type { AvailabilityRule, PracticeProfile, SessionType, SetupStatus } from '../../types/domain'
import { demoAvailability, demoDelay, demoProfile, demoSessionTypes } from '../demo/fixtures'

interface ProfileRow {
  id: string; slug: string | null; display_name: string; title: string; bio: string; city: string
  languages: string[]; photo_path: string | null; published: boolean; timezone: string
  cancellation_cutoff_hours: number; min_notice_minutes: number; booking_window_days: number
}
interface SessionTypeRow {
  id: string; name: string; description: string; duration_minutes: number; price_paise: number
  buffer_minutes: number; is_active: boolean
}
interface RuleRow { id: string; weekday: number; start_time: string; end_time: string }

const toProfile = (r: ProfileRow): PracticeProfile => ({
  id: r.id, slug: r.slug, displayName: r.display_name, title: r.title, bio: r.bio, city: r.city,
  languages: r.languages, photoPath: r.photo_path, published: r.published, timezone: r.timezone,
  cancellationCutoffHours: r.cancellation_cutoff_hours, minNoticeMinutes: r.min_notice_minutes,
  bookingWindowDays: r.booking_window_days,
})
const toSessionType = (r: SessionTypeRow): SessionType => ({
  id: r.id, name: r.name, description: r.description, durationMinutes: r.duration_minutes,
  pricePaise: r.price_paise, bufferMinutes: r.buffer_minutes, isActive: r.is_active,
})
const toRule = (r: RuleRow): AvailabilityRule => ({
  id: r.id, weekday: r.weekday, startTime: r.start_time.slice(0, 5), endTime: r.end_time.slice(0, 5),
})

function validate<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: import('zod').ZodError } }, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new ApiError('VALIDATION_FAILED', { fields: fieldErrors(parsed.error) })
  return parsed.data
}

export async function getProfile(): Promise<PracticeProfile> {
  if (isDemoMode) return demoDelay(demoProfile)
  const row = unwrap(
    await db().from('psychologists').select(
      'id, slug, display_name, title, bio, city, languages, photo_path, published, timezone, cancellation_cutoff_hours, min_notice_minutes, booking_window_days',
    ).single(),
  ) as ProfileRow
  return toProfile(row)
}

export async function updateProfile(input: ProfileInput): Promise<void> {
  const data = validate(profileSchema, input)
  if (isDemoMode) { Object.assign(demoProfile, { slug: data.slug, displayName: data.display_name, bio: data.bio, city: data.city, title: data.title, languages: data.languages }); return }
  const { data: auth } = await db().auth.getUser()
  const result = await db().from('psychologists').update(data).eq('id', auth.user?.id ?? '')
  if (result.error?.code === '23505') {
    throw new ApiError('VALIDATION_FAILED', { fields: { slug: 'This link is taken. Try another.' } })
  }
  unwrap(result)
}

export async function listSessionTypes(): Promise<SessionType[]> {
  if (isDemoMode) return demoDelay(demoSessionTypes)
  const rows = unwrap(
    await db().from('session_types').select('id, name, description, duration_minutes, price_paise, buffer_minutes, is_active')
      .is('archived_at', null).order('position').order('created_at'),
  ) as SessionTypeRow[]
  return rows.map(toSessionType)
}

export async function saveSessionType(input: SessionTypeInput & { id?: string }): Promise<void> {
  const data = validate(sessionTypeSchema, input)
  if (isDemoMode) {
    const existing = demoSessionTypes.find((s) => s.id === input.id)
    const mapped = { name: data.name, description: data.description, durationMinutes: data.duration_minutes, pricePaise: data.price_paise, bufferMinutes: data.buffer_minutes, isActive: data.is_active }
    if (existing) Object.assign(existing, mapped)
    else demoSessionTypes.push({ id: crypto.randomUUID(), ...mapped })
    return
  }
  if (input.id) {
    unwrap(await db().from('session_types').update(data).eq('id', input.id))
  } else {
    const { data: auth } = await db().auth.getUser()
    unwrap(await db().from('session_types').insert({ ...data, psychologist_id: auth.user?.id }))
  }
}

export async function archiveSessionType(id: string): Promise<void> {
  if (isDemoMode) {
    const i = demoSessionTypes.findIndex((s) => s.id === id)
    if (i >= 0) demoSessionTypes.splice(i, 1)
    return
  }
  unwrap(await db().from('session_types').update({ archived_at: new Date().toISOString(), is_active: false }).eq('id', id))
}

export async function listAvailability(): Promise<AvailabilityRule[]> {
  if (isDemoMode) return demoDelay(demoAvailability)
  const rows = unwrap(
    await db().from('availability_rules').select('id, weekday, start_time, end_time').order('weekday').order('start_time'),
  ) as RuleRow[]
  return rows.map(toRule)
}

/** Replaces the weekly hours in one go (delete + insert). */
export async function saveWeeklyHours(rules: AvailabilityRuleInput[]): Promise<void> {
  const valid = rules.map((r) => validate(availabilityRuleSchema, r))
  if (isDemoMode) {
    demoAvailability.splice(0, demoAvailability.length, ...valid.map((r, i) => ({ id: `av-${i}`, weekday: r.weekday, startTime: r.start_time, endTime: r.end_time })))
    return
  }
  const { data: auth } = await db().auth.getUser()
  const me = auth.user?.id ?? ''
  unwrap(await db().from('availability_rules').delete().eq('psychologist_id', me))
  if (valid.length) {
    unwrap(await db().from('availability_rules').insert(valid.map((r) => ({ ...r, psychologist_id: me }))))
  }
}

export async function setPublished(publish: boolean): Promise<void> {
  if (isDemoMode) { demoProfile.published = publish; return }
  unwrap(await db().rpc('publish_practice', { p_publish: publish }))
}

export function computeSetup(profile: PracticeProfile, types: SessionType[], rules: AvailabilityRule[]): SetupStatus {
  return {
    hasProfile: profile.displayName.trim().length > 1,
    hasSlug: Boolean(profile.slug),
    hasSessionTypes: types.some((t) => t.isActive),
    hasAvailability: rules.length > 0,
    published: profile.published,
  }
}
