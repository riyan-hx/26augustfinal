import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LumidLogo } from '../../components/LumidLogo'
import { ErrorState, PrimaryButton, Skeleton } from '../../components/ui/StateViews'
import { toApiError } from '../../lib/errors'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Copy, ExternalLink, Globe } from '../../lib/icons'
import { bookingUrl, bookingUrlLabel } from '../../lib/links'
import type { AvailabilityRule, PracticeProfile, SessionType, SetupStatus } from '../../types/domain'
import {
  usePublish, useSaveSessionType, useSaveWeeklyHours, useSessionTypes, useSetupStatus, useUpdateProfile,
  useAvailability,
} from '../practice/hooks'
import {
  STEPS, STEP_LABELS, aboutFromProfile, checkSlug, dayError, initialMaxReached, profileInput, resumeStep, sessionInput,
  sessionsFromServer, stepFor, suggestSlug, validateAbout, validateSession, weekFromRules, weekToRules, type AboutDraft,
  type SessionDraft, type StepId, type Week,
} from './model'
import { markSetupSkipped } from '../overview/setup'
import { StepAbout } from './StepAbout'
import { StepHours } from './StepHours'
import { StepLink } from './StepLink'
import { StepReview } from './StepReview'
import { StepSessions } from './StepSessions'
import { BookingPreview } from './ui'
import './onboarding.css'

/** Guided first-run setup: one focused step per screen, saved as you go. */
export default function SetupWizard() {
  const setup = useSetupStatus()
  const types = useSessionTypes()
  const rules = useAvailability()

  // Only block the screen when there's nothing to show yet: a failed background
  // refetch must never throw away what they've typed.
  if (setup.error && !setup.status) {
    return <Frame><div className="ob-card max-w-[560px] mx-auto mt-10"><ErrorState error={setup.error} onRetry={() => void setup.refetch()} /></div></Frame>
  }
  if (!setup.status || !setup.profile || !types.data || !rules.data) {
    return (
      <Frame>
        <div className="max-w-[560px] mx-auto pt-10 space-y-4" role="status" aria-label="Loading your practice">
          <Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-[80%]" /><Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-[220px] w-full !rounded-[20px] mt-8" />
        </div>
      </Frame>
    )
  }
  return <Wizard profile={setup.profile} types={types.data} rules={rules.data} status={setup.status} />
}

const PROGRESS_STEPS = STEPS.filter((s): s is Exclude<StepId, 'welcome'> => s !== 'welcome')

