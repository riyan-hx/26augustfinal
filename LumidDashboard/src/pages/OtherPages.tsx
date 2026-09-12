import { Check, CreditCard, TrendingUp, Shield, Sparkles, Repeat2, Globe, Settings, Calendar, MapPin, Award, Languages, Copy, ExternalLink } from '../lib/icons'

export function SessionsPage() {
  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <h1 className="font-serif text-[26px] font-semibold tracking-tight">Sessions</h1>
      <p className="text-[12px] text-[var(--stone)] mt-1">Lightweight notes • Human judgment before clinical action</p>

      <div className="mt-6 grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5 lg:p-6">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">SESSION BRIEF — RAHUL SHARMA</p>
          <p className="text-[12px] text-[var(--stone)] mt-1">Last session 7 days ago • Last discussed: Academic avoidance</p>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="rounded-xl bg-[var(--green-50)] border border-[var(--green-200)] p-4">
              <p className="text-[11px] font-semibold text-[var(--green-700)]">WHAT IMPROVED</p>
              <p className="text-[13px] mt-1">Task initiation — completed 25-min block twice.</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-[11px] font-semibold text-amber-700">WHAT BECAME HARDER</p>
              <p className="text-[13px] mt-1">Fear of evaluation before presentation.</p>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--hairline)] p-4 mt-4">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">PATIENT SHARED</p>
            <p className="text-[13px] italic mt-1">“I’m still avoiding the presentation.”</p>
            <p className="text-[11px] text-[var(--stone)] mt-2">2 reflections • 3 check-ins • 1 completed action • Confidence: Moderate</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-[12px] font-medium">Start session</button>
            <button className="px-4 py-2 rounded-full border border-[var(--hairline)] text-[12px] font-medium">View full brief</button>
          </div>
        </div>

        <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">SESSION NOTE — 5 FIELDS MAX</p>
          <div className="mt-4 space-y-3">
            {[
              { label: 'What was discussed', ph: 'Academic avoidance, performance expectations...' },
              { label: 'Observations', ph: 'Patient appeared more engaged...' },
              { label: 'Intervention', ph: 'Explored alternatives to avoidance...' },
              { label: 'Patient response', ph: 'Acknowledged fear, willing to try...' },
              { label: 'Next steps / Follow-up', ph: 'Follow up in 3 days: “How did the first step go?”' },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[11px] font-semibold text-[var(--slate)]">{f.label}</label>
                <textarea placeholder={f.ph} rows={2} className="mt-1 w-full rounded-xl border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2 text-[13px] outline-none focus:border-[var(--green-700)] focus:bg-white" />
              </div>
            ))}
          </div>
          <button className="mt-3 w-full py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-semibold">Save note</button>
        </div>
      </div>
    </div>
  )
}

