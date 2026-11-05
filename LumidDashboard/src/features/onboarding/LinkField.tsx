import { useEffect, useState } from 'react'
import { bookingUrlParts } from '../../lib/links'
import { AlertTriangle, CheckCircle2 } from '../../lib/icons'
import { checkSlug, cleanSlugInput, slugSuggestions, type AboutDraft } from './model'
import { Chip } from './ui'

interface Props {
  slug: string
  savedSlug: string | null
  onChange: (slug: string) => void
  about: AboutDraft
  serverError?: string
}

/** Booking-link field with live checks and name-based ideas. */
export function LinkField({ slug, savedSlug, onChange, about, serverError }: Props) {
  const { prefix, suffix } = bookingUrlParts()
  // Validate a beat after typing stops so the message doesn't flicker on every key.
  const [checked, setChecked] = useState(slug)
  useEffect(() => {
    const t = setTimeout(() => setChecked(slug), 300)
    return () => clearTimeout(t)
  }, [slug])
  const pending = checked !== slug
  const result = checkSlug(checked)
  const ideas = slugSuggestions(about.displayName, about.city).filter((s) => s !== slug)

  let status: { tone: 'ok' | 'error' | 'idle'; text: string }
  if (serverError) status = { tone: 'error', text: serverError }
  else if (!checked) status = { tone: 'idle', text: 'Short and easy to say out loud works best.' }
  else if (pending) status = { tone: 'idle', text: 'Checking…' }
  else if (!result.ok) status = { tone: 'error', text: result.message }
  else if (result.slug === savedSlug) status = { tone: 'ok', text: 'This is your current link.' }
  else status = { tone: 'ok', text: 'Looks good. We’ll confirm it’s free when you continue.' }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="ob-slug" className="field-label">Your booking link</label>
        <div className={`flex items-stretch rounded-[12px] border bg-white overflow-hidden transition-[border-color,box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ob-lime)_30%,transparent)] ${status.tone === 'error' ? 'border-[#c62f57]' : 'border-[var(--ob-line-strong)] focus-within:border-[var(--ob-moss)]'}`}>
          <span className="hidden sm:flex items-center pl-3.5 pr-0.5 text-[14px] text-[var(--ob-muted)] whitespace-nowrap select-none">{prefix}</span>
          <input id="ob-slug" value={slug} spellCheck={false} autoCapitalize="none" autoComplete="off" maxLength={40}
            onChange={(e) => onChange(cleanSlugInput(e.target.value))}
            aria-invalid={status.tone === 'error' ? true : undefined} aria-describedby="ob-slug-status ob-slug-full"
            className="flex-1 min-w-0 py-3 px-3.5 sm:pl-0.5 text-[14px] font-semibold text-[var(--ob-ink)] outline-none bg-transparent" placeholder="your-name" />
          {suffix && <span className="flex items-center pr-3.5 text-[14px] text-[var(--ob-muted)] whitespace-nowrap select-none">{suffix}</span>}
        </div>
        <p id="ob-slug-full" className="sm:hidden ob-hint break-all">{prefix}<strong className="text-[var(--ob-ink)]">{slug || 'your-name'}</strong>{suffix}</p>
        <p id="ob-slug-status" aria-live="polite"
          className={`mt-2 text-[13px] inline-flex items-start gap-1.5 ${status.tone === 'ok' ? 'text-[var(--ob-moss)]' : status.tone === 'error' ? 'text-[#c62f57]' : 'text-[var(--ob-muted)]'}`}>
          {status.tone === 'ok' && <CheckCircle2 size={15} className="mt-px shrink-0" aria-hidden="true" />}
          {status.tone === 'error' && <AlertTriangle size={15} className="mt-px shrink-0" aria-hidden="true" />}
          {status.text}
        </p>
      </div>

      {ideas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-[var(--ob-muted)]">Ideas:</span>
          {ideas.slice(0, 3).map((s) => <Chip key={s} onClick={() => onChange(s)}>{s}</Chip>)}
        </div>
      )}
    </div>
  )
}
