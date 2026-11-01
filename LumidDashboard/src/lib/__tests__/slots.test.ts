import { describe, expect, it } from 'vitest'
import { groupSlotsByDay } from '../slots'

describe('groupSlotsByDay', () => {
  it('groups by practice-local day, not UTC day', () => {
    // 19:00Z = 00:30 IST next day; 04:30Z = 10:00 IST
    const days = groupSlotsByDay(
      [new Date('2026-11-04T19:00:00Z'), new Date('2026-11-04T04:30:00Z'), new Date('2026-11-04T05:00:00Z')],
      'Asia/Kolkata',
    )
    expect(days.map((d) => d.key)).toEqual(['2026-11-04', '2026-11-05'])
    expect(days[0]?.slots.map((s) => s.startsAt.toISOString())).toEqual(['2026-11-04T04:30:00.000Z', '2026-11-04T05:00:00.000Z'])
  })

  it('returns an empty list when nothing is open', () => {
    expect(groupSlotsByDay([], 'Asia/Kolkata')).toEqual([])
  })
})
