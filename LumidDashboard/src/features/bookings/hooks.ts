import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { localDayBounds } from '../../lib/dates'
import { cancelBooking, listBookings, markOutcome, type BookingRange } from './api'

export const bookingKeys = {
  all: ['bookings'] as const,
  list: (range: BookingRange) =>
    ['bookings', range.from?.toISOString() ?? '', range.to?.toISOString() ?? '', range.patientId ?? ''] as const,
}

export const useBookings = (range: BookingRange = {}) =>
  useQuery({ queryKey: bookingKeys.list(range), queryFn: () => listBookings(range) })

/** Today's bookings in IST. Range is computed once per render day. */
export function useTodayBookings() {
  const { start, end } = localDayBounds(new Date())
  return useBookings({ from: start, to: end })
}

function useInvalidateCare() {
  const qc = useQueryClient()
  return () => Promise.all([qc.invalidateQueries({ queryKey: bookingKeys.all }), qc.invalidateQueries({ queryKey: ['patients'] })])
}

export function useCancelBooking() {
  const invalidate = useInvalidateCare()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelBooking(id, reason),
    onSettled: invalidate,
  })
}

export function useMarkOutcome() {
  const invalidate = useInvalidateCare()
  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'completed' | 'no_show' }) => markOutcome(id, outcome),
    onSettled: invalidate,
  })
}
