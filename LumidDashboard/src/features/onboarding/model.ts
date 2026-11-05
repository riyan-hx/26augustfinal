// Pure wizard model: step order, drafts, presets and the conversions between
// the wizard's drafts and the practice API's inputs. No React in here, so it
// stays easy to test.
import type { AvailabilityRuleInput, ProfileInput, SessionTypeInput } from '../../lib/schemas'
import { slugSchema } from '../../lib/schemas'
import { formatINR, parseRupeesToPaise } from '../../lib/money'
import type { AvailabilityRule, PracticeProfile, SessionType, SetupStatus } from '../../types/domain'

export const STEPS = ['welcome', 'profile', 'sessions', 'hours', 'agreement'] as const
export type StepId = (typeof STEPS)[number]

/** Labels for the progress indicator (Welcome isn't counted as a step). */
export const STEP_LABELS: Record<Exclude<StepId, 'welcome'>, string> = {
  profile: 'Profile & link', sessions: 'Sessions', hours: 'Weekly hours', agreement: 'Agreement',
}

export const isStepId = (v: string | null): v is StepId => !!v && (STEPS as readonly string[]).includes(v)

/**
 * Where to resume. A brand-new practice starts at Welcome; a half-finished one
 * at its first incomplete step; a finished one at Welcome so they can review.
 */
export function resumeStep(s: SetupStatus): StepId {
  // A name alone (filled in from Google at sign-up) doesn't count as started.
  const started = s.hasSlug || s.hasSessionTypes || s.hasAvailability
  if (!started || s.published) return 'welcome'
  return firstIncomplete(s)
}

/** The first step not yet saved (Agreement once everything else is). */
export function firstIncomplete(s: SetupStatus): Exclude<StepId, 'welcome'> {
  if (!s.hasProfile || !s.hasSlug) return 'profile'
  if (!s.hasSessionTypes) return 'sessions'
  if (!s.hasAvailability) return 'hours'
  return 'agreement'
}

/**
 * The furthest step someone may open directly (e.g. from a dashboard deep
 * link): any step up to the first unsaved one, or all of them once set up.
 */
export function initialMaxReached(s: SetupStatus): number {
  return Math.max(STEPS.indexOf(resumeStep(s)), STEPS.indexOf(firstIncomplete(s)))
}

/** Which step to show for a `?step=` request, given how far they may go. */
export function stepFor(requested: string | null, maxReached: number, fallback: StepId): StepId {
  return isStepId(requested) && STEPS.indexOf(requested) <= maxReached ? requested : fallback
}

// ---------- About you ----------

export const TITLE_SUGGESTIONS = [
  'Clinical Psychologist', 'Counselling Psychologist', 'Psychotherapist', 'RCI-licensed Psychologist', 'Child Psychologist',
]
export const CITY_SUGGESTIONS = ['Kozhikode', 'Kochi', 'Thiruvananthapuram', 'Thrissur', 'Kannur', 'Bengaluru', 'Online only']
export const LANGUAGE_SUGGESTIONS = ['Malayalam', 'English', 'Hindi', 'Tamil', 'Arabic', 'Kannada']
export const BIO_SOFT_LIMIT = 400
export const BIO_MAX = 2000
export const BIO_EXAMPLE =
  'I work with young adults and professionals who feel stuck — with overwhelm, avoidance, or self-doubt. ' +
  'Sessions are calm, practical and paced to you. I see clients in Malayalam and English, online and in person.'

export interface AboutDraft { displayName: string; title: string; city: string; languages: string[]; bio: string; photoPath: string | null }

export const aboutFromProfile = (p: PracticeProfile): AboutDraft => ({
  displayName: p.displayName, title: p.title,
  city: p.city, languages: [...p.languages], bio: p.bio, photoPath: p.photoPath,
})

/**
 * Profile save input. Without `slug` the booking link is left untouched — the
 * About step never claims a link; only the Link step does, once they chose it.
 */
export function profileInput(a: AboutDraft, slug?: string): ProfileInput {
  return {
    display_name: a.displayName.trim(), title: a.title.trim() || 'Psychologist', bio: a.bio.trim(),
    city: a.city.trim(), languages: a.languages, photo_path: a.photoPath, ...(slug ? { slug } : {}),
  }
}

export function validateAbout(a: AboutDraft): Record<string, string> {
  const e: Record<string, string> = {}
  if (a.displayName.trim().length < 2) e.display_name = 'Add your name as patients should see it.'
  if (a.languages.length > 10) e.languages = 'Pick up to 10 languages.'
  return e
}

// ---------- Link ----------

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '')

const nameWords = (name: string) =>
  name.replace(/^(dr|mr|ms|mrs)\.?\s+/i, '').trim().split(/\s+/).filter(Boolean)

