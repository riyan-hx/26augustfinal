import logoUrl from '../assets/lumid-logo.svg'

/** The real Lumid AI wordmark (brand gradient baked into the file — the
 *  one mark in the system that's allowed to stay green everywhere). Height-
 *  driven and intrinsically responsive: pass a Tailwind height utility and
 *  the width follows the source SVG's own aspect ratio, so it scales
 *  cleanly at any breakpoint or container size without ever distorting. */
export function LumidLogo({ className = 'h-[22px]' }: { className?: string }) {
  return <img src={logoUrl} alt="Lumid AI" className={`w-auto ${className}`} />
}
