import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LumidLogo } from '../../components/LumidLogo'
import { ErrorState, PrimaryButton, Skeleton } from '../../components/ui/StateViews'
import { toApiError } from '../../lib/errors'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Copy, ExternalLink, Globe, ShieldCheck, X } from '../../lib/icons'
import { bookingUrl, bookingUrlLabel } from '../../lib/links'
import type { AvailabilityRule, PracticeProfile, SessionType, SetupStatus } from '../../types/domain'
import {
  useAcceptTerms, usePublish, useSaveSessionType, useSaveWeeklyHours, useSessionTypes, useSetupStatus, useUpdateProfile,
  useAvailability,
} from '../practice/hooks'
import {
  AGREEMENTS, STEPS, STEP_LABELS, TERMS_VERSION, aboutFromProfile, allAgreed, checkSlug, dayError, initialMaxReached, profileInput, resumeStep, sessionInput,
  sessionsFromServer, stepFor, suggestSlug, validateAbout, validateSession, weekFromRules, weekToRules, type AboutDraft,
  type SessionDraft, type StepId, type Week,
} from './model'
import { markSetupSkipped } from '../overview/setup'
import { StepAgreement } from './StepAgreement'
import { StepHours } from './StepHours'
import { StepProfile } from './StepProfile'
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
        <div className="max-w-[620px] mx-auto pt-4 space-y-4" role="status" aria-label="Loading your practice">
          <Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-[80%]" /><Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-[220px] w-full !rounded-[20px] mt-8" />
        </div>
      </Frame>
    )
  }
  return <Wizard profile={setup.profile} types={types.data} rules={rules.data} status={setup.status} />
}

type FlowStep = Exclude<StepId, 'welcome'>
const PROGRESS_STEPS = STEPS.filter((s): s is FlowStep => s !== 'welcome')

