import { describe, expect, it } from 'vitest'
import { profileDetailsSchema } from '../details'
import { getProfileDetails, updateProfileDetails } from '../api'
import { getPublicProfile } from '../../public-booking/api'

const valid = {
  specialties: ['Anxiety'], years_experience: 5, approach: 'Small steps.', modalities: ['CBT'], audiences: ['Adults'],
  qualifications: [{ title: 'M.Phil', place: 'Kochi', year: '2018' }], rci_number: 'A1', show_rci: true,
}

describe('profileDetailsSchema', () => {
  it('accepts a complete profile', () => {
    expect(profileDetailsSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects a bad year and a missing qualification title', () => {
    const r = profileDetailsSchema.safeParse({ ...valid, qualifications: [{ title: '', place: '', year: '18' }] })
    expect(r.success).toBe(false)
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
    expect(paths).toEqual(expect.arrayContaining(['qualifications.0.title', 'qualifications.0.year']))
  })
  it('caps list sizes', () => {
    expect(profileDetailsSchema.safeParse({ ...valid, specialties: Array.from({ length: 13 }, (_, i) => `a${i}`) }).success).toBe(false)
    expect(profileDetailsSchema.safeParse({ ...valid, years_experience: 71 }).success).toBe(false)
  })
})

describe('profile details in demo mode', () => {
  it('saved details appear on the public page', async () => {
    await updateProfileDetails({ ...valid, specialties: ['Sleep'], show_rci: false })
    const details = await getProfileDetails()
    expect(details.specialties).toEqual(['Sleep'])
    const page = await getPublicProfile('demo')
    expect(page.specialties).toEqual(['Sleep'])
    expect(page.qualifications[0]?.title).toBe('M.Phil')
    expect(page.registration).toBeNull()
  })
})
