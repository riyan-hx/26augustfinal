import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarPlus, Check, Clock, Copy, Download, Mail, Shield, Video, Wallet } from '../../lib/icons'
import { Avatar } from '../../components/ui/Avatar'
import { photoSrc } from '../../lib/photos'
import { formatTime } from '../../lib/dates'
import { formatINR } from '../../lib/money'
import { Tinted } from './ProfileSections'
import { firstName, type Tint } from './theme'
import type { PublicProfile } from './api'

export interface SuccessProps {
  profile: PublicProfile
  sessionName: string
  startsAt: Date
  endsAt: Date
  code: string
  email: string
  patientName: string
  pricePaise: number
  /** `paid`: Razorpay confirmed. `requested`: reserved, pay the psychologist directly. */
  kind: 'paid' | 'requested'
  manageUrl: string | null
  onBookAnother: () => void
}

export function BookingSuccess(p: SuccessProps) {
  const tz = p.profile.timezone
  const doctor = firstName(p.profile.displayName)
  const who = p.patientName.trim().split(/\s+/)[0] || 'there'
  const minutes = Math.round((p.endsAt.getTime() - p.startsAt.getTime()) / 60_000)
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: tz, ...o }).format(p.startsAt)

  const steps: { tint: Tint; icon: ReactNode; title: string; body: string }[] = p.kind === 'paid'
    ? [
        { tint: 'green', icon: <Mail size={16} />, title: 'Check your inbox', body: `Your confirmation and Google Meet link are on the way to ${p.email}.` },
        { tint: 'sky', icon: <CalendarPlus size={16} />, title: 'Save the date', body: 'Add the session to your calendar so it doesn’t slip.' },
        { tint: 'lilac', icon: <Video size={16} />, title: 'On the day', body: 'Join a few minutes early from a quiet, private space.' },
      ]
    : [
        { tint: 'green', icon: <Mail size={16} />, title: `${doctor} confirms`, body: `You’ll hear back at ${p.email} with the call link.` },
        { tint: 'amber', icon: <Wallet size={16} />, title: 'Pay directly', body: `${formatINR(p.pricePaise)}, paid to ${doctor} before the session. Nothing was charged now.` },
        { tint: 'lilac', icon: <Video size={16} />, title: 'On the day', body: 'Join a few minutes early from a quiet, private space.' },
      ]

  return (
    <div className="relative max-w-[640px] mx-auto">
      <Confetti />
      <div className="text-center pt-2">
        <SuccessMark />
        <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#2F6B1F] lumid-rise" style={{ animationDelay: '120ms' }}>
          {p.kind === 'paid' ? 'Payment received · Booking confirmed' : 'Time reserved'}
        </p>
        <h1 className="mt-2 text-[30px] sm:text-[38px] leading-[1.08] font-semibold tracking-[-0.035em] lumid-rise" style={{ animationDelay: '180ms' }}>
          You’re booked, {who}!
        </h1>
        <p className="mt-3 text-[15px] text-[var(--slate)] leading-relaxed max-w-[460px] mx-auto lumid-rise" style={{ animationDelay: '240ms' }}>
          Taking this step matters. {p.profile.displayName} is looking forward to meeting you.
        </p>
      </div>

      {/* Ticket */}
      <div className="mt-8 rounded-[24px] bg-white border border-[var(--hairline)] shadow-[0_18px_48px_-24px_rgba(36,46,33,0.35)] overflow-hidden lumid-rise" style={{ animationDelay: '320ms' }}>
        <div className="flex">
          <div className="w-[104px] sm:w-[124px] shrink-0 flex flex-col items-center justify-center py-6 text-[#24301F]" style={{ background: 'linear-gradient(160deg, #C9EBB1 0%, #E3F4D6 100%)' }}>
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">{part({ month: 'short' })}</span>
            <span className="text-[44px] leading-none font-semibold tracking-[-0.04em] mt-1">{part({ day: 'numeric' })}</span>
            <span className="text-[12px] font-medium mt-1">{part({ weekday: 'long' })}</span>
          </div>
          <div className="relative flex-1 min-w-0 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Avatar name={p.profile.displayName} src={photoSrc(p.profile.photoPath)} size={40} />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold truncate">{p.sessionName}</p>
                <p className="text-[13px] text-[var(--stone)] truncate">with {p.profile.displayName}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              <Fact icon={<Clock size={14} />} label="Time" value={`${formatTime(p.startsAt, tz)} – ${formatTime(p.endsAt, tz)}`} />
              <Fact icon={<Video size={14} />} label="Where" value="Google Meet" />
              <Fact icon={<Wallet size={14} />} label={p.kind === 'paid' ? 'Paid' : 'Pay at session'} value={formatINR(p.pricePaise)} />
              <Fact icon={<Check size={14} />} label="Length" value={`${minutes} min`} />
            </dl>
          </div>
        </div>
        <div className="border-t border-dashed border-[var(--hairline)] px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <CopyCode code={p.code} />
          <div className="flex gap-2">
            <a className="btn-secondary" href={googleCalendarUrl(p)} target="_blank" rel="noopener noreferrer"><CalendarPlus size={14} /> Google Calendar</a>
            <button type="button" className="btn-secondary" onClick={() => downloadIcs(p)}><Download size={14} /> .ics</button>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="mt-6 rounded-[24px] bg-white border border-[var(--hairline)] p-5 sm:p-6 lumid-rise" style={{ animationDelay: '420ms' }}>
        <h2 className="text-[15px] font-semibold">What happens next</h2>
        <ol className="mt-4 space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3.5">
              <span className="relative">
                <Tinted tint={s.tint} className="w-9 h-9 rounded-xl inline-flex items-center justify-center">{s.icon}</Tinted>
                {i < steps.length - 1 && <span aria-hidden className="absolute left-1/2 top-10 -translate-x-1/2 w-px h-4 bg-[var(--hairline)]" />}
              </span>
              <span className="pt-0.5"><span className="block text-[14px] font-semibold">{s.title}</span><span className="block text-[13px] text-[var(--stone)] mt-0.5 leading-relaxed">{s.body}</span></span>
            </li>
          ))}
        </ol>
      </div>

      {p.manageUrl && <ManageCard url={p.manageUrl} cutoffHours={p.profile.cancellationCutoffHours} />}

      <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center lumid-rise" style={{ animationDelay: '560ms' }}>
        <Link to={`/${p.profile.slug}`} reloadDocument className="btn-secondary !min-h-[42px]">Back to {doctor}’s profile</Link>
        <button type="button" className="btn-primary !min-h-[42px]" onClick={p.onBookAnother}>Book another session <ArrowRight size={14} /></button>
      </div>
      <p className="mt-6 text-center text-[12px] text-[var(--stone)] inline-flex w-full justify-center items-center gap-1.5"><Shield size={13} /> Your details are private and shared only with {doctor}.</p>
    </div>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] text-[var(--stone)]">{icon}{label}</dt>
      <dd className="font-semibold mt-0.5 tabular-nums">{value}</dd>
    </div>
  )
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button type="button" className="inline-flex items-center gap-2 text-[12px] text-[var(--stone)] hover:text-[var(--ink)]" aria-live="polite"
      onClick={() => { void navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }}>
      Booking ID <span className="font-mono font-semibold text-[var(--ink)]">{code}</span> {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

function ManageCard({ url, cutoffHours }: { url: string; cutoffHours: number }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { window.prompt('Copy your booking link', url) }
  }
  return (
    <div className="mt-6 rounded-[24px] p-5 sm:p-6 border lumid-rise" style={{ background: '#FBF1DE', borderColor: '#F1DDB4', animationDelay: '500ms' }}>
      <p className="text-[14px] font-semibold text-[#5C3A0C]">Save your booking link</p>
      <p className="text-[13px] text-[#7A4E12] mt-1 leading-relaxed">Use it to change the time or cancel (free up to {cutoffHours}h before). Keep it private: anyone with the link can manage this booking.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => void copy()} aria-live="polite"><Copy size={14} /> {copied ? 'Link copied' : 'Copy link'}</button>
        <a className="btn-secondary" href={url}>Open</a>
      </div>
    </div>
  )
}

