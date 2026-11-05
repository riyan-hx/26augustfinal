/** Upcoming (and in-progress) sessions first, soonest first; then past ones, most recent first. */
export function sortForList<T extends { startsAt: Date; endsAt: Date }>(list: T[], now: number): T[] {
  const upcoming = list.filter((b) => b.endsAt.getTime() > now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  const past = list.filter((b) => b.endsAt.getTime() <= now).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
  return [...upcoming, ...past]
}
