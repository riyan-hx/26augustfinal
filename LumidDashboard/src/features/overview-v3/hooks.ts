import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addToWaitlist, listWaitlist, sessionsByMonth, setWaitlistStatus, type WaitlistStatus } from './api'

export const useSessionsByMonth = (from: Date, to: Date) =>
  useQuery({ queryKey: ['overview', 'sessions-by-month', from.toISOString(), to.toISOString()], queryFn: () => sessionsByMonth(from, to) })

const WAITLIST = ['waitlist'] as const
export const useWaitlist = () => useQuery({ queryKey: WAITLIST, queryFn: listWaitlist })

export function useAddToWaitlist() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: addToWaitlist, onSettled: () => qc.invalidateQueries({ queryKey: WAITLIST }) })
}

export function useSetWaitlistStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WaitlistStatus }) => setWaitlistStatus(id, status),
    onSettled: () => qc.invalidateQueries({ queryKey: WAITLIST }),
  })
}
