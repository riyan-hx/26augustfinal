import { z } from 'zod'

/** Optional profile detail shown on the public booking page. */
export interface Qualification { title: string; place: string; year: string | null }
export interface ProfileDetails {
  specialties: string[]
  yearsExperience: number | null
  approach: string
  modalities: string[]
  audiences: string[]
  qualifications: Qualification[]
  rciNumber: string
  showRci: boolean
}

const text = (max: number) => z.string().trim().max(max)
const list = (itemMax: number, count: number, label: string) =>
  z.array(text(itemMax).min(1)).max(count, `Keep it to ${count} ${label} or fewer.`)

export const profileDetailsSchema = z.object({
  specialties: list(60, 12, 'areas'),
  years_experience: z.number({ invalid_type_error: 'Enter a number.' }).int('Enter whole years.').min(0, 'Enter 0 or more.').max(70, 'Enter 70 or less.').nullable(),
  approach: text(1500),
  modalities: list(40, 10, 'approaches'),
  audiences: list(60, 8, 'groups'),
  qualifications: z.array(z.object({
    title: text(120).min(1, 'Add the qualification.'),
    place: text(120),
    year: z.string().trim().regex(/^(19|20)\d{2}$/, 'Use a year like 2018.').nullable(),
  })).max(8, 'Keep it to 8 qualifications or fewer.'),
  rci_number: text(40).nullable(),
  show_rci: z.boolean(),
})
export type ProfileDetailsInput = z.infer<typeof profileDetailsSchema>

export const toDetailsInput = (d: ProfileDetails): ProfileDetailsInput => ({
  specialties: d.specialties, years_experience: d.yearsExperience, approach: d.approach, modalities: d.modalities,
  audiences: d.audiences, qualifications: d.qualifications, rci_number: d.rciNumber || null, show_rci: d.showRci,
})

/** Demo practice's details; edits in demo mode show up on the demo booking page. */
export const demoProfileDetails: ProfileDetails = {
  specialties: ['Anxiety & overwhelm', 'Avoidance & procrastination', 'Stress & burnout', 'Self-esteem', 'Relationships', 'Sleep'],
  yearsExperience: 8,
  approach: 'Our first session is about understanding what is going on and what you want to change. From there we work in small, practical steps you can try between sessions, and we review what helped. You set the pace; nothing is shared without your consent.',
  modalities: ['CBT', 'ACT', 'Mindfulness-based', 'Solution-focused'],
  audiences: ['Young adults (18–30)', 'Working professionals', 'Students'],
  qualifications: [
    { title: 'M.Phil in Clinical Psychology', place: 'Bengaluru', year: '2017' },
    { title: 'M.Sc in Psychology', place: 'Thiruvananthapuram', year: '2014' },
    { title: 'Certificate in Acceptance and Commitment Therapy', place: 'Online programme', year: '2021' },
  ],
  rciNumber: 'A12345',
  showRci: true,
}