function Wizard({ profile, types, rules, status }: { profile: PracticeProfile; types: SessionType[]; rules: AvailabilityRule[]; status: SetupStatus }) {
  const [params, setParams] = useSearchParams()
  const [initial] = useState(() => resumeStep(status))
  const [maxReached, setMaxReached] = useState(() => initialMaxReached(status))
  const requested = params.get('step')
  const step: StepId = stepFor(requested, maxReached, initial)
  const idx = STEPS.indexOf(step)
  // Whether this run started already published — frozen, so the Done screen
  // doesn't read the just-published state back and miss a first publish.
  const [wasPublished] = useState(profile.published)

  // Keep ?step= matching the screen: a missing step, or one that can't be opened yet, is rewritten in place.
  useEffect(() => {
    if (requested !== step) setParams({ step }, { replace: true })
  }, [requested, step, setParams])

  // Drafts live here for the whole flow, so Back never loses anything.
  const [about, setAbout] = useState<AboutDraft>(() => aboutFromProfile(profile))
  const [slug, setSlug] = useState(profile.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(profile.slug))
  const [sessions, setSessions] = useState<SessionDraft[]>(() => sessionsFromServer(types))
  const [week, setWeek] = useState<Week>(() => weekFromRules(rules))
  const [published, setPublished] = useState(profile.published)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [showSessionErrors, setShowSessionErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [done, setDone] = useState(false)
  // Steps that are complete — on load from the server, then as each one saves.
  const [saved, setSaved] = useState<Set<StepId>>(() => new Set(([
    ['about', status.hasProfile], ['link', status.hasSlug], ['sessions', status.hasSessionTypes],
    ['hours', status.hasAvailability], ['review', status.published],
  ] as const).filter(([, ok]) => ok).map(([s]) => s)))

  const updateProfile = useUpdateProfile()
  const saveSessionType = useSaveSessionType()
  const saveWeeklyHours = useSaveWeeklyHours()
  const publish = usePublish()
  const sessionTypesQuery = useSessionTypes()

  // Until they pick a link themselves, suggest one from their name.
  const effectiveSlug = slugTouched ? slug : slug || suggestSlug(about.displayName, about.city)

  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(flashTimer.current), [])
  const flashSaved = () => {
    setSavedFlash(true)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setSavedFlash(false), 2400)
  }

  // Move focus to the new step's heading so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.getElementById(done ? 'ob-h-done' : `ob-h-${step}`)?.focus({ preventScroll: true })
  }, [step, done])

  const go = (target: StepId) => {
    setErrors({}); setFormError(undefined); setShowSessionErrors(false)
    setMaxReached((m) => Math.max(m, STEPS.indexOf(target)))
    setParams({ step: target })
  }

  /**
   * Saves the current step: 'saved' after a real save, 'unchanged' when there
   * was nothing to save, false to stay on the step.
   */
  async function saveStep(): Promise<'saved' | 'unchanged' | false> {
    switch (step) {
      case 'welcome':
        return 'unchanged'
      case 'about': {
        const e = validateAbout(about)
        if (Object.keys(e).length) { setErrors(e); return false }
        // No slug here: the link is only claimed on the Link step, once they've chosen it.
        await updateProfile.mutateAsync(profileInput(about))
        return 'saved'
      }
      case 'link': {
        const r = checkSlug(effectiveSlug)
        if (!r.ok) { setErrors({ slug: r.message }); return false }
        await updateProfile.mutateAsync(profileInput(about, r.slug))
        setSlug(r.slug); setSlugTouched(true)
        return 'saved'
      }
      case 'sessions': {
        setShowSessionErrors(true)
        if (!sessions.some((s) => s.isActive)) { setFormError('Turn on at least one session so patients have something to book.'); return false }
        if (sessions.some((s) => Object.keys(validateSession(s)).length)) { setFormError('A session needs a little more detail — see above.'); return false }
        for (const s of sessions) {
          if (!s.id && !s.isActive) continue
          const id = await saveSessionType.mutateAsync(sessionInput(s))
          // Keep the new id straight away, so a retry after a later failure updates instead of duplicating.
          if (!s.id) setSessions((cur) => cur.map((d) => (d.key === s.key ? { ...d, id } : d)))
        }
        // Best effort: pick up anything the server normalised. The ids are already safe.
        try {
          const fresh = await sessionTypesQuery.refetch()
          if (fresh.data) setSessions((cur) => sessionsFromServer(fresh.data, cur))
        } catch { /* keep the local drafts */ }
        return 'saved'
      }
      case 'hours': {
        if (week.some((d) => dayError(d))) { setFormError('One of the days needs a fix — see above.'); return false }
        if (!week.some((d) => d.length)) { setFormError('Open at least one day so patients can book.'); return false }
        await saveWeeklyHours.mutateAsync(weekToRules(week))
        return 'saved'
      }
      case 'review': {
        await publish.mutateAsync(true)
        setPublished(true)
        return 'saved'
      }
    }
  }

  async function onContinue(e?: FormEvent) {
    e?.preventDefault()
    if (saving) return
    setErrors({}); setFormError(undefined)
    setSaving(true)
    try {
      const result = await saveStep()
      if (!result) return
      if (result === 'saved') { flashSaved(); setSaved((cur) => new Set(cur).add(step)) }
      if (step === 'review') setDone(true)
      else go(STEPS[idx + 1]!)
    } catch (err) {
      const api = toApiError(err)
      if (api.fields && Object.keys(api.fields).length) {
        setErrors(api.fields)
        // Field errors this step can't show next to a field still get said, never dropped.
        const inline = INLINE_FIELDS[step]
        if (Object.keys(api.fields).some((k) => !inline.includes(k))) setFormError(api.userMessage)
      } else {
        setFormError(api.userMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  const firstName = about.displayName.replace(/^(dr|mr|ms|mrs)\.?\s+/i, '').trim().split(/\s+/)[0] ?? ''
  const showPreview = step === 'about' || step === 'link' || step === 'sessions' || step === 'hours'

  if (done) return <Frame savedFlash={savedFlash} finished><Done slug={effectiveSlug} firstName={firstName} wasPublished={wasPublished} /></Frame>

  const header = HEADERS[step](firstName, published)
  const ctaLabel = step === 'welcome' ? 'Let’s set up your practice' : step === 'review' ? (published ? 'Looks good — finish' : 'Publish my page') : 'Continue'

  return (
    <Frame savedFlash={savedFlash} step={step} maxReached={maxReached} onStep={go} isDone={(s) => saved.has(s)}>
      <form onSubmit={onContinue} noValidate
        className={`mx-auto ${showPreview ? 'max-w-[1040px] lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16' : 'max-w-[600px]'}`}>
        <div key={step} className="ob-enter min-w-0">
          <StepHeader id={`ob-h-${step}`} eyebrow={header.eyebrow} title={header.title}>{header.lead}</StepHeader>

          {step === 'welcome' && <Welcome published={published} />}
          {step === 'about' && <StepAbout value={about} errors={errors} onChange={(v) => { setAbout(v); setErrors({}) }} />}
          {step === 'link' && (
            <StepLink slug={effectiveSlug} savedSlug={profile.slug} about={about} sessions={sessions} serverError={errors.slug}
              onChange={(v) => { setSlug(v); setSlugTouched(true); setErrors({}) }} />
          )}
          {step === 'sessions' && <StepSessions value={sessions} onChange={(v) => { setSessions(v); setFormError(undefined) }} showErrors={showSessionErrors} formError={formError} />}
          {step === 'hours' && <StepHours value={week} onChange={(v) => { setWeek(v); setFormError(undefined) }} formError={formError} />}
          {step === 'review' && <StepReview about={about} slug={effectiveSlug} sessions={sessions} week={week} published={published} onEdit={go} formError={formError} />}

          {formError && (step === 'welcome' || step === 'about' || step === 'link') && <p className="form-error mt-4" role="alert">{formError}</p>}
          {/* One announcement for the About step's field errors (each field points at its own message). */}
          {step === 'about' && <p className="sr-only" aria-live="polite">{Object.values(errors)[0] ?? ''}</p>}

          <div className="sticky bottom-0 z-10 -mx-4 sm:mx-0 mt-10 px-4 sm:px-0 py-3 sm:py-0 bg-[var(--ob-warm)]/95 sm:bg-transparent backdrop-blur sm:backdrop-blur-none border-t border-[var(--ob-line)] sm:border-0 sm:static flex items-center justify-between gap-3">
            {idx > 0
              ? <button type="button" className="btn-secondary ob-back" onClick={() => go(STEPS[idx - 1]!)}><ArrowLeft size={14} aria-hidden="true" /> Back</button>
              : <span />}
            <div className="flex items-center gap-4">
              {step !== 'welcome' && <span className="hidden md:inline text-[12px] text-[var(--ob-muted)]">or press Enter</span>}
              <PrimaryButton type="submit" loading={saving} className="ob-cta">
                {ctaLabel} {!saving && <ArrowRight size={15} aria-hidden="true" />}
              </PrimaryButton>
            </div>
          </div>
        </div>

        {showPreview && (
          <aside className="hidden lg:block" aria-label="Live preview">
            <div className="sticky top-28">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ob-muted)]">What patients will see</p>
              <BookingPreview about={about} slug={effectiveSlug} sessions={sessions} />
            </div>
          </aside>
        )}
      </form>
    </Frame>
  )
}

/** Error fields each step shows next to their input. */
const INLINE_FIELDS: Record<StepId, string[]> = {
  welcome: [], about: ['display_name', 'languages'], link: ['slug'], sessions: [], hours: [], review: [],
}

const HEADERS: Record<StepId, (firstName: string, published: boolean) => { eyebrow: string; title: string; lead: ReactNode }> = {
  welcome: (name, published) => ({
    eyebrow: 'Welcome to Lumid',
    title: published ? `Good to see you${name ? `, ${name}` : ''}. Let’s look things over.` : `${name ? `Hello, ${name}. ` : ''}Let’s get your practice ready for patients.`,
    lead: published
      ? 'Everything is already filled in. Walk through to review or adjust anything — or skip straight to your dashboard.'
      : 'A few calm minutes, and you’ll have a booking page patients can use today.',
  }),
  about: () => ({ eyebrow: 'Step 1 of 5', title: 'Tell patients who you are', lead: 'This is the first thing people read before they reach out. Keep it simple and human.' }),
  link: () => ({ eyebrow: 'Step 2 of 5', title: 'Choose your booking link', lead: 'One link for patients to see your times and book. Share it anywhere.' }),
  sessions: () => ({ eyebrow: 'Step 3 of 5', title: 'What sessions do you offer?', lead: 'Start with what you already do. Switch on what fits, adjust the fee and length.' }),
  hours: () => ({ eyebrow: 'Step 4 of 5', title: 'When can patients book?', lead: 'Pick a pattern, then fine-tune. Patients only see times inside these hours.' }),
  review: (_n, published) => ({
    eyebrow: 'Step 5 of 5',
    title: published ? 'Everything looks right?' : 'Ready to open your doors?',
    lead: 'A last look before your page goes live. Tap Edit on anything to change it.',
  }),
}

function StepHeader({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <header className="mb-8">
      <p className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[var(--ob-moss)]">{eyebrow}</p>
      <h1 id={id} tabIndex={-1} className="mt-2 text-[26px] sm:text-[32px] leading-[1.15] font-semibold text-[var(--ob-ink)] outline-none text-balance">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--ob-muted)] max-w-[54ch]">{children}</p>
    </header>
  )
}