export function FollowUpsPage() {
  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <h1 className="font-serif text-[26px] font-semibold tracking-tight flex items-center gap-2"><Repeat2 size={20} className="text-[var(--green-700)]" /> Follow-ups</h1>
      <p className="text-[12px] text-[var(--stone)] mt-1">Session → Follow-up → Patient action → Reflection → Progress → Next session</p>

      <div className="mt-6 bg-white border border-[var(--hairline)] rounded-[16px] p-5">
        <div className="flex gap-2 overflow-x-auto">
          {['All', 'Scheduled', 'Sent', 'Responded', 'Overdue'].map(t => (
            <button key={t} className={`px-4 py-1.5 rounded-full text-[12px] font-medium border ${t === 'All' ? 'bg-[var(--green-700)] text-white border-transparent' : 'bg-white border-[var(--hairline)]'}`}>{t}</button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {[
            { name: 'Rahul Sharma', due: 'Due today', msg: '“How did the first step go?”', sent: false },
            { name: 'Sneha Reddy', due: 'Sent 2 days ago', msg: '“How did the recovery commitment feel?”', sent: true },
            { name: 'Karthik Iyer', due: 'Overdue • 3 days', msg: '“Would you like to reflect on performance expectations?”', sent: false },
          ].map(item => (
            <div key={item.name} className="rounded-[12px] border border-[var(--hairline)] p-4 flex gap-4 items-center">
              <img src={`https://i.pravatar.cc/100?img=${item.name.length + 8}`} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">{item.name} <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full border font-medium ${item.sent ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>{item.due}</span></p>
                <p className="text-[12px] text-[var(--slate)] mt-1 truncate">{item.msg}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="px-4 py-2 rounded-full bg-[var(--green-700)] text-white text-[12px] font-medium">{item.sent ? 'View reply' : 'Send now'}</button>
                <button className="hidden sm:inline-flex px-4 py-2 rounded-full border border-[var(--hairline)] text-[12px] font-medium">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 bg-[var(--green-900)] text-white rounded-[16px] p-5 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="flex-1">
          <p className="text-[11px] font-semibold tracking-[0.12em] opacity-70">AUTOMATED RE‑ENGAGEMENT</p>
          <p className="text-[13px] leading-relaxed mt-1 max-w-[640px]">Lumid handles the re-booking nudge that determines monthly income — without you chasing on WhatsApp. Patients who receive the weekly digest rebook 34% more.</p>
        </div>
        <button className="px-5 py-2.5 rounded-full bg-white text-[var(--green-900)] text-[13px] font-semibold">Enable weekly digest</button>
      </div>
    </div>
  )
}

export function EarningsPage() {
  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <h1 className="font-serif text-[26px] font-semibold tracking-tight">Earnings</h1>
      <p className="text-[12px] text-[var(--stone)] mt-1">Simple income view — not accounting software</p>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's earnings", value: '₹4,000', sub: '3 sessions' },
          { label: 'This week', value: '₹12,300', sub: '8 completed' },
          { label: 'This month', value: '₹48,700', sub: '34 sessions' },
          { label: 'Pending', value: '₹1,500', sub: '1 payment' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-[var(--hairline)] rounded-[12px] p-5">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] uppercase">{c.label}</p>
            <p className="text-[22px] font-semibold mt-1">{c.value}</p>
            <p className="text-[11px] text-[var(--stone)]">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--hairline)]">
          <h3 className="text-[13px] font-semibold">Transaction history</h3>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] text-[var(--green-700)] font-medium flex items-center gap-1"><CreditCard size={12} /> Razorpay • Fees 7%</span>
        </div>
        <div className="divide-y divide-[var(--hairline)]">
          {[
            { id: 'TXN-9012', patient: 'Rahul Sharma', date: '25 Aug', gross: '₹1,500', fee: '₹105', net: '₹1,395', status: 'Paid' },
            { id: 'TXN-9011', patient: 'Meera Nair', date: '25 Aug', gross: '₹1,200', fee: '₹84', net: '₹1,116', status: 'Paid' },
            { id: 'TXN-9010', patient: 'Arjun Menon', date: '25 Aug', gross: '₹1,500', fee: '—', net: 'Pending', status: 'Pending' },
          ].map(row => (
            <div key={row.id} className="grid grid-cols-[1fr_0.7fr_0.6fr_0.6fr_0.7fr_0.6fr] gap-4 px-6 py-3.5 text-[12px] items-center hover:bg-[var(--sage-50)]/50">
              <span className="font-medium">{row.patient} <span className="text-[var(--stone)]">• {row.id}</span></span>
              <span>{row.date}</span>
              <span>{row.gross}</span>
              <span className="text-[var(--stone)]">{row.fee}</span>
              <span className="font-semibold">{row.net}</span>
              <span className={`px-2 py-1 rounded-full border text-[11px] font-semibold w-fit ${row.status === 'Paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>{row.status}</span>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-[var(--sage-50)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--stone)]">Fees are transparent • No hidden charges • Payouts every 48h</span>
          <span className="text-[12px] font-semibold flex items-center gap-1"><TrendingUp size={14} className="text-[var(--green-700)]" /> Revenue up 12% vs last month</span>
        </div>
      </div>
    </div>
  )
}

export function InsightsPage() {
  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <h1 className="font-serif text-[26px] font-semibold tracking-tight">Insights</h1>
      <p className="text-[12px] text-[var(--stone)] mt-1">Practice + Care signals — no vanity metrics, no surveillance</p>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">PRACTICE</p>
          <ul className="mt-3 space-y-2.5 text-[13px]">
            <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--green-700)] mt-2 shrink-0" /> No-show rate 5% — down from 18% after payment enforcement</li>
            <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--green-700)] mt-2 shrink-0" /> Returning patients 67% — 4 of 6 booked again within 14 days</li>
            <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" /> 3 patients have not scheduled next session <button className="text-[var(--green-700)] font-semibold">→ Review</button></li>
          </ul>
        </div>
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">CARE</p>
          <ul className="mt-3 space-y-2.5 text-[13px]">
            <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" /> 4 patients completed between-session actions this week</li>
            <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" /> 2 follow-ups overdue — gentle nudge recommended</li>
            <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--green-700)] mt-2 shrink-0" /> Session continuity: avg 6.2 days between sessions</li>
          </ul>
        </div>
        <div className="bg-[var(--green-900)] text-white rounded-[16px] p-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] opacity-70 flex items-center gap-1.5"><Sparkles size={12} /> INTELLIGENCE — CONSENTED ONLY</p>
          <p className="text-[13px] leading-relaxed mt-3">Evidence-based pattern: “Task initiation improved after check-ins.” Supported by 6 timeline events.</p>
          <p className="text-[11px] opacity-70 mt-2">Confidence: Moderate • Alternative: Workload change also possible.</p>
          <button className="mt-3 px-4 py-2 rounded-full bg-white text-[var(--green-900)] text-[12px] font-semibold">Discuss in next session</button>
        </div>
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-[16px] p-4 flex gap-3">
        <Shield size={16} className="text-amber-700 shrink-0 mt-0.5" />
        <p className="text-[12px] leading-relaxed text-[var(--slate)]">All sensitive insights are carefully permissioned. Nothing is inferred silently. Patients control what is shared, and you see exactly why an insight appeared.</p>
      </div>
    </div>
  )
}

export function YourPage() {
  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-semibold tracking-tight flex items-center gap-2"><Globe size={20} className="text-[var(--green-700)]" /> Your Page</h1>
          <p className="text-[12px] text-[var(--stone)] mt-1">Professional enough for Instagram bio, WhatsApp, LinkedIn, email signature</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-full border border-[var(--hairline)] bg-white text-[12px] font-medium inline-flex items-center gap-1.5"><Copy size={14} /> Copy link</button>
          <a href="/book" className="px-4 py-2 rounded-full bg-[var(--green-700)] text-white text-[12px] font-medium inline-flex items-center gap-1.5">View public page <ExternalLink size={14} /></a>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5 lg:p-6 space-y-4">
          <div className="flex gap-4">
            <img src="https://i.pravatar.cc/200?img=5" alt="" className="w-20 h-20 rounded-2xl object-cover" />
            <div>
              <p className="text-[18px] font-semibold">Dr. Anitha Raghavan</p>
              <p className="text-[13px] text-[var(--stone)]">Psychologist • Bengaluru • 8 years experience</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="px-2.5 py-1 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] text-[11px] font-medium text-[var(--green-700)]">Anxiety</span>
                <span className="px-2.5 py-1 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] text-[11px] font-medium text-[var(--green-700)]">Procrastination</span>
                <span className="px-2.5 py-1 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] text-[11px] font-medium text-[var(--green-700)]">Relationship</span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-[11px] font-semibold">Display name <input defaultValue="Dr. Anitha Raghavan" className="mt-1 w-full rounded-xl border border-[var(--hairline)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--green-700)]" /></label>
            <label className="text-[11px] font-semibold">Professional title <input defaultValue="Psychologist" className="mt-1 w-full rounded-xl border border-[var(--hairline)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--green-700)]" /></label>
            <label className="text-[11px] font-semibold">Location <span className="flex items-center gap-1.5 mt-1 rounded-xl border border-[var(--hairline)] px-3 py-2.5"><MapPin size={14} className="text-[var(--stone)]" /><input defaultValue="Bengaluru" className="flex-1 outline-none text-[13px]" /></span></label>
            <label className="text-[11px] font-semibold">Languages <span className="flex items-center gap-1.5 mt-1 rounded-xl border border-[var(--hairline)] px-3 py-2.5"><Languages size={14} className="text-[var(--stone)]" /><input defaultValue="English, Malayalam, Hindi" className="flex-1 outline-none text-[13px]" /></span></label>
          </div>

          <label className="block text-[11px] font-semibold">Bio <textarea rows={3} defaultValue="Warm, evidence-based support for young adults navigating overwhelm, avoidance, and self-doubt. I help you start — not just plan." className="mt-1 w-full rounded-xl border border-[var(--hairline)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--green-700)]" /></label>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--hairline)] p-3">
              <p className="text-[11px] font-semibold text-[var(--stone)]">Individual • 50 min</p>
              <p className="text-[14px] font-semibold">₹1,500</p>
              <p className="text-[11px] text-[var(--stone)]">Google Meet</p>
            </div>
            <div className="rounded-xl border border-[var(--hairline)] p-3">
              <p className="text-[11px] font-semibold text-[var(--stone)]">Follow-up • 30 min</p>
              <p className="text-[14px] font-semibold">₹1,200</p>
              <p className="text-[11px] text-[var(--stone)]">Google Meet</p>
            </div>
            <div className="rounded-xl border-2 border-dashed border-[var(--hairline)] p-3 flex items-center justify-center text-[12px] font-medium text-[var(--stone)]">+ Add session type</div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--stone)]"><Award size={12} /> Profile completeness 92% • Add cancellation policy to reach 100%</div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--hairline)] flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">PREVIEW — ANITHA.LUMIDAI.IN</span>
              <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">Live</span>
            </div>
            <div className="p-6 text-center">
              <img src="https://i.pravatar.cc/200?img=5" alt="" className="w-16 h-16 rounded-full object-cover mx-auto" />
              <p className="font-serif text-[18px] font-semibold mt-3">Dr. Anitha Raghavan</p>
              <p className="text-[12px] text-[var(--stone)]">Psychologist in Bengaluru</p>
              <p className="text-[12px] leading-relaxed mt-3 max-w-[320px] mx-auto">Warm, evidence-based support for young adults navigating overwhelm and avoidance.</p>
              <button className="mt-4 px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-medium">Book a session</button>
              <div className="mt-4 flex justify-center gap-2 text-[11px] text-[var(--stone)]"><span className="px-2.5 py-1 rounded-full bg-[var(--canvas)] border border-[var(--hairline)]">₹1,500 • 50 min</span><span className="px-2.5 py-1 rounded-full bg-[var(--canvas)] border border-[var(--hairline)]">Next: Tue 27 Aug</span></div>
            </div>
          </div>

          <div className="bg-[var(--sage-50)] border border-[var(--hairline)] rounded-[16px] p-4">
            <p className="text-[12px] font-semibold">Booking link</p>
            <div className="mt-2 flex items-center gap-2 bg-white border border-[var(--hairline)] rounded-full px-3 py-2">
              <Globe size={14} className="text-[var(--stone)]" />
              <span className="text-[12px] font-medium flex-1 truncate">anitha.lumidai.in</span>
              <button className="px-3 py-1 rounded-full bg-[var(--green-700)] text-white text-[11px] font-medium">Copy</button>
            </div>
            <p className="text-[11px] text-[var(--stone)] mt-2">Share in Instagram bio, WhatsApp, LinkedIn, or email signature.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6 max-w-[960px]">
      <h1 className="font-serif text-[26px] font-semibold tracking-tight flex items-center gap-2"><Settings size={20} className="text-[var(--green-700)]" /> Settings</h1>

      <div className="mt-6 grid lg:grid-cols-[220px_1fr] gap-6">
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-2 h-fit">
          {/* Only sections with real content behind them — no nav item that leads nowhere. */}
          {[
            { icon: Calendar, label: 'Availability', active: true },
            { icon: Shield, label: 'Privacy & Consent' },
          ].map(item => (
            <button key={item.label} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium ${item.active ? 'bg-[var(--green-700)] text-white' : 'hover:bg-[var(--canvas)] text-[var(--slate)]'}`}>
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
            <h3 className="text-[13px] font-semibold">Availability</h3>
            <p className="text-[12px] text-[var(--stone)] mt-1">Recurring weekly slots that control public booking page</p>
            <div className="mt-4 space-y-2 text-[13px]">
              {[
                { day: 'Monday', slots: '10:00–13:00, 15:00–18:00' },
                { day: 'Tuesday', slots: '10:00–14:00' },
                { day: 'Wednesday', slots: '10:00–13:00' },
                { day: 'Thursday', slots: '10:00–18:00' },
                { day: 'Friday', slots: '10:00–16:00' },
                { day: 'Weekend', slots: 'Unavailable' },
              ].map(r => (
                <div key={r.day} className="flex justify-between py-2 border-b border-[var(--hairline)] last:border-0">
                  <span className="font-medium">{r.day}</span><span className="text-[var(--stone)]">{r.slots}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 px-4 py-2 rounded-full bg-[var(--green-700)] text-white text-[12px] font-medium">Edit availability</button>
          </div>

          <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
            <h3 className="text-[13px] font-semibold flex items-center gap-2"><Shield size={14} className="text-[var(--green-700)]" /> Consent & Privacy</h3>
            <p className="text-[12px] text-[var(--stone)] mt-1">Explicit, specific, revocable • Retrofitted at data layer, not UI toggle</p>
            <div className="mt-3 space-y-2 text-[12px]">
              <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--hairline)] bg-[var(--sage-50)]/50">
                <span>Mood check-ins sharing</span><span className="flex items-center gap-1.5 text-emerald-700 font-semibold"><Check size={14} /> Enabled</span>
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--hairline)]">
                <span>Private conversations</span><span className="text-[var(--stone)] font-medium">Never shared</span>
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--hairline)] bg-[var(--sage-50)]/50">
                <span>Behavioral summaries</span><span className="flex items-center gap-1.5 text-emerald-700 font-semibold"><Check size={14} /> Shared with consent</span>
              </label>
            </div>
          </div>

          <div className="bg-[var(--green-900)] text-white rounded-[16px] p-5">
            <p className="text-[12px] font-semibold">Trust & Security</p>
            <p className="text-[11px] opacity-70 mt-1">Payments via Razorpay (PCI DSS compliant) • Consent is explicit, specific, and revocable by design</p>
            <div className="flex gap-2 mt-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-[11px]">DPDP Act compliance — in progress</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