/** A few valid link ideas from the name and city. */
export function slugSuggestions(name: string, city: string): string[] {
  const words = nameWords(name).map(slugify).filter(Boolean)
  const first = words[0] ?? ''
  const full = words.join('-')
  const cityPart = slugify(city.replace(/online only/i, ''))
  const ideas = [full, first, first && `dr-${first}`, first && cityPart && `${first}-${cityPart}`, full && `${full}-psychologist`]
  return [...new Set(ideas.filter((s): s is string => !!s && slugSchema.safeParse(s).success))].slice(0, 4)
}

export const suggestSlug = (name: string, city = '') => slugSuggestions(name, city)[0] ?? ''

/** Format check only — availability is confirmed by the server on save. */
export function checkSlug(raw: string): { ok: true; slug: string } | { ok: false; message: string } {
  const r = slugSchema.safeParse(raw)
  return r.success ? { ok: true, slug: r.data } : { ok: false, message: r.error.issues[0]?.message ?? 'Check the link.' }
}

/** Keeps what people type link-shaped as they type it. */
export const cleanSlugInput = (v: string) => v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)

// ---------- Sessions ----------

export interface SessionDraft {
  key: string
  id?: string
  name: string
  description: string
  durationMinutes: number
  priceText: string
  bufferMinutes: number
  isActive: boolean
}

export const DURATION_CHOICES = [30, 45, 50, 60, 90]

const PRESETS: Omit<SessionDraft, 'key' | 'isActive'>[] = [
  { name: 'Individual session', description: 'One-on-one session', durationMinutes: 50, priceText: '1500', bufferMinutes: 10 },
  { name: 'First consultation', description: 'A first conversation to understand what you need', durationMinutes: 60, priceText: '2000', bufferMinutes: 10 },
  { name: 'Follow-up', description: 'For returning clients', durationMinutes: 30, priceText: '1000', bufferMinutes: 10 },
]

const rupeesText = (paise: number) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2))
const norm = (s: string) => s.trim().toLowerCase()
const firstWord = (s: string) => norm(s).split(/\s+/)[0] ?? ''

/**
 * Existing session types first (as saved), then any presets they don't
 * already have. With nothing saved yet, the first two presets start on.
 */
export function sessionsFromServer(types: SessionType[], keep: SessionDraft[] = []): SessionDraft[] {
  const saved: SessionDraft[] = types.map((t) => ({
    key: t.id, id: t.id, name: t.name, description: t.description, durationMinutes: t.durationMinutes,
    priceText: rupeesText(t.pricePaise), bufferMinutes: t.bufferMinutes, isActive: t.isActive,
  }))
  const names = new Set(saved.map((s) => norm(s.name)))
  const firstWords = new Set(saved.map((s) => firstWord(s.name)))
  // Unsaved drafts the person already touched (e.g. presets left off) stay as they were.
  const carried = keep.filter((d) => !d.id && !names.has(norm(d.name)))
  if (carried.length) return [...saved, ...carried]
  // "Individual Consultation" already covers the "Individual session" preset.
  const fresh = PRESETS.filter((p) => !firstWords.has(firstWord(p.name)))
    .map((p, i) => ({ ...p, key: `preset-${i}`, isActive: types.length === 0 && i < 2 }))
  return [...saved, ...fresh]
}

export function validateSession(s: SessionDraft): Record<string, string> {
  if (!s.isActive && !s.id) return {}
  const e: Record<string, string> = {}
  if (!s.name.trim()) e.name = 'Name this session.'
  if (!Number.isInteger(s.durationMinutes) || s.durationMinutes < 15 || s.durationMinutes > 240) e.duration = 'Between 15 and 240 minutes.'
  const p = parseRupeesToPaise(s.priceText)
  if (p === null || p > 10_000_000) e.price = 'Enter a fee in rupees, e.g. 1500.'
  return e
}

export const sessionInput = (s: SessionDraft): SessionTypeInput & { id?: string } => ({
  ...(s.id ? { id: s.id } : {}),
  name: s.name.trim(), description: s.description, duration_minutes: s.durationMinutes,
  price_paise: parseRupeesToPaise(s.priceText) ?? 0, buffer_minutes: s.bufferMinutes, is_active: s.isActive,
})

export function priceLabel(text: string): string {
  const p = parseRupeesToPaise(text)
  return p === null ? '₹—' : p === 0 ? 'Free' : formatINR(p)
}

// ---------- Weekly hours ----------

export interface Range { start: string; end: string }
/** Index = weekday (0 = Sunday, matching the API). */
export type Week = Range[][]

