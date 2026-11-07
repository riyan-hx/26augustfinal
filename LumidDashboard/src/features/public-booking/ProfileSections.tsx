import { useState, type ReactNode } from 'react'
import {
  BadgeCheck, Brain, Briefcase, CalendarDays, Clock, CloudRain, GraduationCap, Heart, Languages, Leaf, Lightbulb, MapPin,
  MessageCircle, Moon, Puzzle, Share, ShieldCheck, Smile, Sparkles, Target, UserRound, Users, Video, Wallet,
} from '../../lib/icons'
import { Avatar } from '../../components/ui/Avatar'
import { photoSrc } from '../../lib/photos'
import { formatINR } from '../../lib/money'
import type { PublicProfile } from './api'
import { TINTS, firstName, type Tint } from './theme'

const ORDER: Tint[] = ['green', 'sky', 'amber', 'lilac', 'rose', 'teal']

type IconCmp = (p: { size?: number; className?: string }) => ReactNode
const TOPIC_ICONS: [RegExp, IconCmp][] = [
  [/anxi|panic|worr|overwhelm/i, Brain],
  [/procrast|avoid|focus|adhd|motivat/i, Target],
  [/stress|burn|work|career/i, Briefcase],
  [/sleep|insomnia/i, Moon],
  [/relation|couple|family|marri|love/i, Heart],
  [/esteem|confiden|identity|self/i, Smile],
  [/depress|mood|low/i, CloudRain],
  [/grief|loss|trauma|heal/i, Leaf],
]
const topicIcon = (topic: string): IconCmp => TOPIC_ICONS.find(([re]) => re.test(topic))?.[1] ?? Sparkles

export function Tinted({ tint, children, className = '' }: { tint: Tint; children: ReactNode; className?: string }) {
  const [bg, fg, ring] = TINTS[tint]
  return <span className={className} style={{ background: bg, color: fg, boxShadow: `inset 0 0 0 1px ${ring}` }}>{children}</span>
}


/* ───────────────────────────── Hero ───────────────────────────── */

