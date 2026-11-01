import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check } from '../../lib/icons'
import { bookingUrl } from '../../lib/links'
import { useProfile } from './hooks'

/** Copies the psychologist's public booking link. Falls back to setup when no slug exists. */
export function CopyBookingLinkButton({ className = 'btn-primary' }: { className?: string }) {
  const { data: profile } = useProfile()
  const [copied, setCopied] = useState(false)

  if (!profile?.slug) {
    return <Link to="/app/settings" className={className}>Set up your booking page</Link>
  }
  const url = bookingUrl(profile.slug)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy your booking link', url)
    }
  }

  return (
    <button type="button" onClick={copy} className={className} aria-live="polite">
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Link copied' : 'Copy booking link'}
    </button>
  )
}
