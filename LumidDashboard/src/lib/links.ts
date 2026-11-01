import { env } from './env'

/**
 * Public booking page for a practice slug. Uses subdomains (anitha.lumidai.in)
 * only when VITE_PUBLIC_SITE_DOMAIN is set and its wildcard DNS works;
 * otherwise a path on this app, e.g. https://app.example.com/p/anitha.
 */
export function bookingUrl(slug: string): string {
  return env.publicSiteDomain ? `https://${slug}.${env.publicSiteDomain}` : `${appOrigin()}/p/${slug}`
}

/** The link without its scheme, for display. */
export const bookingUrlLabel = (slug: string) => bookingUrl(slug).replace(/^https?:\/\//, '')

/** What goes before and after the slug in the link field. */
export function bookingUrlParts(): { prefix: string; suffix: string } {
  return env.publicSiteDomain
    ? { prefix: 'https://', suffix: `.${env.publicSiteDomain}` }
    : { prefix: `${appOrigin().replace(/^https?:\/\//, '')}/p/`, suffix: '' }
}

function appOrigin(): string {
  return env.appUrl || (typeof window !== 'undefined' ? window.location.origin : '')
}
