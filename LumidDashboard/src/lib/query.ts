import { QueryCache, QueryClient } from '@tanstack/react-query'
import { toApiError } from './errors'

/** Retries only transient failures (network / 5xx), twice, with backoff. */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (toApiError(error).code === 'UNAUTHENTICATED') window.dispatchEvent(new Event('lumid:signed-out'))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => count < 2 && toApiError(error).retryable,
      retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 4_000),
    },
    mutations: { retry: false },
  },
})

/** Unwraps a supabase-js result, throwing an ApiError on failure. */
export function unwrap<T>(result: { data: T | null; error: { code?: string; message?: string; details?: string } | null }): T {
  if (result.error) throw toApiError(result.error)
  return result.data as T
}
