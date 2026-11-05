import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { localDayBounds } from '../../lib/dates'
import { cancelBooking, createBooking, listBookings, markOutcome, markPaid, rescheduleBooking, type BookingRange, type NewBookingInput, type PaymentMethod } from './api'

export const bookingKeys = {
  all: ['bookings'] as const,
  list: (range: BookingRange) =>
    ['bookings', range.from?.toISOString() ?? '', range.to?.toISOString() ?? '', range.patientId ?? '', range.status ?? ''] as const,
}

export const useBookings = (range: BookingRange = {}) =>
  useQuery({ queryKey: bookingKeys.list(range), queryFn: () => listBookings(range) })

/**
 * Bookings waiting to be marked paid — the one shared source for every
 * "awaiting payment" count (nav badge, Bookings callout, Earnings).
 * Lapsed holds come back from booking_list as 'expired', so they never count.
 */
export const useAwaitingPayments = () => useBookings({ status: 'pending_payment' })

/** Today's bookings in IST. Range is computed once per render day. */
export function useTodayBookings() {
  const { start, end } = localDayBounds(new Date())
  return useBookings({ from: start, to: end })
}

function useInvalidateCare() {
  const qc = useQueryClient()
  // Any booking change can move money (cancel refunds) and the monthly session counts.
  return () => Promise.all([bookingKeys.all, ['patients'], ['earnings'], ['overview']].map((queryKey) => qc.invalidateQueries({ queryKey })))
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

export function useMarkPaid() {
  const invalidate = useInvalidateCare()
  return useMutation({ mutationFn: ({ id, method }: { id: string; method: PaymentMethod }) => markPaid(id, method), onSettled: invalidate })
}

export function useCreateBooking() {
  const invalidate = useInvalidateCare()
  return useMutation({ mutationFn: (input: NewBookingInput) => createBooking(input), onSettled: invalidate })
}

export function useReschedule() {
  const invalidate = useInvalidateCare()
  return useMutation({ mutationFn: ({ id, startsAt }: { id: string; startsAt: Date }) => rescheduleBooking(id, startsAt), onSettled: invalidate })
}
