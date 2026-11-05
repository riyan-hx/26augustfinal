import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  archiveSessionType, computeSetup, getProfile, listAvailability, listSessionTypes,
  saveSessionType, saveWeeklyHours, setPublished, updateProfile,
} from './api'

export const practiceKeys = {
  profile: ['practice', 'profile'] as const,
  sessionTypes: ['practice', 'session-types'] as const,
  availability: ['practice', 'availability'] as const,
}

export const useProfile = () => useQuery({ queryKey: practiceKeys.profile, queryFn: getProfile })
export const useSessionTypes = () => useQuery({ queryKey: practiceKeys.sessionTypes, queryFn: listSessionTypes })
export const useAvailability = () => useQuery({ queryKey: practiceKeys.availability, queryFn: listAvailability })

/** Onboarding status, derived from the three setup queries. */
export function useSetupStatus() {
  const profile = useProfile()
  const types = useSessionTypes()
  const rules = useAvailability()
  const isLoading = profile.isLoading || types.isLoading || rules.isLoading
  const error = profile.error ?? types.error ?? rules.error
  const status = profile.data && types.data && rules.data ? computeSetup(profile.data, types.data, rules.data) : null
  const refetch = () => Promise.all([profile.refetch(), types.refetch(), rules.refetch()])
  return { status, isLoading, error, profile: profile.data, refetch }
}

function useSaver<TArgs, TResult = void>(fn: (args: TArgs) => Promise<TResult>, key: readonly unknown[]) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: key }) })
}

export const useUpdateProfile = () => useSaver(updateProfile, practiceKeys.profile)
export const useSaveSessionType = () => useSaver(saveSessionType, practiceKeys.sessionTypes)
export const useArchiveSessionType = () => useSaver(archiveSessionType, practiceKeys.sessionTypes)
export const useSaveWeeklyHours = () => useSaver(saveWeeklyHours, practiceKeys.availability)
export const usePublish = () => useSaver(setPublished, practiceKeys.profile)
