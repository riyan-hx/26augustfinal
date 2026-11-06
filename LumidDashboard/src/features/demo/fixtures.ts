// Demo data for previews and the public demo (VITE_DEMO_MODE / no Supabase).
// Times are relative to "now" so the demo never shows stale dates.
import type { AvailabilityRule, BookingSummary, PatientSummary, PracticeProfile, SessionType } from '../../types/domain'

const DAY = 86_400_000

/** Today (IST) at HH:MM, plus `days`. */
function at(days: number, hh: number, mm = 0): Date {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 3_600_000)
  const base = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), hh, mm) - 5.5 * 3_600_000
  return new Date(base + days * DAY)
}

export const demoProfile: PracticeProfile = {
  id: 'demo',
  slug: 'anitha',
  displayName: 'Dr. Anitha Raghavan',
  title: 'Psychologist',
  bio: 'Warm, evidence-based support for young adults navigating overwhelm, avoidance, and self-doubt. I help you start — not just plan. Sessions are held on Google Meet.',
  city: 'Bengaluru',
  languages: ['English', 'Malayalam', 'Hindi'],
  photoPath: null,
  published: true,
  termsAcceptedAt: new Date('2026-10-01T09:00:00+05:30'),
  timezone: 'Asia/Kolkata',
  cancellationCutoffHours: 24,
  minNoticeMinutes: 720,
  bookingWindowDays: 14,
}

export const demoSessionTypes: SessionType[] = [
  { id: '6f1c2a10-0000-4000-8000-000000000001', name: 'Individual Consultation', description: 'One-on-one support for overwhelm, avoidance, focus', durationMinutes: 50, pricePaise: 150000, bufferMinutes: 10, isActive: true },
  { id: '6f1c2a10-0000-4000-8000-000000000002', name: 'Follow-up Session', description: 'For returning patients', durationMinutes: 30, pricePaise: 120000, bufferMinutes: 10, isActive: true },
]

export const demoAvailability: AvailabilityRule[] = [1, 2, 3, 4, 5].map((weekday) => ({
  id: `av-${weekday}`, weekday, startTime: '10:00', endTime: '20:00',
}))

export const demoPatients: PatientSummary[] = [
  { id: '1', name: 'Divya Prasad', email: 'divya@email.com', phone: '+91 98765 43210', sessionsCompleted: 8, lastSessionAt: at(-2, 17), nextSessionAt: at(0, 17), focus: 'Work-related overwhelm', status: 'active', prepNote: 'Reported better sleep this week; still anxious about Friday’s performance review.' },
  { id: '2', name: 'Vikram Shetty', email: 'vikram@email.com', phone: '+91 98765 43211', sessionsCompleted: 0, lastSessionAt: null, nextSessionAt: at(0, 18, 30), focus: 'Initial consultation', status: 'new', prepNote: 'First session — intake flagged work stress and sleep disruption.' },
  { id: '3', name: 'Arjun Nair', email: 'arjun@email.com', phone: '+91 98765 43212', sessionsCompleted: 5, lastSessionAt: at(-6, 18), nextSessionAt: at(0, 20), focus: 'Performance anxiety', status: 'active', prepNote: 'Practised the grounding exercise twice; wants to review it before a big presentation.' },
  { id: '4', name: 'Sneha Kulkarni', email: 'sneha@email.com', phone: '+91 98765 43213', sessionsCompleted: 8, lastSessionAt: at(-25, 15), nextSessionAt: null, focus: 'Relationship patterns', status: 'lapsed' },
  { id: '5', name: 'Lakshmi Iyer', email: 'lakshmi@email.com', phone: '+91 98765 43214', sessionsCompleted: 12, lastSessionAt: at(-1, 11), nextSessionAt: at(1, 11), focus: 'Self-compassion', status: 'active' },
  { id: '6', name: 'Ritu Bansal', email: 'ritu@email.com', phone: '+91 98765 43215', sessionsCompleted: 4, lastSessionAt: at(-28, 16), nextSessionAt: null, focus: 'Academic avoidance', status: 'lapsed' },
  { id: '7', name: 'Rahul Sharma', email: 'rahul@email.com', phone: '+91 98765 43216', sessionsCompleted: 6, lastSessionAt: at(-7, 12), nextSessionAt: null, focus: 'Academic avoidance', status: 'active' },
  { id: '8', name: 'Meera Nair', email: 'meera@email.com', phone: '+91 98765 43217', sessionsCompleted: 3, lastSessionAt: at(-3, 10), nextSessionAt: null, focus: 'Work-related overwhelm', status: 'active' },
]

