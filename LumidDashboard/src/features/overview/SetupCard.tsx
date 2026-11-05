import { Link } from 'react-router-dom'
import { ArrowRight, Check, Sparkles } from '../../lib/icons'
import type { SetupStatus } from '../../types/domain'
import { setupDone, setupSteps } from './setup'

/** Warm, prominent prompt to finish the guided setup (shown until the page is published). */
export function SetupCard({ status }: { status: SetupStatus }) {
  const done = setupDone(status)
  const nextStep = setupSteps.find((s) => !status[s.key])
  return (
    <section className="mt-6 rounded-[16px] border border-[color-mix(in_oklch,var(--badge-green-fg)_22%,var(--hairline))] bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-canvas)_70%)] p-5" aria-labelledby="setup-h">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-10 h-10 rounded-[12px] bg-white border border-[var(--hairline)] text-[var(--badge-green-fg)] flex items-center justify-center shrink-0"><Sparkles size={18} /></span>
        <div className="flex-1 min-w-0">
          <h2 id="setup-h" className="text-[16px] font-semibold">Finish setting up your practice</h2>
          <p className="text-[12px] text-[var(--slate)] mt-1">
            {done} of {setupSteps.length} done · {nextStep ? `next: ${nextStep.label.toLowerCase()}` : 'all set — publish your booking page to start taking bookings'}
          </p>
        </div>
        <Link to={`/app/setup?step=${nextStep?.step ?? 'agreement'}`} className="btn-primary self-start sm:self-auto">{nextStep ? 'Finish setting up' : 'Publish your page'} <ArrowRight size={13} /></Link>
      </div>
      <div className="mt-4 h-1.5 rounded-full bg-white overflow-hidden" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={setupSteps.length} aria-valuenow={done}>
        <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300" style={{ width: `${(done / setupSteps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {setupSteps.map((s) => {
          const isDone = status[s.key]
          return (
            <li key={s.key}>
              <Link to={`/app/setup?step=${s.step}`} className={`flex items-start gap-2.5 p-3 rounded-xl border bg-white h-full hover:bg-[var(--color-canvas-parchment)] ${s === nextStep ? 'border-[var(--color-neutral-strong)]' : 'border-[var(--hairline)]'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDone ? 'bg-[var(--color-primary)] text-white' : 'border-2 border-[var(--hairline)]'}`}>
                  {isDone && <Check size={11} />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[13px] font-semibold ${isDone ? 'text-[var(--stone)] line-through' : ''}`}>{s.label}</span>
                  <span className="block text-[11px] text-[var(--stone)]">{s.hint}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