/** Each step has its own warm accent, so the flow feels like moving somewhere. */
const STEP_META: Record<FlowStep, { tone: string; icon: ReactNode; blurb: string }> = {
  profile: { tone: 'lime', icon: <Globe size={18} />, blurb: 'Your name, what you do and your link' },
  sessions: { tone: 'peach', icon: <Clock size={18} />, blurb: 'What patients can book, and the fee' },
  hours: { tone: 'sky', icon: <CalendarDays size={18} />, blurb: 'When you’re open for sessions' },
  agreement: { tone: 'violet', icon: <ShieldCheck size={18} />, blurb: 'A quick confirmation, then you’re live' },
}

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
  // Anyone who already confirmed the terms starts with them ticked.
  const [agreed, setAgreed] = useState<Set<string>>(() => new Set(profile.termsAcceptedAt ? AGREEMENTS.map((a) => a.id) : []))

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string>()
  const [showSessionErrors, setShowSessionErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [done, setDone] = useState(false)
  // Steps that are complete — on load from the server, then as each one saves.
  const [saved, setSaved] = useState<Set<StepId>>(() => new Set(([
    ['profile', status.hasProfile && status.hasSlug], ['sessions', status.hasSessionTypes],
    ['hours', status.hasAvailability], ['agreement', status.published],
  ] as const).filter(([, ok]) => ok).map(([s]) => s)))

  const updateProfile = useUpdateProfile()
  const saveSessionType = useSaveSessionType()
  const saveWeeklyHours = useSaveWeeklyHours()
  const publish = usePublish()
  const acceptTerms = useAcceptTerms()
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
      case 'profile': {
        const e = validateAbout(about)
        const r = checkSlug(effectiveSlug)
        if (!r.ok) e.slug = r.message
        if (Object.keys(e).length) { setErrors(e); return false }
        await updateProfile.mutateAsync(profileInput(about, r.ok ? r.slug : undefined))
        if (r.ok) { setSlug(r.slug); setSlugTouched(true) }
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
      case 'agreement': {
        if (!allAgreed(agreed)) { setFormError('Please confirm all three to go live.'); return false }
        if (!profile.termsAcceptedAt) await acceptTerms.mutateAsync(TERMS_VERSION)
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
      if (step === 'agreement') setDone(true)
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
  const frame = { step, maxReached, onStep: go, isDone: (s: StepId) => saved.has(s), savedFlash, about, slug: effectiveSlug, sessions }

  if (done) return <Frame {...frame} finished><Done slug={effectiveSlug} firstName={firstName} wasPublished={wasPublished} /></Frame>

  const header = HEADERS[step](firstName, published)
  const ctaLabel = step === 'welcome' ? (published ? 'Review my setup' : 'Let’s begin') : step === 'agreement' ? (published ? 'Looks good — finish' : 'Publish my page') : 'Continue'
  const tone = step === 'welcome' ? 'lime' : STEP_META[step].tone

  return (
    <Frame {...frame}>
      <form onSubmit={onContinue} noValidate className="max-w-[640px] mx-auto">
        <div key={step} className="ob-enter min-w-0">
          <StepHeader id={`ob-h-${step}`} tone={tone} icon={step === 'welcome' ? undefined : STEP_META[step].icon} eyebrow={header.eyebrow} title={header.title}>{header.lead}</StepHeader>

          {step === 'welcome' && <Welcome published={published} />}
          {step === 'profile' && (
            <div className="ob-card p-5 sm:p-7">
              <StepProfile about={about} onAbout={(v) => { setAbout(v); setErrors({}) }} slug={effectiveSlug} savedSlug={profile.slug}
                onSlug={(v) => { setSlug(v); setSlugTouched(true); setErrors({}) }} errors={errors} />
            </div>
          )}
          {step === 'sessions' && <StepSessions value={sessions} onChange={(v) => { setSessions(v); setFormError(undefined) }} showErrors={showSessionErrors} formError={formError} />}
          {step === 'hours' && <div className="ob-card p-5 sm:p-7"><StepHours value={week} onChange={(v) => { setWeek(v); setFormError(undefined) }} formError={formError} /></div>}
          {step === 'agreement' && (
            <StepAgreement about={about} slug={effectiveSlug} sessions={sessions} week={week} published={published} onEdit={go} formError={formError}
              checked={agreed} onToggle={(id) => { setFormError(undefined); setAgreed((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n }) }} />
          )}

          {formError && (step === 'welcome' || step === 'profile') && <p className="form-error mt-4" role="alert">{formError}</p>}
          {/* One announcement for the Profile step's field errors (each field points at its own message). */}
          {step === 'profile' && <p className="sr-only" aria-live="polite">{Object.values(errors)[0] ?? ''}</p>}

          <div className="ob-actions">
            {idx > 0
              ? <button type="button" className="btn-secondary ob-back" onClick={() => go(STEPS[idx - 1]!)}><ArrowLeft size={14} aria-hidden="true" /> Back</button>
              : <span />}
            <div className="flex items-center gap-4">
              {step !== 'welcome' && <span className="hidden md:inline text-[12px] text-[var(--ob-muted)]">or press Enter</span>}
              <PrimaryButton type="submit" loading={saving} disabled={step === 'agreement' && !allAgreed(agreed)} className="ob-cta">
                {ctaLabel} {!saving && <ArrowRight size={15} aria-hidden="true" />}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </form>
    </Frame>
  )
}

/** Error fields each step shows next to their input. */
const INLINE_FIELDS: Record<StepId, string[]> = {
  welcome: [], profile: ['display_name', 'languages', 'slug'], sessions: [], hours: [], agreement: [],
}

const HEADERS: Record<StepId, (firstName: string, published: boolean) => { eyebrow: string; title: string; lead: ReactNode }> = {
  welcome: (name, published) => ({
    eyebrow: 'Welcome to Lumid',
    title: published ? `Good to see you${name ? `, ${name}` : ''}.` : `${name ? `Hello, ${name}. ` : ''}Let’s get your practice ready.`,
    lead: published
      ? 'Everything is already set up. Walk through to review anything, or head to your dashboard.'
      : 'Four short steps and patients can book you through your own link. It takes about three minutes.',
  }),
  profile: () => ({ eyebrow: 'Step 1 of 4', title: 'Tell patients who you are', lead: 'Just the essentials. Everything else can wait.' }),
  sessions: () => ({ eyebrow: 'Step 2 of 4', title: 'What sessions do you offer?', lead: 'Switch on what fits and set your fee. You can add more later.' }),
  hours: () => ({ eyebrow: 'Step 3 of 4', title: 'When can patients book?', lead: 'Pick a pattern, then fine-tune. Patients only see times inside these hours.' }),
  agreement: (_n, published) => ({
    eyebrow: 'Step 4 of 4',
    title: published ? 'All looks right?' : 'One last thing',
    lead: 'A quick look at your page and three short confirmations.',
  }),
}

function StepHeader({ id, eyebrow, title, tone, icon, children }: { id: string; eyebrow: string; title: string; tone: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <header className="mb-8 text-center flex flex-col items-center">
      {icon && <span className={`ob-hero-icon ob-tone-${tone}`} aria-hidden="true">{icon}</span>}
      <p className={`ob-eyebrow ob-tone-${tone} ${icon ? 'mt-4' : ''}`}>{eyebrow}</p>
      <h1 id={id} tabIndex={-1} className="mt-2 text-[28px] sm:text-[36px] leading-[1.1] font-semibold text-[var(--ob-ink)] outline-none text-balance">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--ob-muted)] max-w-[46ch]">{children}</p>
    </header>
  )
}

