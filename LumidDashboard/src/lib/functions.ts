import { createApiClient } from './api'
import { env } from './env'

/** Anonymous client for public Edge Functions (booking, payment verification). */
export const functionsApi = createApiClient({ baseUrl: env.functionsUrl, anonKey: env.supabaseAnonKey })