export function ProfileHero({ profile, onBook }: { profile: PublicProfile; onBook: () => void }) {
  const from = Math.min(...profile.sessionTypes.map((s) => s.pricePaise))
  const facts = ([
    profile.yearsExperience ? { tint: 'green', icon: <BadgeCheck size={16} />, label: `${profile.yearsExperience}+ years`, sub: 'Experience' } : null,
    profile.languages.length ? { tint: 'sky', icon: <Languages size={16} />, label: profile.languages.slice(0, 3).join(', '), sub: 'Languages' } : null,
    { tint: 'lilac', icon: <Video size={16} />, label: profile.sessionModes.includes('in_person') ? (profile.sessionModes.includes('online') ? 'Online & in person' : 'In person') : 'Online', sub: profile.sessionModes.includes('online') ? 'Google Meet' : 'Sessions' },
    Number.isFinite(from) ? { tint: 'amber', icon: <Wallet size={16} />, label: `From ${formatINR(from)}`, sub: 'Per session' } : null,
  ] as ({ tint: Tint; icon: ReactNode; label: string; sub: string } | null)[]).filter((f) => !!f)

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[var(--hairline)] bg-white" aria-label="About this psychologist">
      <div aria-hidden className="h-[132px] sm:h-[156px] relative" style={{ background: 'linear-gradient(118deg, #DCF1CC 0%, #EAF6E1 30%, #E6F0FA 66%, #EFEAFB 100%)' }}>
        <span className="absolute -top-16 -right-10 w-64 h-64 rounded-full blur-2xl opacity-70" style={{ background: 'radial-gradient(circle, #C6EAAE 0%, transparent 70%)' }} />
        <span className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full blur-2xl opacity-60" style={{ background: 'radial-gradient(circle, #D6E6F7 0%, transparent 70%)' }} />
        <svg className="absolute inset-0 w-full h-full opacity-[0.18]" preserveAspectRatio="none" viewBox="0 0 600 160"><path d="M0 120 C 120 70, 220 150, 340 100 S 520 40, 600 80" fill="none" stroke="#2F6B1F" strokeWidth="1.2" /><path d="M0 140 C 140 100, 260 170, 380 120 S 540 70, 600 104" fill="none" stroke="#24537A" strokeWidth="1" /></svg>
      </div>

      <div className="px-5 sm:px-8 pb-6 sm:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16">
          <span className="relative w-fit rounded-full p-1.5 bg-white shadow-[0_8px_24px_rgba(36,46,33,0.12)]">
            <Avatar name={profile.displayName} src={photoSrc(profile.photoPath)} size={112} />
            <span className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-[var(--color-lime)] ring-[3px] ring-white" title="Taking new clients" />
          </span>
          <div className="flex-1 min-w-0 sm:pb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 mb-2" style={{ background: '#EAF6E1', color: '#2F6B1F' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4FA82E]" /> Accepting new clients
            </span>
            <h1 className="text-[26px] sm:text-[32px] leading-[1.1] font-semibold tracking-[-0.03em]">{profile.displayName}</h1>
            <p className="text-[14px] text-[var(--slate)] mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5"><UserRound size={14} className="text-[var(--stone)]" />{profile.title || 'Psychologist'}</span>
              {profile.city && <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-[var(--stone)]" />{profile.city}</span>}
              {profile.registration && <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[var(--stone)]" />{profile.registration}</span>}
            </p>
          </div>
          <div className="flex gap-2 sm:pb-1">
            <button type="button" className="btn-primary !min-h-[42px] !px-5 !text-[14px]" onClick={onBook}><CalendarDays size={16} /> Book a session</button>
            <ShareButton name={profile.displayName} />
          </div>
        </div>

        <ul className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {facts.map((f) => (
            <li key={f.sub} className="flex items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-white px-3.5 py-3">
              <Tinted tint={f.tint} className="w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0">{f.icon}</Tinted>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-snug">{f.label}</span>
                <span className="block text-[11px] text-[var(--stone)]">{f.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) { await navigator.share({ title: `${name} · Lumid`, url }); return }
      await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* dismissed */ }
  }
  return (
    <button type="button" className="btn-secondary !min-h-[42px] !px-4 !text-[14px]" onClick={() => void share()} aria-live="polite">
      <Share size={16} /> {copied ? 'Link copied' : 'Share'}
    </button>
  )
}

/* ─────────────────────────── Sections ─────────────────────────── */

function Section({ id, icon, tint, title, children }: { id?: string; icon: ReactNode; tint: Tint; title: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-[24px] border border-[var(--hairline)] bg-white p-5 sm:p-7">
      <h2 className="flex items-center gap-2.5 text-[17px] font-semibold">
        <Tinted tint={tint} className="w-8 h-8 rounded-[10px] inline-flex items-center justify-center">{icon}</Tinted>{title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function ProfileDetails({ profile }: { profile: PublicProfile }) {
  const name = firstName(profile.displayName)
  return (
    <div className="space-y-4">
      {profile.bio && (
        <Section icon={<MessageCircle size={16} />} tint="green" title={`About ${name}`}>
          <p className="text-[15px] leading-[1.7] text-[var(--slate)] whitespace-pre-line">{profile.bio}</p>
        </Section>
      )}

      {profile.specialties.length > 0 && (
        <Section icon={<Puzzle size={16} />} tint="sky" title="Areas I can help with">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {profile.specialties.map((s, i) => {
              const Icon = topicIcon(s), tint = ORDER[i % ORDER.length]!
              return (
                <li key={s} className="flex items-center gap-3 rounded-2xl border border-[var(--hairline)] px-3.5 py-3 transition-colors hover:bg-[var(--color-primary-tint)]">
                  <Tinted tint={tint} className="w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0"><Icon size={17} /></Tinted>
                  <span className="text-[14px] font-medium">{s}</span>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {(profile.approach || profile.modalities.length > 0) && (
        <Section icon={<Lightbulb size={16} />} tint="amber" title="How I work">
          {profile.approach && <p className="text-[15px] leading-[1.7] text-[var(--slate)]">{profile.approach}</p>}
          {profile.modalities.length > 0 && (
            <div className="mt-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--stone)]">Approaches</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.modalities.map((m, i) => <Tinted key={m} tint={ORDER[(i + 2) % ORDER.length]!} className="px-3 py-1.5 rounded-full text-[12px] font-semibold">{m}</Tinted>)}
              </div>
            </div>
          )}
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profile.audiences.length > 0 && (
          <Section icon={<Users size={16} />} tint="lilac" title="Who I work with">
            <ul className="space-y-2.5">
              {profile.audiences.map((a) => (
                <li key={a} className="flex items-center gap-2.5 text-[14px]"><span className="w-1.5 h-1.5 rounded-full bg-[#7C64C4]" />{a}</li>
              ))}
            </ul>
          </Section>
        )}
        <Section icon={<Languages size={16} />} tint="teal" title="Languages">
          <div className="flex flex-wrap gap-2">
            {profile.languages.map((l) => <span key={l} className="px-3 py-1.5 rounded-full border border-[var(--hairline)] text-[13px] font-medium">{l}</span>)}
          </div>
        </Section>
      </div>

      {profile.qualifications.length > 0 && (
        <Section icon={<GraduationCap size={16} />} tint="rose" title="Qualifications & training">
          <ol className="relative ml-1.5 border-l-2 border-dashed border-[var(--hairline)] space-y-5">
            {profile.qualifications.map((q) => (
              <li key={q.title} className="pl-5 relative">
                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white ring-[3px]" style={{ ['--tw-ring-color' as string]: '#F2CFC9' }} />
                <p className="text-[14px] font-semibold leading-snug">{q.title}</p>
                <p className="text-[13px] text-[var(--stone)] mt-0.5">{[q.place, q.year].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section icon={<Sparkles size={16} />} tint="green" title="What to expect">
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { tint: 'green' as Tint, icon: <CalendarDays size={17} />, title: 'Pick a time', body: 'Choose a session and a time that suits you. It takes about a minute.' },
            { tint: 'sky' as Tint, icon: <Video size={17} />, title: 'Get your link', body: 'You receive a confirmation by email with how to join.' },
            { tint: 'lilac' as Tint, icon: <Heart size={17} />, title: 'Meet and talk', body: `A private, unhurried conversation with ${name}. You set the pace.` },
          ].map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-[var(--canvas)] p-4">
              <div className="flex items-center justify-between">
                <Tinted tint={s.tint} className="w-9 h-9 rounded-xl inline-flex items-center justify-center">{s.icon}</Tinted>
                <span className="text-[11px] font-semibold text-[var(--stone)]">Step {i + 1}</span>
              </div>
              <p className="text-[14px] font-semibold mt-3">{s.title}</p>
              <p className="text-[13px] text-[var(--stone)] mt-1 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={<ShieldCheck size={16} />} tint="teal" title="Good to know">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
          <GoodToKnow icon={<Clock size={16} />} title={`Free cancellation up to ${profile.cancellationCutoffHours}h before`} body="Change or cancel from the link in your confirmation." />
          <GoodToKnow icon={<ShieldCheck size={16} />} title="Private and confidential" body="What you share stays between you and your psychologist." />
          <GoodToKnow icon={<Video size={16} />} title="From home" body="Join from a quiet, private space on your phone or laptop." />
          <GoodToKnow icon={<Leaf size={16} />} title="Not for emergencies" body="If you are in crisis, call 112 or go to your nearest hospital." />
        </ul>
      </Section>
    </div>
  )
}

function GoodToKnow({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="w-8 h-8 rounded-[10px] bg-[var(--canvas)] inline-flex items-center justify-center shrink-0 text-[var(--slate)]">{icon}</span>
      <span><span className="block font-semibold text-[var(--ink)]">{title}</span><span className="block text-[var(--stone)] mt-0.5">{body}</span></span>
    </li>
  )
}
