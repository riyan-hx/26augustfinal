// View models used by screens. API modules map database rows into these;
// demo fixtures produce the same shapes, so screens don't know the source.

export type BookingStatus = 'pending_payment' | 'confirmed' | 'completed' | 'no_show' | 'cancelled' | 'expired'
export type PatientStatus = 'new' | 'active' | 'lapsed' | 'archived'

export interface PatientSummary {
  id: string
  name: string
  email: string
  phone: string | null
  sessionsCompleted: number
  lastSessionAt: Date | null
  nextSessionAt: Date | null
  focus: string | null
  status: PatientStatus
  /** Last note's key takeaway, shown before a session. */
  prepNote?: string | null
}

export interface BookingSummary {
  id: string
  code: string
  status: BookingStatus
  startsAt: Date
  endsAt: Date
  pricePaise: number
  patientId: string
  patientName: string
  patientEmail?: string | null
  sessionTypeName: string
  meetUrl: string | null
  holdExpiresAt: Date | null
  paymentStatus: string | null
}

export interface PracticeProfile {
  id: string
  slug: string | null
  displayName: string
  title: string
  bio: string
  city: string
  languages: string[]
  photoPath: string | null
  published: boolean
  timezone: string
  cancellationCutoffHours: number
  minNoticeMinutes: number
  bookingWindowDays: number
}

export interface SessionType {
  id: string
  name: string
  description: string
  durationMinutes: number
  pricePaise: number
  bufferMinutes: number
  isActive: boolean
}

export interface AvailabilityRule {
  id: string
  weekday: number
  startTime: string // HH:MM
  endTime: string
}

export interface SetupStatus {
  hasProfile: boolean
  hasSlug: boolean
  hasSessionTypes: boolean
  hasAvailability: boolean
  published: boolean
}
