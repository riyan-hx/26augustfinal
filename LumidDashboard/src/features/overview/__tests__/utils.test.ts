import { describe, expect, it } from 'vitest'
import { dayLabel, firstName, offerMessage } from '../utils'

describe('offerMessage', () => {
  it('names the opened slot when there is one', () => {
    const m = offerMessage('Divya Prasad', 'Friday, 6 November at 5:00 PM', 'https://x.test/p/anitha', 'Dr. Anitha')
    expect(m.subject).toBe('A session slot opened up')
    expect(m.body).toContain('A slot has opened up: Friday, 6 November at 5:00 PM.')
    expect(m.body).toContain('https://x.test/p/anitha')
  })
  it('invites them to pick a time when no slot opened', () => {
    const m = offerMessage('Divya Prasad', null, 'https://x.test/p/anitha', 'Dr. Anitha')
    expect(m.body).not.toMatch(/opened up|a time that suits you\./)
    expect(m.body).toContain('pick a time that suits you here: https://x.test/p/anitha')
    expect(m.body.startsWith('Hi Divya,')).toBe(true)
  })
  it('asks for a reply when there is no live link', () => {
    expect(offerMessage('Divya', null, '', '').body).toContain('Reply to this message')
    expect(offerMessage('Divya', 'Friday at 5 PM', '', '').body).toContain('Reply to this message')
  })
})

describe('firstName', () => {
  it('drops the honorific', () => {
    expect(firstName('Dr. Anitha Raghavan')).toBe('Anitha')
    expect(firstName('Divya Prasad')).toBe('Divya')
  })
})

describe('dayLabel', () => {
  it('uses IST calendar days', () => {
    const now = new Date('2026-11-05T04:00:00Z').getTime() // 9:30 AM IST, Thu 5 Nov
    expect(dayLabel(new Date('2026-11-05T13:00:00Z'), now)).toBe('Today')
    expect(dayLabel(new Date('2026-11-05T19:00:00Z'), now)).toBe('Tomorrow') // 00:30 IST on 6 Nov
    expect(dayLabel(new Date('2026-11-04T10:00:00Z'), now)).toBe('Yesterday')
  })
})
