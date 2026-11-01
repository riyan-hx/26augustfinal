import { env } from './env'

/** Public booking page for a practice slug, e.g. https://anitha.lumidai.in */
export function bookingUrl(slug: string): string {
  return `https://${slug}.${env.publicSiteDomain}`
}