function booking(
  code: string, patientId: string, days: number, hh: number, mm: number,
  type: SessionType, status: BookingSummary['status'],
): BookingSummary {
  const patient = demoPatients.find((p) => p.id === patientId)!
  const startsAt = at(days, hh, mm)
  return {
    id: code, code, status, startsAt,
    endsAt: new Date(startsAt.getTime() + type.durationMinutes * 60_000),
    pricePaise: type.pricePaise, patientId, patientName: patient.name, patientEmail: patient.email, sessionTypeName: type.name,
    meetUrl: status === 'confirmed' ? 'https://meet.google.com/' : null,
    holdExpiresAt: status === 'pending_payment' ? new Date(Date.now() + 8 * 60_000) : null,
    paymentStatus: status === 'pending_payment' ? 'created' : status === 'cancelled' ? 'refunded' : 'captured',
  }
}

const [individual, followUp] = demoSessionTypes as [SessionType, SessionType]

export const demoBookings: BookingSummary[] = [
  booking('B-7K3Q9X', '1', 0, 17, 0, individual, 'confirmed'),
  booking('B-2M8RTA', '2', 0, 18, 30, individual, 'confirmed'),
  booking('B-9F4WZC', '3', 0, 20, 0, individual, 'pending_payment'),
  booking('B-5H6NPE', '5', 1, 11, 0, followUp, 'confirmed'),
  booking('B-3J7KDV', '4', 3, 15, 0, individual, 'pending_payment'),
  booking('B-8L2XQM', '5', -1, 11, 0, individual, 'completed'),
  booking('B-4P9GHT', '6', -2, 16, 0, individual, 'cancelled'),
  booking('B-6R3YSB', '7', -7, 12, 0, followUp, 'no_show'),
  // Some history, so long-standing patients read as returning (not new) in the charts.
  booking('B-H1DP02', '1', -2, 17, 0, followUp, 'completed'),
  booking('B-H1DP30', '1', -30, 17, 0, individual, 'completed'),
  booking('B-H1DP90', '1', -90, 17, 0, individual, 'completed'),
  booking('B-H3AN06', '3', -6, 18, 0, individual, 'completed'),
  booking('B-H3AN55', '3', -55, 18, 0, individual, 'completed'),
  booking('B-H4SK25', '4', -25, 15, 0, individual, 'completed'),
  booking('B-H4SK99', '4', -120, 15, 0, individual, 'completed'),
  booking('B-H5LI08', '5', -8, 11, 0, followUp, 'completed'),
  booking('B-H5LI40', '5', -40, 11, 0, followUp, 'completed'),
  booking('B-H5LI99', '5', -140, 11, 0, individual, 'completed'),
  booking('B-H6RB28', '6', -28, 16, 0, individual, 'completed'),
  booking('B-H6RB99', '6', -100, 16, 0, individual, 'completed'),
  booking('B-H7RS35', '7', -35, 12, 0, individual, 'completed'),
  booking('B-H8MN03', '8', -3, 10, 0, followUp, 'completed'),
  booking('B-H8MN45', '8', -45, 10, 0, individual, 'completed'),
]

/** Simulated latency so demo screens exercise their loading states. */
export function demoDelay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms))
}

// ---- Generated history: a practice that has been running for months ----
// Deterministic (seeded) so the demo looks the same on every load.
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FIRST = ['Aarav', 'Aditi', 'Akhil', 'Ananya', 'Anjali', 'Anoop', 'Arya', 'Ashwin', 'Bhavya', 'Chitra', 'Deepak', 'Devika', 'Farhan', 'Gayathri', 'Hari', 'Ishaan', 'Jishnu', 'Kavya', 'Keerthi', 'Kiran', 'Manu', 'Maya', 'Nandini', 'Neha', 'Nikhil', 'Pooja', 'Priya', 'Rohan', 'Sana', 'Sanjay', 'Shreya', 'Sidharth', 'Tara', 'Varun', 'Zoya', 'Abhay', 'Anagha', 'Fathima', 'Irfan', 'Jyothi']
const LAST = ['Menon', 'Pillai', 'Varma', 'Nambiar', 'George', 'Thomas', 'Joseph', 'Krishnan', 'Das', 'Reddy', 'Gupta', 'Mehta', 'Khan', 'Joshi', 'Rao', 'Mathew', 'Warrier', 'Kurup', 'Sebastian', 'Bose']
const FOCUS = ['Work-related overwhelm', 'Academic avoidance', 'Performance anxiety', 'Self-compassion', 'Relationship patterns', 'Procrastination', 'Burnout recovery', 'Sleep and stress', 'Social anxiety', 'Fear of failure', 'Low motivation']
const PREP = [
  'Tried the two-minute start rule; got going on 3 of 5 tasks.',
  'Avoided the difficult email again — wants to explore what is underneath.',
  'Sleep improved; still ruminating before deadlines.',
  'Felt less guilt this week after the self-compassion exercise.',
  'Missed two micro-commitments; mood low after a family call.',
  'Wants to review the grounding exercise before an interview.',
]

