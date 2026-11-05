import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, ExternalLink, Globe, Languages, MapPin } from '../../lib/icons'
import { bookingUrl } from '../../lib/links'
import { formatINR } from '../../lib/money'
import { Avatar } from '../../components/ui/Avatar'
import { photoSrc } from '../../lib/photos'
import { ErrorState, Skeleton } from '../../components/ui/StateViews'
import { Badge, PageHeader } from '../../components/ui/PageHeader'
import { CopyBookingLinkButton } from './CopyBookingLinkButton'
import { useSessionTypes, useSetupStatus } from './hooks'

export default function LiveYourPage() {
  const setup = useSetupStatus()
  const { profile, status } = setup
  const types = useSessionTypes().data
  const active = (types ?? []).filter((t) => t.isActive)
  const url = profile?.slug ? bookingUrl(profile.slug) : null
  const checks = status ? [
    { label: 'Name and bio', done: status.hasProfile },
    { label: 'Booking link', done: status.hasSlug },
    { label: 'A session type', done: status.hasSessionTypes },
    { label: 'Weekly hours', done: status.hasAvailability },
  ] : []

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
      <PageHeader
        title="Your page"
        description="What patients see before they book. Share it on Instagram, WhatsApp or your email signature."
        meta={status ? <Badge tone={status.published ? 'green' : 'amber'}>{status.published ? 'Live' : 'Not published'}</Badge> : undefined}
        actions={
          <>
            {url && status?.published && <a href={url} target="_blank" rel="noreferrer" className="btn-secondary"><ExternalLink size={14} />Open page</a>}
            {status && !status.published
              ? <Link to="/app/setup" className="btn-primary">Finish setup</Link>
              : <Link to="/app/settings#profile" className="btn-primary">Edit page</Link>}
          </>
        }
      />

      {setup.error && <div className="mb-6 bg-white border border-[var(--hairline)] rounded-[16px]"><ErrorState error={setup.error} /></div>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <section className="bg-[linear-gradient(160deg,var(--color-primary-tint),var(--color-canvas-parchment)_60%)] border border-[var(--hairline)] rounded-[20px] p-4 sm:p-8" aria-label="Page preview">
          <div className="mx-auto max-w-[560px] bg-white rounded-[16px] border border-[var(--hairline)] shadow-sm overflow-hidden">
            <div className="h-9 border-b border-[var(--hairline)] flex items-center justify-center">
              <span className="text-[11px] text-[var(--stone)] bg-[var(--color-canvas-parchment)] rounded-full px-3 py-0.5 truncate max-w-[80%]">{url?.replace(/^https?:\/\//, '') ?? 'Choose your link in Settings'}</span>
            </div>
            {!profile ? <div className="p-8 space-y-3"><Skeleton className="h-14 w-14 rounded-full mx-auto" /><Skeleton className="h-4 w-40 mx-auto" /><Skeleton className="h-3 w-64 mx-auto" /></div> : (
              <div className="p-8 text-center">
                <div className="flex justify-center"><Avatar name={profile.displayName || 'You'} src={photoSrc(profile.photoPath)} size={64} /></div>
                <p className="text-[20px] font-semibold mt-4">{profile.displayName || 'Your name'}</p>
                <p className="text-[13px] text-[var(--stone)]">{profile.title || 'Add your professional title'}</p>
                <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 mt-3 text-[12px] text-[var(--stone)]">
                  {profile.city && <span className="flex items-center gap-1"><MapPin size={12} />{profile.city}</span>}
                  {profile.languages.length > 0 && <span className="flex items-center gap-1"><Languages size={12} />{profile.languages.join(', ')}</span>}
                </div>
                <p className={`text-[13px] leading-relaxed mt-4 max-w-[420px] mx-auto ${profile.bio ? '' : 'text-[var(--stone)] italic'}`}>{profile.bio || 'A short bio helps patients choose you. Add one in Settings.'}</p>
                <div className="mt-6 grid gap-2 text-left">
                  {active.length ? active.map((t) => (
                    <div key={t.id} className="flex items-center justify-between border border-[var(--hairline)] rounded-[12px] px-4 py-3">
                      <div>
                        <p className="text-[13px] font-semibold">{t.name}</p>
                        <p className="text-[11px] text-[var(--stone)] flex items-center gap-1"><Clock size={11} />{t.durationMinutes} min</p>
                      </div>
                      <span className="text-[13px] font-semibold tabular-nums">{formatINR(t.pricePaise)}</span>
                    </div>
                  )) : <p className="text-[12px] text-[var(--stone)] border border-dashed border-[var(--hairline)] rounded-[12px] px-4 py-3 text-center">Session types you add appear here.</p>}
                </div>
                <span className="btn-primary w-full justify-center mt-4 pointer-events-none">Book a session</span>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold flex items-center gap-2"><span className="icon-tile !w-7 !h-7 !rounded-[8px]"><Globe size={14} /></span>Booking link</h2>
              {status && <Badge tone={status.published ? 'green' : 'amber'}>{status.published ? 'Live' : 'Not published'}</Badge>}
            </div>
            <p className="text-[13px] mt-3 break-all tabular-nums">{url ?? 'Choose your link in Settings.'}</p>
            <div className="mt-4"><CopyBookingLinkButton className="btn-secondary w-full justify-center" /></div>
          </section>
          {status && !status.published && <section className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
            <h2 className="text-[15px] font-semibold">Ready to publish</h2>
            <ul className="mt-3 space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-[13px]">
                  <CheckCircle2 size={15} className={c.done ? 'text-[var(--color-primary)]' : 'text-[var(--color-hairline-strong)]'} />
                  <span className={c.done ? '' : 'text-[var(--stone)]'}>{c.label}</span>
                </li>
              ))}
            </ul>
            <Link to="/app/setup" className="btn-secondary w-full justify-center mt-4">Continue setup</Link>
          </section>}
        </aside>
      </div>
    </div>
  )
}
