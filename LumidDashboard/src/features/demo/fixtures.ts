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