const GENERATED_PATIENTS = 72
const rand = rng(20261106)
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!

/** Weekday (0=Sun) of "today + days" in IST. */
const weekdayAt = (days: number) => at(days, 12).getUTCDay()
const taken = new Set<string>()
for (const b of demoBookings) {
  const d = Math.round((b.startsAt.getTime() - at(0, 0).getTime()) / DAY)
  const h = Math.floor(((b.startsAt.getUTCHours() * 60 + b.startsAt.getUTCMinutes() + 330) % 1440) / 60)
  taken.add(`${d}-${h}`); taken.add(`${d}-${h + 1}`)
}
function freeSlot(day: number, hour: number): { day: number; hour: number } {
  let d = day, h = hour
  for (let i = 0; i < 400; i++) {
    const wd = weekdayAt(d)
    if (wd !== 0 && wd !== 6 && !taken.has(`${d}-${h}`)) { taken.add(`${d}-${h}`); return { day: d, hour: h } }
    h += 1
    if (h > 19) { h = 10; d += 1 }
  }
  return { day, hour }
}

const usedNames = new Set(demoPatients.map((p) => p.name))
for (let i = 0; i < GENERATED_PATIENTS; i++) {
  let name = ''
  do { name = `${pick(FIRST)} ${pick(LAST)}` } while (usedNames.has(name))
  usedNames.add(name)
  const id = String(demoPatients.length + 1)
  const cadence = pick([7, 7, 14, 14, 21])
  const kind = rand()
  // 12% brand-new (upcoming first session), 18% lapsed, rest active.
  const startDay = kind < 0.12 ? 1 + Math.floor(rand() * 10) : -Math.floor(20 + rand() * 180)
  const lapsed = kind >= 0.12 && kind < 0.3
  const lastDay = lapsed ? -(30 + Math.floor(rand() * 60)) : -Math.floor(rand() * cadence)
  const hour = 10 + Math.floor(rand() * 9)
  const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@email.com`
  const patient: PatientSummary = {
    id, name, email, phone: `+91 9${String(Math.floor(100000000 + rand() * 899999999))}`,
    sessionsCompleted: 0, lastSessionAt: null, nextSessionAt: null,
    focus: kind < 0.12 ? 'Initial consultation' : pick(FOCUS),
    status: kind < 0.12 ? 'new' : lapsed ? 'lapsed' : 'active',
    prepNote: !lapsed && kind >= 0.12 && rand() < 0.5 ? pick(PREP) : null,
  }
  demoPatients.push(patient)
  const bookingsForPatient: BookingSummary[] = []
  let day = startDay, k = 0
  const ref = `${id}`.padStart(3, '0')
  if (kind < 0.12) {
    const s = freeSlot(day, hour)
    bookingsForPatient.push(booking(`B-G${ref}00`, id, s.day, s.hour, 0, individual, 'confirmed'))
  } else {
    while (day <= Math.min(lastDay, -1) && k < 30) {
      const s = freeSlot(day, hour)
      const r = rand()
      const status: BookingSummary['status'] = r < 0.06 ? 'cancelled' : r < 0.1 ? 'no_show' : 'completed'
      bookingsForPatient.push(booking(`B-G${ref}${String(k).padStart(2, '0')}`, id, s.day, s.hour, 0, k === 0 ? individual : rand() < 0.7 ? followUp : individual, status))
      day += cadence + Math.floor(rand() * 3) - 1
      k++
    }
    if (!lapsed) {
      for (let f = 0; f < 2; f++) {
        const s = freeSlot(Math.max(0, lastDay + cadence * (f + 1) + cadence) , hour)
        if (s.day > 21) break
        const status: BookingSummary['status'] = f === 0 && rand() < 0.15 ? 'pending_payment' : 'confirmed'
        bookingsForPatient.push(booking(`B-G${ref}F${f}`, id, s.day, s.hour, 0, followUp, status))
      }
    }
  }
  const done = bookingsForPatient.filter((b) => b.status === 'completed')
  const last = done[done.length - 1]
  const next = bookingsForPatient.filter((b) => b.startsAt.getTime() > Date.now() && b.status !== 'cancelled').sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0]
  patient.sessionsCompleted = done.length
  patient.lastSessionAt = last?.startsAt ?? null
  patient.nextSessionAt = next?.startsAt ?? null
  demoBookings.push(...bookingsForPatient)
}