/* ─────────────── Celebration ─────────────── */

function SuccessMark() {
  return (
    <span className="relative inline-flex items-center justify-center w-[88px] h-[88px]">
      <span aria-hidden className="absolute inset-0 rounded-full lumid-ring" style={{ background: '#C9EBB1' }} />
      <span aria-hidden className="absolute inset-0 rounded-full lumid-ring" style={{ background: '#C9EBB1', animationDelay: '400ms' }} />
      <span className="relative w-[88px] h-[88px] rounded-full bg-[var(--color-lime)] inline-flex items-center justify-center shadow-[0_10px_30px_rgba(96,170,60,0.45)] lumid-pop">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12.5l4.2 4.2L19 7" stroke="#242E21" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="lumid-draw" /></svg>
      </span>
    </span>
  )
}

const CONFETTI = ['#88D95F', '#2F6B1F', '#7FB3E0', '#B9A5F0', '#F4C46A', '#F29B8F', '#5CC2AE']

/** One short burst on arrival. Skipped entirely when the visitor prefers reduced motion. */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => { canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr }
    resize()
    const W = () => canvas.width, H = () => canvas.height
    const bursts = [0.3, 0.7]
    const pieces = Array.from({ length: 170 }, (_, i) => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
      const speed = (9 + Math.random() * 9) * dpr
      return {
        x: W() * bursts[i % 2]!, y: H() * 0.42, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        w: (6 + Math.random() * 6) * dpr, h: (3 + Math.random() * 4) * dpr, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        c: CONFETTI[i % CONFETTI.length]!, round: Math.random() < 0.3,
      }
    })
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const elapsed = t - start
      ctx.clearRect(0, 0, W(), H())
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - 1800) / 900)
      for (const p of pieces) {
        p.vy += 0.32 * dpr; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h, 0, Math.PI * 2); ctx.fill() } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (elapsed < 2700) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, W(), H())
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} aria-hidden className="fixed inset-0 w-full h-full pointer-events-none z-50" />
}

/* ─────────────── Calendar ─────────────── */

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

function eventText(p: SuccessProps) {
  const title = `${p.sessionName} with ${p.profile.displayName}`
  const details = `Booking ID ${p.code}.${p.manageUrl ? ` Change or cancel: ${p.manageUrl}` : ''} The Google Meet link is in your confirmation email.`
  return { title, details }
}

function googleCalendarUrl(p: SuccessProps) {
  const { title, details } = eventText(p)
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(p.startsAt)}/${stamp(p.endsAt)}`, details, location: 'Google Meet' })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

function downloadIcs(p: SuccessProps) {
  const { title, details } = eventText(p)
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lumid//Booking//EN', 'BEGIN:VEVENT',
    `UID:${p.code}@lumidai.in`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(p.startsAt)}`, `DTEND:${stamp(p.endsAt)}`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(details)}`, 'LOCATION:Google Meet',
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Session in 30 minutes', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = `lumid-session-${p.code}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
