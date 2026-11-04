import { env } from './env'

/**
 * Hosts where per-practice subdomains cannot be provisioned: the app lives on
 * a project subdomain owned by the host, so *.project.vercel.app does not resolve.
 * Practices still get working links there, just on the /p/:slug path.
 */
const SHARED_HOSTS = ['vercel.app', 'netlify.app', 'pages.dev', 'workers.dev']

/** Tolerates values like ":example.com", "https://example.com/", or trailing dots. */
function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^[.:/]+/, '')
    .replace(/\/.*$/, '')
    .replace(/\.+$/, '')
}

export const publicSiteDomain = normalizeDomain(env.publicSiteDomain)

export function canUseSubdomains(domain = publicSiteDomain): boolean {
  if (!domain || !domain.includes('.')) return false
  return !SHARED_HOSTS.some((host) => domain === host || domain.endsWith(`.${host}`))
}

/**
 * Public booking page for a practice slug. Uses subdomains (anitha.lumidai.in)
 * only when VITE_PUBLIC_SITE_DOMAIN is a custom domain with wildcard DNS;
 * otherwise a path on this app, e.g. https://app.example.com/p/anitha.
 */
export function bookingUrl(slug: string): string {
  return canUseSubdomains() ? `https://${slug}.${publicSiteDomain}` : `${appOrigin()}/p/${slug}`
}

/** The link without its scheme, for display. */
export const bookingUrlLabel = (slug: string) => bookingUrl(slug).replace(/^https?:\/\//, '')

/** What goes before and after the slug in the link field. */
export function bookingUrlParts(): { prefix: string; suffix: string } {
  return canUseSubdomains()
    ? { prefix: 'https://', suffix: `.${publicSiteDomain}` }
    : { prefix: `${appOrigin().replace(/^https?:\/\//, '')}/p/`, suffix: '' }
}

/** Slug from the current host when it is `<slug>.<publicSiteDomain>`. */
export function subdomainSlug(hostname?: string): string | null {
  if (!canUseSubdomains()) return null
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase()
  const suffix = `.${publicSiteDomain}`
  if (!host.endsWith(suffix)) return null
  const slug = host.slice(0, -suffix.length)
  if (!slug || slug.includes('.') || slug === 'www' || slug === 'app') return null
  return slug
}

function appOrigin(): string {
  return env.appUrl || (typeof window !== 'undefined' ? window.location.origin : '')
}