function Welcome({ published }: { published: boolean }) {
  const items = [
    { icon: <Globe size={18} />, title: 'Your booking page', text: 'A simple link patients use to see your times and book.' },
    { icon: <Clock size={18} />, title: 'Sessions and fees', text: 'What you offer, how long it runs, what it costs.' },
    { icon: <CalendarDays size={18} />, title: 'Your weekly hours', text: 'When you’re open. You stay in control of your time.' },
  ]
  return (
    <div className="ob-card p-2">
      <ul>
        {items.map((it, i) => (
          <li key={it.title} className={`flex items-start gap-4 p-4 ${i ? 'border-t border-[var(--ob-line)]' : ''}`}>
            <span className="ob-icon-tile" aria-hidden="true">{it.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{it.title}</p>
              <p className="text-[13px] text-[var(--ob-muted)] mt-0.5">{it.text}</p>
            </div>
            {published && <span className="ob-badge !px-2 shrink-0"><Check size={12} strokeWidth={2.6} aria-hidden="true" /><span className="sr-only">Done</span></span>}
          </li>
        ))}
      </ul>
      <p className="mx-4 mb-3 mt-1 pt-3 border-t border-dashed border-[var(--ob-line)] text-[12px] text-[var(--ob-muted)] flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5"><Clock size={13} aria-hidden="true" />About 3 minutes</span>
        <span className="inline-flex items-center gap-1.5"><Check size={13} aria-hidden="true" />Saved as you go</span>
        <span>Change anything later</span>
      </p>
    </div>
  )
}

function Done({ slug, firstName, wasPublished }: { slug: string; firstName: string; wasPublished: boolean }) {
  const url = bookingUrl(slug)
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      window.prompt('Copy your booking link', url)
    }
  }
  const share = `https://wa.me/?text=${encodeURIComponent(`You can book a session with me here: ${url}`)}`
  return (
    <div className="max-w-[560px] mx-auto text-center pt-4 sm:pt-10 ob-enter">
      <div className="ob-done-mark mx-auto w-16 h-16 rounded-full bg-[var(--ob-forest)] text-[var(--ob-lime)] flex items-center justify-center" aria-hidden="true">
        <Check size={30} strokeWidth={2.4} />
      </div>
      <h1 id="ob-h-done" tabIndex={-1} className="mt-6 text-[28px] sm:text-[34px] leading-[1.15] font-semibold outline-none text-balance">
        {wasPublished ? 'All set — your changes are live.' : `You’re open for bookings${firstName ? `, ${firstName}` : ''}.`}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--ob-muted)]">
        Share your link wherever patients find you — WhatsApp, Instagram, your clinic’s front desk.
      </p>

      <div className="ob-card mt-8 p-2 pl-4 flex items-center gap-2 text-left">
        <span className="flex-1 min-w-0 truncate text-[14px] font-semibold" title={url}>{bookingUrlLabel(slug)}</span>
        <button type="button" onClick={copy} className="btn-secondary !py-2" aria-live="polite">
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
        <a href={url} target="_blank" rel="noreferrer" className="ob-link inline-flex items-center gap-1">View your page <ExternalLink size={13} aria-hidden="true" /></a>
        <a href={share} target="_blank" rel="noreferrer" className="ob-link">Share on WhatsApp</a>
      </div>

      <Link to="/app" className="btn-primary ob-cta mt-10">Go to your dashboard <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
  )
}

