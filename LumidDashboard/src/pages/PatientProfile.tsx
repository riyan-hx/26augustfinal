import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { patients, timelineEvents } from '../lib/data'
import { ArrowLeft, Video, FileText, Repeat2, ShieldCheck, Sparkles, Clock, MessageCircle, CheckCircle2, Eye } from 'lucide-react'

const tabs = ['Overview', 'Sessions', 'Timeline', 'Between Sessions', 'Notes', 'Care Plan', 'Shared Lumid', 'Privacy']

export default function PatientProfile() {
  const { id } = useParams()
  const patient = patients.find(p => p.id === id) ?? patients[0]
  const [active, setActive] = useState('Overview')

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <Link to="/app/patients" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--stone)] hover:text-[var(--ink)]"><ArrowLeft size={14} /> Back to patients</Link>

      <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px] p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex gap-4">
            <img src={`https://i.pravatar.cc/100?img=${parseInt(patient.id) + 10}`} alt="" className="w-14 h-14 rounded-full object-cover" />
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight leading-none">{patient.name}</h1>
              <p className="text-[12px] text-[var(--stone)] mt-1">{patient.sessions} sessions • Last session: {patient.lastSession} • Next: {patient.nextSession ?? 'Not scheduled'}</p>
              <p className="text-[12px] mt-1"><span className="px-2 py-0.5 rounded-full bg-[var(--sage-50)] border border-[var(--hairline)]">{patient.focus}</span></p>
            </div>
          </div>
          <div className="lg:ml-auto flex flex-wrap gap-2">
            <button className="px-4 py-2 rounded-full bg-[var(--green-700)] text-white text-[12px] font-medium inline-flex items-center gap-1.5"><Video size={14} /> Start session</button>
            <button className="px-4 py-2 rounded-full bg-white border border-[var(--hairline)] text-[12px] font-medium inline-flex items-center gap-1.5"><FileText size={14} /> Add note</button>
            <button className="px-4 py-2 rounded-full bg-white border border-[var(--hairline)] text-[12px] font-medium inline-flex items-center gap-1.5"><Repeat2 size={14} /> Follow up</button>
            <button className="px-4 py-2 rounded-full bg-[var(--sage-50)] border border-[var(--hairline)] text-[12px] font-medium inline-flex items-center gap-1.5"><Eye size={14} /> View timeline</button>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto scrollbar-none border-b border-[var(--hairline)] -mx-5 lg:-mx-6 px-5 lg:px-6">
          {tabs.map(t => (
            <button key={t} onClick={() => setActive(t)} className={`shrink-0 px-3.5 py-2.5 text-[12px] font-medium border-b-2 whitespace-nowrap ${active === t ? 'border-[var(--green-700)] text-[var(--green-700)]' : 'border-transparent text-[var(--stone)] hover:text-[var(--ink)]'}`}>{t}</button>
          ))}
        </div>

        {active === 'Overview' && (
          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-[12px] border border-[var(--hairline)] p-4 bg-[var(--sage-50)]/50">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">CURRENT FOCUS</p>
                  <p className="text-[14px] font-semibold mt-1">{patient.focus}</p>
                  <p className="text-[12px] text-[var(--slate)] mt-1 leading-relaxed">Patient reports difficulty starting important tasks after high-pressure evaluation.</p>
                </div>
                <div className="rounded-[12px] border border-[var(--hairline)] p-4">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">RECENT PROGRESS</p>
                  <p className="text-[14px] font-medium mt-1 text-emerald-700">Task initiation appears to have improved.</p>
                  <p className="text-[12px] text-[var(--stone)] mt-1">Between sessions: 2 of 3 agreed actions completed.</p>
                </div>
              </div>

              <div className="rounded-[12px] border border-[var(--hairline)] p-4">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">BETWEEN SESSIONS</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> 2 of 3 actions completed</span>
                  <span className="text-[11px] text-[var(--stone)]">Last check-in 1 day ago</span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2 text-[12px]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--green-700)] mt-2 shrink-0" /> Completed 25-min focused work block — “Felt less overwhelmed after starting”</div>
                  <div className="flex gap-2 text-[12px]"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" /> Skipped presentation prep — noted fear of evaluation</div>
                </div>
              </div>

              <div className="rounded-[12px] border border-[var(--hairline)] p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]"><Sparkles size={12} className="text-[var(--green-700)]" /> SHARED LUMID INSIGHT — REQUIRES CONSENT</div>
                <div className="mt-3 rounded-xl bg-[var(--green-50)] border border-[var(--green-200)] p-4">
                  <p className="text-[12px] font-semibold text-[var(--green-800)]">Pattern observed</p>
                  <p className="text-[13px] leading-relaxed mt-1">“Difficulty starting important work has appeared repeatedly after high-pressure situations.”</p>
                  <p className="text-[11px] text-[var(--stone)] mt-2">Evidence: 4 check-ins • 3 reflections • 2 completed actions • Confidence: Moderate</p>
                  <p className="text-[11px] text-[var(--slate)] mt-1 italic">Alternative explanation: Recent workload increase may also contribute.</p>
                  <p className="text-[12px] font-medium mt-2">Suggested discussion: “Explore what changes when work will be evaluated.”</p>
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1.5 rounded-full bg-[var(--green-700)] text-white text-[11px] font-medium">Discuss in session</button>
                    <button className="px-3 py-1.5 rounded-full bg-white border border-[var(--hairline)] text-[11px] font-medium">Add to notes</button>
                    <button className="px-3 py-1.5 rounded-full bg-white border border-[var(--hairline)] text-[11px] font-medium">Hide insight</button>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--stone)] mt-2">Intelligence model: Observation → Evidence → Pattern hypothesis → Confidence → Alternative explanation → Suggested reflection → Human decision</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[12px] border border-[var(--hairline)] p-4">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] flex items-center gap-1.5"><Clock size={12} /> NEXT SESSION</p>
                <p className="text-[14px] font-semibold mt-1">{patient.nextSession ?? 'Not scheduled'}</p>
                <p className="text-[12px] text-[var(--stone)]">50 min • Individual Session • Paid</p>
                <button className="mt-3 w-full py-2 rounded-full bg-[var(--green-700)] text-white text-[12px] font-medium">Open session workspace</button>
              </div>

              <div className="rounded-[12px] border border-[var(--hairline)] p-4">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] flex items-center gap-1.5"><ShieldCheck size={12} /> CONSENT & PRIVACY</p>
                <div className="mt-3 space-y-2 text-[12px]">
                  <div className="flex justify-between"><span>Private Lumid conversations</span><span className="font-semibold text-[var(--stone)]">Not shared</span></div>
                  <div className="flex justify-between"><span>Mood check-ins</span><span className="font-semibold text-emerald-700">Shared</span></div>
                  <div className="flex justify-between"><span>Weekly progress</span><span className="font-semibold text-emerald-700">Shared</span></div>
                  <div className="flex justify-between"><span>Behavioral summaries</span><span className="font-semibold text-emerald-700">Shared</span></div>
                </div>
                <p className="text-[11px] text-[var(--stone)] mt-3 leading-relaxed">Patient controls what you see. Consent is explicit, specific, and revocable.</p>
                <button className="mt-2 text-[11px] font-semibold text-[var(--green-700)]">View consent log →</button>
              </div>

              <div className="rounded-[12px] border border-[var(--hairline)] p-4">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">TIMELINE PREVIEW</p>
                <div className="mt-3 space-y-3">
                  {timelineEvents.slice(0, 3).map(ev => (
                    <div key={ev.date} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${ev.dot ? 'bg-[var(--green-700)] border-[var(--green-700)]' : 'border-[var(--stone)] bg-white'} mt-1`} />
                        <div className="w-px flex-1 bg-[var(--hairline)] mt-1" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold tracking-[0.08em] text-[var(--stone)]">{ev.date}</p>
                        <p className="text-[12px] font-semibold leading-none mt-0.5">{ev.title}</p>
                        <p className="text-[11px] text-[var(--stone)] leading-snug mt-1">{ev.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {active !== 'Overview' && (
          <div className="mt-8 text-center py-10 bg-[var(--canvas)] border border-dashed border-[var(--hairline)] rounded-[16px]">
            <div className="w-10 h-10 rounded-full bg-white border border-[var(--hairline)] flex items-center justify-center mx-auto"><MessageCircle size={16} className="text-[var(--stone)]" /></div>
            <p className="text-[14px] font-semibold mt-3">{active}</p>
            <p className="text-[12px] text-[var(--stone)] mt-1 max-w-[420px] mx-auto">This tab is part of the 8-tab longitudinal workspace. Content appears only with appropriate consent and session context.</p>
          </div>
        )}
      </div>
    </div>
  )
}