function Welcome({ published }: { published: boolean }) {
  return (
    <div>
      <ol className="grid sm:grid-cols-2 gap-3">
        {PROGRESS_STEPS.map((s, i) => (
          <li key={s} className={`ob-welcome-card ob-tone-${STEP_META[s].tone}`}>
            <span className="ob-tile__icon" aria-hidden="true">{STEP_META[s].icon}</span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold opacity-80">Step {i + 1}</p>
              <p className="text-[15px] font-semibold text-[var(--ob-ink)]">{STEP_LABELS[s]}</p>
              <p className="text-[13px] text-[var(--ob-muted)] mt-0.5">{STEP_META[s].blurb}</p>
            </div>
            {published && <span className="ob-badge !px-2 ml-auto self-start"><Check size={12} strokeWidth={2.6} aria-hidden="true" /><span className="sr-only">Done</span></span>}
          </li>
        ))}
      </ol>
      <p className="mt-5 text-[13px] text-[var(--ob-muted)] flex flex-wrap gap-x-5 gap-y-1">
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
    <div className="max-w-[560px] mx-auto text-center pt-2 sm:pt-8 ob-enter">
      <div className="ob-confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
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

interface FrameProps {
  children: ReactNode; finished?: boolean; step?: StepId; maxReached?: number; onStep?: (s: StepId) => void; isDone?: (s: StepId) => boolean
  savedFlash?: boolean; about?: AboutDraft; slug?: string; sessions?: SessionDraft[]
}

/**
 * The page takes on the current step's colour, the journey runs across the
 * top, and the patient preview opens on demand.
 */
function Frame({ children, step, maxReached = 0, onStep, isDone, savedFlash, finished, about, slug, sessions }: FrameProps) {
  const pos = PROGRESS_STEPS.indexOf(step as FlowStep)
  const tone = finished || !step || step === 'welcome' ? 'lime' : STEP_META[step].tone
  const [peek, setPeek] = useState(false)
  const canPeek = !!about && !!sessions && (step === 'profile' || step === 'sessions')
  useEffect(() => {
    if (!peek) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPeek(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [peek])
  return (
    <div className={`ob ob-stage ob-tone-${tone}`}>
      <header className="ob-stage__top">
        <div className="px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <LumidLogo className="h-[22px] sm:h-[26px] shrink-0" />
          <span className="flex items-center gap-4">
            <span aria-live="polite" className={`hidden sm:inline-flex text-[12px] font-semibold text-[var(--ob-moss)] items-center gap-1 transition-opacity duration-300 ${savedFlash ? 'opacity-100' : 'opacity-0'}`}>
              {savedFlash && <><Check size={13} strokeWidth={2.6} aria-hidden="true" />Saved</>}
            </span>
            {canPeek && <button type="button" className="ob-peek-btn sm:!hidden" onClick={() => setPeek(true)} aria-expanded={peek}><Globe size={13} aria-hidden="true" />Preview</button>}
            {!finished && <Link to="/app" state={{ skipSetup: true }} onClick={markSetupSkipped} className="ob-skip">Skip for now</Link>}
          </span>
        </div>
        {step && !finished && (
          <nav aria-label="Setup steps" className="max-w-[760px] mx-auto px-4 sm:px-6 pb-4">
            <ol className="ob-track">
              {PROGRESS_STEPS.map((s, i) => {
                const current = s === step
                const done = isDone?.(s) && !current
                return (
                  <li key={s} className={`ob-track__item ob-tone-${STEP_META[s].tone}`} data-state={current ? 'current' : done ? 'done' : 'todo'}>
                    <button type="button" disabled={!onStep || STEPS.indexOf(s) > maxReached} onClick={() => onStep?.(s)} aria-current={current ? 'step' : undefined} className="ob-track__btn">
                      <span className="ob-track__dot" aria-hidden="true">{done ? <Check size={13} strokeWidth={2.8} /> : i + 1}</span>
                      <span className={`text-[13px] font-semibold ${current ? '' : 'hidden sm:inline'}`}>{STEP_LABELS[s]}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
            {pos >= 0 && <p className="sr-only">Step {pos + 1} of {PROGRESS_STEPS.length}</p>}
          </nav>
        )}
      </header>

      <main className="px-4 sm:px-6 pt-6 sm:pt-10 pb-20">{children}</main>

      {canPeek && (
        <>
          <button type="button" className="ob-peek-btn hidden sm:inline-flex" onClick={() => setPeek(true)} aria-expanded={peek}>
            <Globe size={15} aria-hidden="true" />See your page
          </button>
          {peek && (
            <div className="ob-peek" role="dialog" aria-modal="true" aria-label="What patients will see" onClick={() => setPeek(false)}>
              <div className="ob-peek__panel ob-enter" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ob-muted)]">What patients will see</p>
                  <button type="button" className="ob-icon-btn" aria-label="Close preview" onClick={() => setPeek(false)} autoFocus><X size={15} /></button>
                </div>
                <BookingPreview about={about!} slug={slug ?? ''} sessions={sessions!} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
