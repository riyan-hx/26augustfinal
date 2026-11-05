import { useState } from 'react'
import { Plus, Sparkles, X } from '../../lib/icons'
import {
  BIO_EXAMPLE, BIO_MAX, BIO_SOFT_LIMIT, CITY_SUGGESTIONS, LANGUAGE_SUGGESTIONS, TITLE_SUGGESTIONS, type AboutDraft,
} from './model'
import { Chip, FieldError } from './ui'

interface Props { value: AboutDraft; onChange: (v: AboutDraft) => void; errors: Record<string, string> }

export function StepAbout({ value, onChange, errors }: Props) {
  const set = <K extends keyof AboutDraft>(k: K, v: AboutDraft[K]) => onChange({ ...value, [k]: v })
  const [newLang, setNewLang] = useState('')
  const [showExample, setShowExample] = useState(false)

  const toggleLang = (l: string) =>
    set('languages', value.languages.includes(l) ? value.languages.filter((x) => x !== l) : [...value.languages, l])
  const addLang = () => {
    const l = newLang.trim().replace(/^\w/, (c) => c.toUpperCase())
    if (l && !value.languages.some((x) => x.toLowerCase() === l.toLowerCase())) set('languages', [...value.languages, l])
    setNewLang('')
  }
  const extraLangs = value.languages.filter((l) => !LANGUAGE_SUGGESTIONS.includes(l))
  const bioLen = value.bio.length

  return (
    <div className="space-y-7">
      <div>
        <label htmlFor="ob-name" className="field-label">Your name, as patients will see it</label>
        <input id="ob-name" className="field" autoComplete="name" value={value.displayName} maxLength={120}
          placeholder="e.g. Dr. Anjali Menon" onChange={(e) => set('displayName', e.target.value)}
          aria-invalid={errors.display_name ? true : undefined} aria-describedby={errors.display_name ? 'ob-name-err' : undefined} />
        <FieldError id="ob-name-err">{errors.display_name}</FieldError>
      </div>

      <fieldset>
        <legend className="field-label">Your title</legend>
        <div className="flex flex-wrap gap-2 mb-2.5">
          {TITLE_SUGGESTIONS.map((t) => <Chip key={t} pressed={value.title === t} onClick={() => set('title', value.title === t ? '' : t)}>{t}</Chip>)}
        </div>
        <input aria-label="Title, or write your own" className="field" value={value.title} maxLength={80}
          placeholder="Or write your own" onChange={(e) => set('title', e.target.value)} />
      </fieldset>

      <fieldset>
        <legend className="field-label">Where you practise</legend>
        <div className="flex flex-wrap gap-2 mb-2.5">
          {CITY_SUGGESTIONS.map((c) => <Chip key={c} pressed={value.city === c} onClick={() => set('city', value.city === c ? '' : c)}>{c}</Chip>)}
        </div>
        <input aria-label="City, or type another" className="field" value={value.city} maxLength={80} autoComplete="address-level2"
          placeholder="Another city" onChange={(e) => set('city', e.target.value)} />
      </fieldset>

      <fieldset aria-describedby={errors.languages ? 'ob-lang-hint ob-lang-err' : 'ob-lang-hint'}>
        <legend className="field-label">Languages you offer sessions in</legend>
        <div className="flex flex-wrap gap-2">
          {[...LANGUAGE_SUGGESTIONS, ...extraLangs].map((l) => <Chip key={l} pressed={value.languages.includes(l)} onClick={() => toggleLang(l)}>{l}</Chip>)}
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--ob-line-strong)] pl-3 pr-1 min-h-[34px] bg-white focus-within:border-[var(--ob-moss)]">
            <input aria-label="Add another language" value={newLang} maxLength={40} placeholder="Add another"
              className="w-[96px] bg-transparent text-[13px] outline-none placeholder:text-[var(--ob-muted)]"
              onChange={(e) => setNewLang(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLang() } }} />
            <button type="button" className="ob-icon-btn !w-7 !h-7" aria-label="Add language" onClick={addLang} disabled={!newLang.trim()}>
              <Plus size={14} />
            </button>
          </span>
        </div>
        <p id="ob-lang-hint" className="ob-hint">Patients often search by language — it helps the right people find you.</p>
        <FieldError id="ob-lang-err">{errors.languages}</FieldError>
      </fieldset>

      <div>
        <div className="flex items-end justify-between gap-3">
          <label htmlFor="ob-bio" className="field-label">A few lines about how you work</label>
          <button type="button" className="ob-link mb-1.5 inline-flex items-center gap-1" aria-expanded={showExample} onClick={() => setShowExample((v) => !v)}>
            {showExample ? <X size={13} aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
            {showExample ? 'Hide example' : 'See an example'}
          </button>
        </div>
        {showExample && (
          <div className="ob-fade mb-3 rounded-[14px] bg-[var(--ob-mint)] border border-[var(--ob-mint-strong)] p-4">
            <p className="text-[13px] leading-relaxed text-[var(--ob-ink)]">“{BIO_EXAMPLE}”</p>
            <button type="button" className="ob-link mt-2" onClick={() => { set('bio', BIO_EXAMPLE); setShowExample(false) }}>
              Use this as a starting point
            </button>
          </div>
        )}
        <textarea id="ob-bio" className="field min-h-[144px] resize-y leading-relaxed" value={value.bio} maxLength={BIO_MAX}
          placeholder="Who you work with, your approach, and what a first session is like."
          onChange={(e) => set('bio', e.target.value)} aria-describedby="ob-bio-count" />
        <p id="ob-bio-count" className="ob-hint flex justify-between gap-3" aria-live="polite">
          <span>{bioLen > BIO_SOFT_LIMIT ? 'Shorter often reads warmer — patients skim.' : 'Two to four sentences is plenty. You can change it anytime.'}</span>
          <span className={`tabular-nums shrink-0 ${bioLen > BIO_SOFT_LIMIT ? 'text-[#9a5b00]' : ''}`}>{bioLen}/{BIO_SOFT_LIMIT}</span>
        </p>
      </div>
    </div>
  )
}