/** Display order: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface HoursPreset { id: string; label: string; hint: string; days: number[]; range: Range }
export const HOURS_PRESETS: HoursPreset[] = [
  { id: 'mornings', label: 'Weekday mornings', hint: 'Mon–Fri · 9 AM – 1 PM', days: [1, 2, 3, 4, 5], range: { start: '09:00', end: '13:00' } },
  { id: 'afternoons', label: 'Weekday afternoons', hint: 'Mon–Fri · 2 PM – 5 PM', days: [1, 2, 3, 4, 5], range: { start: '14:00', end: '17:00' } },
  { id: 'evenings', label: 'Weekday evenings', hint: 'Mon–Fri · 5 PM – 8 PM', days: [1, 2, 3, 4, 5], range: { start: '17:00', end: '20:00' } },
  { id: 'weekends', label: 'Weekends', hint: 'Sat–Sun · 10 AM – 2 PM', days: [6, 0], range: { start: '10:00', end: '14:00' } },
]

export const emptyWeek = (): Week => Array.from({ length: 7 }, () => [])

export function weekFromRules(rules: AvailabilityRule[]): Week {
  const w = emptyWeek()
  for (const r of rules) w[r.weekday]?.push({ start: r.startTime, end: r.endTime })
  return w.map(sortRanges)
}

const sortRanges = (rs: Range[]) => [...rs].sort((a, b) => a.start.localeCompare(b.start))
const same = (a: Range, b: Range) => a.start === b.start && a.end === b.end

export const presetActive = (w: Week, p: HoursPreset) => p.days.every((d) => w[d]?.some((r) => same(r, p.range)))

/** Turns a preset on (replacing hours it overlaps on its days) or off. */
export function togglePreset(w: Week, p: HoursPreset): Week {
  const on = presetActive(w, p)
  return w.map((ranges, day) => {
    if (!p.days.includes(day)) return ranges
    if (on) return ranges.filter((r) => !same(r, p.range))
    // Anything it overlaps gives way, so a click always visibly does what the card says.
    const kept = ranges.filter((r) => !(r.start < p.range.end && p.range.start < r.end))
    return sortRanges([...kept, p.range])
  })
}

/** Per-day error, if any (end before start, or overlapping ranges). */
export function dayError(ranges: Range[]): string | null {
  for (const r of ranges) if (r.end <= r.start) return 'End time must be after the start.'
  const s = sortRanges(ranges)
  for (let i = 1; i < s.length; i++) if (s[i]!.start < s[i - 1]!.end) return 'These times overlap.'
  return null
}

export const weekToRules = (w: Week): AvailabilityRuleInput[] =>
  w.flatMap((ranges, weekday) => ranges.map((r) => ({ weekday, start_time: r.start, end_time: r.end })))

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

export function weekSummary(w: Week): { days: number; hours: number } {
  const days = w.filter((r) => r.length > 0).length
  const mins = w.flat().reduce((t, r) => t + Math.max(0, minutes(r.end) - minutes(r.start)), 0)
  return { days, hours: Math.round((mins / 60) * 10) / 10 }
}

/** 9:00 AM style. */
export function timeLabel(t: string): string {
  const h = Number(t.slice(0, 2))
  const m = t.slice(3, 5)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m} ${h < 12 ? 'AM' : 'PM'}`
}

/** Half-hour choices from 6 AM to 11:30 PM, plus any saved odd time. */
export function timeOptions(extra?: string): string[] {
  const out: string[] = []
  for (let m = 6 * 60; m <= 23 * 60 + 30; m += 30) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 === 0 ? '00' : '30'}`)
  if (extra && !out.includes(extra)) out.push(extra)
  return out.sort()
}

/** Next sensible range for a day that already has some (after the last one ends). */
export function nextRange(ranges: Range[]): Range {
  const last = sortRanges(ranges).at(-1)
  if (!last) return { start: '10:00', end: '17:00' }
  const start = Math.min(minutes(last.end) + 60, 22 * 60)
  const end = Math.min(start + 120, 23 * 60 + 30)
  const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return { start: f(start), end: f(end) }
}

/** "Mon–Fri", "Mon, Wed, Sat" — for summaries. */
export function daysLabel(days: number[]): string {
  const order = WEEK_ORDER.filter((d) => days.includes(d))
  if (order.length === 0) return 'No days'
  if (order.length === 7) return 'Every day'
  const idx = order.map((d) => WEEK_ORDER.indexOf(d))
  const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1]! + 1)
  if (consecutive && order.length > 2) return `${DAY_SHORT[order[0]!]}–${DAY_SHORT[order.at(-1)!]}`
  return order.map((d) => DAY_SHORT[d]).join(', ')
}

// ---------- Agreement ----------

/** Bump when the wording of the terms changes. */
export const TERMS_VERSION = '2026-11'

export const AGREEMENTS = [
  { id: 'qualified', text: 'I’m a qualified mental health professional, and the details I’ve shared are accurate.' },
  { id: 'confidential', text: 'I’ll keep my patients’ information confidential and use Lumid only for my own practice.' },
  { id: 'terms', text: 'I agree to Lumid’s Terms of Service and Privacy Policy.' },
] as const
export type AgreementId = (typeof AGREEMENTS)[number]['id']
export const allAgreed = (checked: ReadonlySet<string>) => AGREEMENTS.every((a) => checked.has(a.id))
