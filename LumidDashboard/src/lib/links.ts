import { env } from './env'

const appOrigin = env.appUrl || (typeof window !== 'undefined' ? window.location.origin : '')

/** Public booking page for a practice, e.g. https://app.lumidai.in/anitha */
export function bookingUrl(slug: string): string {
  return `${appOrigin}/${slug}`
}
