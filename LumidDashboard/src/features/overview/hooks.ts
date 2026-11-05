import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addToWaitlist, listWaitlist, setWaitlistStatus, type WaitlistStatus } from './api'

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
