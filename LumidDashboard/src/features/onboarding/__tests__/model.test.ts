import { describe, expect, it } from 'vitest'
import {
  HOURS_PRESETS, STEPS, dayError, daysLabel, emptyWeek, firstIncomplete, initialMaxReached, presetActive, profileInput,
  resumeStep, sessionInput, sessionsFromServer, slugSuggestions, stepFor, togglePreset, weekFromRules, weekSummary, weekToRules,
} from '../model'

const status = (o: Partial<Record<'hasProfile' | 'hasSlug' | 'hasSessionTypes' | 'hasAvailability' | 'published', boolean>> = {}) => ({
  hasProfile: false, hasSlug: false, hasSessionTypes: false, hasAvailability: false, published: false, ...o,
})

describe('resumeStep', () => {
  it('starts new practices at welcome', () => expect(resumeStep(status())).toBe('welcome'))
  it('resumes at the first incomplete step', () => {
    expect(resumeStep(status({ hasProfile: true }))).toBe('link')
    expect(resumeStep(status({ hasProfile: true, hasSlug: true, hasSessionTypes: true }))).toBe('hours')
    expect(resumeStep(status({ hasProfile: true, hasSlug: true, hasSessionTypes: true, hasAvailability: true }))).toBe('review')
  })
  it('lets published practices review from the start', () =>
    expect(resumeStep(status({ hasProfile: true, hasSlug: true, hasSessionTypes: true, hasAvailability: true, published: true }))).toBe('welcome'))
})

describe('slugSuggestions', () => {
  it('drops honorifics and only returns valid slugs', () => {
    const s = slugSuggestions('Dr. Anjali Menon', 'Kochi')
    expect(s[0]).toBe('anjali-menon')
    expect(s).toContain('anjali-kochi')
    expect(s.every((x) => /^[a-z0-9-]{3,40}$/.test(x))).toBe(true)
  })
  it('returns nothing for names without latin letters', () => expect(slugSuggestions('അഞ്ജലി', '')).toEqual([]))
})

describe('sessions', () => {
  it('turns on two presets for a new practice', () => {
    const s = sessionsFromServer([])
    expect(s.filter((x) => x.isActive).map((x) => x.name)).toEqual(['Individual session', 'First consultation'])
  })
  it('skips presets already covered by saved types', () => {
    const s = sessionsFromServer([{ id: 'a', name: 'Individual Consultation', description: '', durationMinutes: 50, pricePaise: 150000, bufferMinutes: 10, isActive: true }])
    expect(s.map((x) => x.name)).toEqual(['Individual Consultation', 'First consultation', 'Follow-up'])
    expect(s[0]!.priceText).toBe('1500')
  })
  it('converts rupees to paise', () => {
    const [first] = sessionsFromServer([])
    expect(sessionInput({ ...first!, priceText: '1,500' }).price_paise).toBe(150000)
  })
})

describe('weekly hours', () => {
  it('toggles a preset on and off', () => {
    const p = HOURS_PRESETS[0]!
    const on = togglePreset(emptyWeek(), p)
    expect(presetActive(on, p)).toBe(true)
    expect(weekSummary(on)).toEqual({ days: 5, hours: 20 })
    expect(presetActive(togglePreset(on, p), p)).toBe(false)
  })
  it('combines mornings and evenings on the same day', () => {
    const w = togglePreset(togglePreset(emptyWeek(), HOURS_PRESETS[0]!), HOURS_PRESETS[2]!)
    expect(w[1]).toHaveLength(2)
    expect(weekToRules(w)).toHaveLength(10)
  })
  it('replaces hours a preset overlaps', () => {
    const w = weekFromRules([{ id: 'x', weekday: 1, startTime: '10:00', endTime: '20:00' }])
    expect(togglePreset(w, HOURS_PRESETS[2]!)[1]).toEqual([{ start: '17:00', end: '20:00' }])
  })
  it('flags overlaps and inverted ranges', () => {
    expect(dayError([{ start: '10:00', end: '09:00' }])).toBeTruthy()
    expect(dayError([{ start: '09:00', end: '12:00' }, { start: '11:00', end: '13:00' }])).toBeTruthy()
    expect(dayError([{ start: '09:00', end: '12:00' }, { start: '12:00', end: '13:00' }])).toBeNull()
  })
  it('round-trips rules', () => {
    const w = weekFromRules([{ id: 'x', weekday: 2, startTime: '10:00', endTime: '12:00' }])
    expect(weekToRules(w)).toEqual([{ weekday: 2, start_time: '10:00', end_time: '12:00' }])
  })
  it('labels day groups', () => {
    expect(daysLabel([1, 2, 3, 4, 5])).toBe('Mon–Fri')
    expect(daysLabel([6, 0])).toBe('Sat, Sun')
  })
})

describe('step access', () => {
  const all = { hasProfile: true, hasSlug: true, hasSessionTypes: true, hasAvailability: true }
  it('finds the first unsaved step', () => {
    expect(firstIncomplete(status())).toBe('about')
    expect(firstIncomplete(status({ hasProfile: true, hasSessionTypes: true }))).toBe('link')
    expect(firstIncomplete(status(all))).toBe('review')
  })
  it('lets a brand-new practice deep-link to About, but no further', () => {
    const max = initialMaxReached(status())
    expect(stepFor('about', max, 'welcome')).toBe('about')
    expect(stepFor('hours', max, 'welcome')).toBe('welcome')
  })
  it('opens any step up to the first unsaved one', () => {
    const s = status({ hasProfile: true })
    const max = initialMaxReached(s)
    expect(stepFor('about', max, resumeStep(s))).toBe('about')
    expect(stepFor('link', max, resumeStep(s))).toBe('link')
    expect(stepFor('sessions', max, resumeStep(s))).toBe('link')
  })
  it('opens every step once set up, published or not', () => {
    expect(initialMaxReached(status(all))).toBe(STEPS.length - 1)
    expect(initialMaxReached(status({ ...all, published: true }))).toBe(STEPS.length - 1)
  })
  it('ignores unknown or missing steps', () => {
    expect(stepFor('nope', 5, 'welcome')).toBe('welcome')
    expect(stepFor(null, 5, 'about')).toBe('about')
  })
})

describe('profileInput', () => {
  const about = { displayName: '  Dr. Anjali Menon ', title: '', city: 'Kochi', languages: ['English'], bio: ' Hi ' }
  it('never sends a slug unless one is chosen', () => {
    const input = profileInput(about)
    expect('slug' in input).toBe(false)
    expect(input).toMatchObject({ display_name: 'Dr. Anjali Menon', title: 'Psychologist', bio: 'Hi' })
  })
  it('includes the chosen slug', () => expect(profileInput(about, 'anjali').slug).toBe('anjali'))
})
