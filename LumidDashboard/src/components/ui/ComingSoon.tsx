import type { ReactNode } from 'react'

/** Honest placeholder for a section that isn't built yet: what it will do, nothing fake. */
export function ComingSoon({ title, description, icon, points }: { title: string; description: string; icon: ReactNode; points: string[] }) {
  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
      <p className="text-[13px] text-[var(--stone)] mt-1">{description}</p>
      <section className="mt-6 bg-white border border-[var(--hairline)] rounded-[16px] p-8 grid md:grid-cols-[auto_1fr] gap-6 items-start">
        <span className="w-12 h-12 rounded-[12px] bg-[var(--color-primary-soft)] text-[var(--badge-green-fg)] flex items-center justify-center">{icon}</span>
        <div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-[var(--hairline)] text-[var(--stone)]">In development</span>
          <p className="text-[16px] font-semibold mt-3">What this will do</p>
          <ul className="mt-3 grid sm:grid-cols-2 gap-3">
            {points.map((p) => <li key={p} className="text-[13px] bg-[var(--color-canvas-parchment)] rounded-[12px] px-4 py-3">{p}</li>)}
          </ul>
        </div>
      </section>
    </div>
  )
}
