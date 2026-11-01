import { useQuery } from '@tanstack/react-query'
import { getPatient, listPatients } from './api'

export const patientKeys = {
  all: ['patients'] as const,
  detail: (id: string) => ['patients', id] as const,
}

export const usePatients = () => useQuery({ queryKey: patientKeys.all, queryFn: listPatients })

export const usePatient = (id: string) =>
  useQuery({ queryKey: patientKeys.detail(id), queryFn: () => getPatient(id), enabled: Boolean(id) })
