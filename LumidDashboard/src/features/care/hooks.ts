import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFollowUp, listFollowUps, listNotes, readNote, saveNote, setFollowUpStatus, type FollowUpInput, type NoteInput } from './api'

export const careKeys = {
  notes: (patientId: string) => ['notes', patientId] as const,
  note: (id: string) => ['note', id] as const,
  followUps: (patientId?: string) => ['follow-ups', patientId ?? 'all'] as const,
}

export const useNotes = (patientId: string) => useQuery({ queryKey: careKeys.notes(patientId), queryFn: () => listNotes(patientId) })
/** Note bodies are decrypted on demand and never cached for long. */
export const useNoteBody = (id: string | null) =>
  useQuery({ queryKey: careKeys.note(id ?? ''), queryFn: () => readNote(id!), enabled: !!id, staleTime: 0, gcTime: 30_000 })

export function useSaveNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: NoteInput) => saveNote(input),
    onSettled: (_d, _e, v) => Promise.all([
      qc.invalidateQueries({ queryKey: careKeys.notes(v.patientId) }),
      qc.invalidateQueries({ queryKey: ['patients'] }), // current focus comes from the latest note
      v.noteId ? qc.invalidateQueries({ queryKey: careKeys.note(v.noteId) }) : null,
    ]),
  })
}

export const useFollowUps = (patientId?: string) => useQuery({ queryKey: careKeys.followUps(patientId), queryFn: () => listFollowUps(patientId) })

export function useCreateFollowUp() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (input: FollowUpInput) => createFollowUp(input), onSettled: () => qc.invalidateQueries({ queryKey: ['follow-ups'] }) })
}

export function useSetFollowUpStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'sent' | 'cancelled' | 'scheduled' }) => setFollowUpStatus(id, status),
    onSettled: () => qc.invalidateQueries({ queryKey: ['follow-ups'] }),
  })
}
