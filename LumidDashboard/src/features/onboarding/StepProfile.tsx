import { useState } from 'react'
import { ChevronRight, Plus, Sparkles, X } from '../../lib/icons'
import {
  BIO_EXAMPLE, BIO_MAX, BIO_SOFT_LIMIT, CITY_SUGGESTIONS, LANGUAGE_SUGGESTIONS, TITLE_SUGGESTIONS, type AboutDraft,
} from './model'
import { LinkField } from './LinkField'
import { PhotoPicker } from './PhotoPicker'
import { Chip, FieldError } from './ui'

interface Props {
  about: AboutDraft
  onAbout: (v: AboutDraft) => void
  slug: string
  savedSlug: string | null
  onSlug: (v: string) => void
  errors: Record<string, string>
}

/** Step 1: who you are and your link. Only the essentials show; city and bio wait behind "Add more". */
export function StepProfile({ about, onAbout, slug, savedSlug, onSlug, errors }: Props) {
  const set = <K extends keyof AboutDraft>(k: K, v: AboutDraft[K]) => onAbout({ ...about, [k]: v })
  const [more, setMore] = useState(Boolean(about.city || about.bio))
  const [newLang, setNewLang] = useState('')
  const [showExample, setShowExample] = useState(false)

  const toggleLang = (l: string) =>
    set('languages', about.languages.includes(l) ? about.languages.filter((x) => x !== l) : [...about.languages, l])
  const addLang = () => {
    const l = newLang.trim().replace(/^\w/, (c) => c.toUpperCase())
    if (l && !about.languages.some((x) => x.toLowerCase() === l.toLowerCase())) set('languages', [...about.languages, l])
    setNewLang('')
  }
  const extraLangs = about.languages.filter((l) => !LANGUAGE_SUGGESTIONS.includes(l))
  const titleIsCustom = !!about.title && !TITLE_SUGGESTIONS.includes(about.title)

  return (
    <div className="space-y-6">
      <PhotoPicker name={about.displayName} value={about.photoPath} onChange={(p) => set('photoPath', p)} />

      <div>
        <label htmlFor="ob-name" className="field-label">Your name, as patients will see it</label>
        <input id="ob-name" className="field" autoComplete="name" value={about.displayName} maxLength={120}
          placeholder="e.g. Dr. Anjali Menon" onChange={(e) => set('displayName', e.target.value)}
          aria-invalid={errors.display_name ? true : undefined} aria-describedby={errors.display_name ? 'ob-name-err' : undefined} />
        <FieldError id="ob-name-err">{errors.display_name}</FieldError>
      </div>

      <fieldset>
        <legend className="field-label">What you do</legend>
        <div className="flex flex-wrap gap-2">
          {TITLE_SUGGESTIONS.slice(0, 4).map((t) => <Chip key={t} pressed={about.title === t} onClick={() => set('title', about.title === t ? '' : t)}>{t}</Chip>)}
          {/* Always the same input, so typing never swaps it out from under the cursor. */}
          <input aria-label="Or write your own title" className="ob-chip-input" data-on={titleIsCustom} value={titleIsCustom ? about.title : ''} maxLength={80}
            placeholder="Something else…" onChange={(e) => set('title', e.target.value)} />
        </div>
      </fieldset>

      <LinkField slug={slug} savedSlug={savedSlug} about={about} serverError={errors.slug} onChange={onSlug} />

      <fieldset aria-describedby={errors.languages ? 'ob-lang-err' : undefined}>
        <legend className="field-label">Languages you offer sessions in</legend>
        <div className="flex flex-wrap gap-2">
          {[...LANGUAGE_SUGGESTIONS, ...extraLangs].map((l) => <Chip key={l} pressed={about.languages.includes(l)} onClick={() => toggleLang(l)}>{l}</Chip>)}
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--ob-line-strong)] pl-3 pr-1 min-h-[34px] bg-white focus-within:border-[var(--ob-moss)]">
            <input aria-label="Add another language" value={newLang} maxLength={40} placeholder="Add another"
              className="w-[92px] bg-transparent text-[13px] outline-none placeholder:text-[var(--ob-muted)]"
              onChange={(e) => setNewLang(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLang() } }} />
            <button type="button" className="ob-icon-btn !w-7 !h-7" aria-label="Add language" onClick={addLang} disabled={!newLang.trim()}>
              <Plus size={14} />
            </button>
          </span>
        </div>
        <FieldError id="ob-lang-err">{errors.languages}</FieldError>
      </fieldset>

      {!more ? (
        <button type="button" className="ob-more" onClick={() => setMore(true)} aria-expanded={false}>
          <span className="ob-more__plus" aria-hidden="true"><Plus size={14} /></span>
          <span className="text-left">
            <span className="block text-[14px] font-semibold">Add your city and a short bio</span>
            <span className="block text-[12px] text-[var(--ob-muted)]">Optional — you can do this later too</span>
          </span>
          <ChevronRight size={16} className="ml-auto text-[var(--ob-muted)]" aria-hidden="true" />
        </button>
      ) : (
        <div className="ob-fade space-y-6 rounded-[18px] bg-[var(--ob-warm)] border border-[var(--ob-line)] p-4 sm:p-5">
          <fieldset>
            <legend className="field-label">Where you practise <span className="font-normal text-[var(--ob-muted)]">· optional</span></legend>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {CITY_SUGGESTIONS.map((c) => <Chip key={c} pressed={about.city === c} onClick={() => set('city', about.city === c ? '' : c)}>{c}</Chip>)}
            </div>
            <input aria-label="City, or type another" className="field" value={about.city} maxLength={80} autoComplete="address-level2"
              placeholder="Another city" onChange={(e) => set('city', e.target.value)} />
          </fieldset>
          <div>
            <div className="flex items-end justify-between gap-3">
              <label htmlFor="ob-bio" className="field-label">A few lines about how you work <span className="font-normal text-[var(--ob-muted)]">· optional</span></label>
              <button type="button" className="ob-link mb-1.5 inline-flex items-center gap-1 shrink-0" aria-expanded={showExample} onClick={() => setShowExample((v) => !v)}>
                {showExample ? <X size={13} aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
                {showExample ? 'Hide' : 'Example'}
              </button>
            </div>
            {showExample && (
              <div className="ob-fade mb-3 rounded-[14px] bg-[var(--ob-mint)] border border-[var(--ob-mint-strong)] p-4">
                <p className="text-[13px] leading-relaxed">“{BIO_EXAMPLE}”</p>
                <button type="button" className="ob-link mt-2" onClick={() => { set('bio', BIO_EXAMPLE); setShowExample(false) }}>Use this as a starting point</button>
              </div>
            )}
            <textarea id="ob-bio" className="field min-h-[112px] resize-y leading-relaxed" value={about.bio} maxLength={BIO_MAX}
              placeholder="Who you work with, your approach, and what a first session is like."
              onChange={(e) => set('bio', e.target.value)} aria-describedby="ob-bio-count" />
            <p id="ob-bio-count" className="ob-hint flex justify-between gap-3" aria-live="polite">
              <span>{about.bio.length > BIO_SOFT_LIMIT ? 'Shorter often reads warmer — patients skim.' : 'Two to four sentences is plenty.'}</span>
              <span className={`tabular-nums shrink-0 ${about.bio.length > BIO_SOFT_LIMIT ? 'text-[#9a5b00]' : ''}`}>{about.bio.length}/{BIO_SOFT_LIMIT}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
