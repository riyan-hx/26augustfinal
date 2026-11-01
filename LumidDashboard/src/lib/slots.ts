import { formatDay, formatTime, localDateKey } from './dates'

export interface SlotDay {
  key: string // YYYY-MM-DD in the practice timezone
  label: string // "Wed, 4 Nov"
  slots: { startsAt: Date; label: string }[]
}

/** Groups sorted UTC slot times into days in the practice timezone. */
export function groupSlotsByDay(slots: Date[], timeZone: string): SlotDay[] {
  const days = new Map<string, SlotDay>()
  for (const startsAt of [...slots].sort((a, b) => a.getTime() - b.getTime())) {
    const key = localDateKey(startsAt, timeZone)
    let day = days.get(key)
    if (!day) {
      day = { key, label: formatDay(startsAt, timeZone), slots: [] }
      days.set(key, day)
    }
    day.slots.push({ startsAt, label: formatTime(startsAt, timeZone) })
  }
  return [...days.values()]
}