function Frame({ children, step, maxReached = 0, onStep, isDone, savedFlash, finished }: {
  children: ReactNode; finished?: boolean; step?: StepId; maxReached?: number; onStep?: (s: StepId) => void; isDone?: (s: StepId) => boolean; savedFlash?: boolean
}) {
  const pos = PROGRESS_STEPS.indexOf(step as Exclude<StepId, 'welcome'>)
  return (
    <div className="ob">
      <header className="sticky top-0 z-20 bg-[var(--ob-warm)]/85 backdrop-blur border-b border-[var(--ob-line)]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/app" state={finished ? undefined : { skipSetup: true }} onClick={finished ? undefined : markSetupSkipped} aria-label="Lumid home" className="shrink-0"><LumidLogo className="h-[20px]" /></Link>
          {step && onStep && (
            <nav aria-label="Setup steps" className="hidden md:block">
              <ol className="ob-steps">
                {PROGRESS_STEPS.map((s, i) => {
                  const si = STEPS.indexOf(s)
                  const state = s !== step && isDone?.(s) ? 'done' : 'todo'
                  return (
                    <li key={s} className="flex items-center gap-1.5">
                      {i > 0 && <span className="ob-step__line" aria-hidden="true" />}
                      <button type="button" className="ob-step" data-state={state} aria-current={s === step ? 'step' : undefined}
                        disabled={si > maxReached} onClick={() => onStep(s)}>
                        <span className="ob-step__dot">{state === 'done' ? <Check size={12} strokeWidth={2.6} aria-hidden="true" /> : i + 1}</span>
                        {STEP_LABELS[s]}
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>
          )}
          <div className="flex items-center gap-3 shrink-0">
            <span aria-live="polite" className={`text-[12px] font-semibold text-[var(--ob-moss)] inline-flex items-center gap-1 transition-opacity duration-300 ${savedFlash ? 'opacity-100' : 'opacity-0'}`}>
              {savedFlash && <><Check size={13} strokeWidth={2.6} aria-hidden="true" />Saved</>}
            </span>
            {!finished && <Link to="/app" state={{ skipSetup: true }} onClick={markSetupSkipped} className="btn-link">Skip for now</Link>}
          </div>
        </div>
        {pos >= 0 && (
          <div className="md:hidden px-4 pb-3 -mt-1">
            <div className="flex justify-between text-[12px] mb-1.5">
              <span className="font-semibold">{STEP_LABELS[PROGRESS_STEPS[pos]!]}</span>
              <span className="text-[var(--ob-muted)] tabular-nums">Step {pos + 1} of {PROGRESS_STEPS.length}</span>
            </div>
            <div className="ob-bar" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={PROGRESS_STEPS.length} aria-valuenow={pos + 1}>
              <span style={{ transform: `scaleX(${(pos + 1) / PROGRESS_STEPS.length})` }} />
            </div>
          </div>
        )}
      </header>
      <main className="px-4 sm:px-6 pt-8 sm:pt-14 pb-16">{children}</main>
    </div>
  )
}
