import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Clock, Video, Shield, ArrowRight, CalendarDays, CreditCard, Sparkles, Copy } from '../lib/icons'
import { LumidLogo } from '../components/LumidLogo'

export default function PublicBooking() {
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState('27')
  const [selectedTime, setSelectedTime] = useState('10:30 AM')

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      {/* Public header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-[20px] border-b border-[var(--hairline)]">
        <div className="max-w-[980px] mx-auto px-4 lg:px-6 h-[52px] flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2.5">
            <LumidLogo className="h-[15px] sm:h-[17px]" />
            <span className="text-[10px] tracking-[0.12em] text-[var(--stone)] font-semibold hidden sm:inline border-l border-[var(--hairline)] pl-2.5">ANITHA.LUMIDAI.IN</span>
          </Link>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="hidden sm:inline text-[var(--stone)]">Powered by Lumid • Secure • Private</span>
            <Link to="/app" className="px-4 py-1.5 rounded-full border border-[var(--hairline)] font-medium">Psychologist login</Link>
          </div>
        </div>
      </header>

      <div className="max-w-[980px] mx-auto px-4 lg:px-6 py-8 lg:py-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          {/* Psychologist hero */}
          <div>
            <div className="bg-white border border-[var(--hairline)] rounded-[20px] p-6 lg:p-8">
              <div className="flex gap-4">
                <img src="https://i.pravatar.cc/200?img=5" alt="" className="w-20 h-20 rounded-2xl object-cover" />
                <div>
                  <h1 className="font-serif text-[24px] font-semibold leading-none">Dr. Anitha Raghavan</h1>
                  <p className="text-[13px] text-[var(--stone)] mt-1">Psychologist • Bengaluru • 8 years • English, Malayalam, Hindi</p>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] text-[11px] font-medium text-[var(--green-700)]">Anxiety & overwhelm</span>
                    <span className="px-2.5 py-1 rounded-full bg-[var(--sage-50)] border border-[var(--hairline)] text-[11px]">4.9 • 127 sessions</span>
                  </div>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--slate)] mt-4">Warm, evidence-based support for young adults navigating overwhelm, avoidance, and self-doubt. I help you start — not just plan. Sessions are held on Google Meet.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--canvas)] border border-[var(--hairline)]"><Shield size={12} className="text-[var(--green-700)]" /> Consent-first • Private</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--canvas)] border border-[var(--hairline)]"><Video size={12} /> Google Meet link after payment</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--canvas)] border border-[var(--hairline)]"><Clock size={12} /> 50 min • Cancellable 24h</span>
              </div>
            </div>

            <div className="mt-6 bg-[var(--green-900)] text-white rounded-[20px] p-6">
              <p className="text-[11px] font-semibold tracking-[0.12em] opacity-70 flex items-center gap-1.5"><Sparkles size={12} /> WHY PATIENTS CHOOSE LUMID</p>
              <ul className="mt-3 space-y-2 text-[13px] leading-relaxed opacity-90">
                <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0" /> One link to book and pay — no WhatsApp back-and-forth</li>
                <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0" /> Payment secures your slot • Instant calendar + Meet link</li>
                <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0" /> Gentle follow-ups & check-ins between sessions (only what you choose to share)</li>
              </ul>
            </div>
          </div>

          {/* Booking flow */}
          <div className="bg-white border border-[var(--hairline)] rounded-[20px] overflow-hidden sticky top-[68px]">
            <div className="px-6 py-4 border-b border-[var(--hairline)] flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">Book a session</h2>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] text-[var(--green-700)] font-medium">Step {step} of 4</span>
            </div>

            <div className="px-6 py-2 flex gap-1.5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[var(--green-700)]' : 'bg-[var(--hairline)]'}`} />
              ))}
            </div>

            {step === 1 && (
              <div className="p-6 space-y-4">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">CHOOSE SESSION</p>
                {[
                  { title: 'Individual Consultation', price: '₹1,500', dur: '50 min', desc: 'One-on-one support for overwhelm, avoidance, focus', popular: true },
                  { title: 'Follow-up Session', price: '₹1,200', dur: '30 min', desc: 'For returning patients' },
                ].map(card => (
                  <button key={card.title} onClick={() => setStep(2)} className={`w-full text-left rounded-[16px] border-2 p-4 hover:border-[var(--green-700)] transition ${card.popular ? 'border-[var(--green-700)] bg-[var(--green-50)]' : 'border-[var(--hairline)] bg-[var(--canvas)]'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[14px] font-semibold">{card.title} {card.popular && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--green-700)] text-white">Most chosen</span>}</p>
                        <p className="text-[11px] text-[var(--stone)] mt-0.5">{card.desc}</p>
                      </div>
                      <span className="text-[14px] font-semibold shrink-0">{card.price}</span>
                    </div>
                    <p className="text-[11px] text-[var(--stone)] mt-2 flex items-center gap-1"><Clock size={12} /> {card.dur} • <Video size={12} /> Google Meet</p>
                  </button>
                ))}
                <p className="text-[11px] text-[var(--stone)] text-center">You’ll pick date & time next • Payment after details</p>
              </div>
            )}

            {step === 2 && (
              <div className="p-6 space-y-4">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">CHOOSE DATE</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {['25', '26', '27', '28', '29', '30', '31'].map(d => (
                    <button key={d} onClick={() => setSelectedDate(d)} className={`py-3 rounded-xl border text-center ${selectedDate === d ? 'bg-[var(--green-700)] text-white border-transparent' : 'bg-white border-[var(--hairline)] hover:bg-[var(--canvas)]'}`}>
                      <p className="text-[11px] opacity-70">AUG</p>
                      <p className="text-[16px] font-semibold leading-none">{d}</p>
                      <p className="text-[10px] opacity-70 mt-1">{d === '27' ? 'Available' : d === '30' ? 'Full' : 'Open'}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">CHOOSE TIME — {selectedDate} AUG</p>
                <div className="grid grid-cols-3 gap-2">
                  {['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:30 PM', '04:00 PM'].map(t => (
                    <button key={t} onClick={() => setSelectedTime(t)} className={`py-2.5 rounded-full border text-[12px] font-medium ${selectedTime === t ? 'bg-[var(--green-700)] text-white border-transparent' : 'bg-white border-[var(--hairline)] hover:border-[var(--green-300)]'}`}>{t}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-full border border-[var(--hairline)] text-[13px] font-medium">Back</button>
                  <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-medium">Continue →</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="p-6 space-y-4">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">YOUR DETAILS</p>
                <div className="rounded-xl bg-[var(--sage-50)] border border-[var(--hairline)] p-3 flex items-center gap-2 text-[12px]">
                  <CalendarDays size={14} className="text-[var(--green-700)]" /> {selectedDate} Aug, {selectedTime} • Individual • ₹1,500
                  <button onClick={() => setStep(2)} className="ml-auto text-[11px] font-semibold text-[var(--green-700)]">Change</button>
                </div>
                <label className="block text-[11px] font-semibold">Full name <input placeholder="Rahul Sharma" className="mt-1 w-full rounded-xl border border-[var(--hairline)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--green-700)]" /></label>
                <label className="block text-[11px] font-semibold">Email <input placeholder="rahul@email.com" className="mt-1 w-full rounded-xl border border-[var(--hairline)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--green-700)]" /></label>
                <label className="block text-[11px] font-semibold">Phone <input placeholder="+91 98765 43210" className="mt-1 w-full rounded-xl border border-[var(--hairline)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--green-700)]" /></label>
                <label className="flex gap-2 text-[11px] leading-relaxed"><input type="checkbox" defaultChecked className="mt-0.5" /> I consent to Lumid processing my booking details to confirm this appointment. I understand I control what I share with my psychologist.</label>
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-full border border-[var(--hairline)] text-[13px] font-medium">Back</button>
                  <button onClick={() => setStep(4)} className="flex-1 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-medium inline-flex items-center justify-center gap-1.5"><CreditCard size={14} /> Pay ₹1,500</button>
                </div>
                <p className="text-[11px] text-[var(--stone)] text-center flex items-center justify-center gap-1"><Shield size={12} /> Secured by Razorpay • Payment confirms booking</p>
              </div>
            )}

            {step === 4 && (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto"><Check size={20} className="text-emerald-700" /></div>
                <h3 className="font-serif text-[20px] font-semibold mt-3">Your session is confirmed.</h3>
                <p className="text-[12px] text-[var(--stone)] mt-1">{selectedDate} Aug, {selectedTime} • Dr. Anitha Raghavan • ₹1,500 paid</p>
                <div className="mt-4 rounded-xl bg-[var(--sage-50)] border border-[var(--hairline)] p-4 text-left space-y-2 text-[12px]">
                  <div className="flex justify-between"><span className="text-[var(--stone)]">Meeting link</span><span className="font-semibold flex items-center gap-1">meet.google.com/abc-defg-hij <Copy size={12} className="text-[var(--stone)]" /></span></div>
                  <div className="flex justify-between"><span className="text-[var(--stone)]">Calendar</span><span className="font-medium">Added • Reminder scheduled</span></div>
                  <div className="flex justify-between"><span className="text-[var(--stone)]">Booking ID</span><span className="font-mono text-[11px]">B-1030 • Confirmed</span></div>
                </div>
                <p className="text-[11px] text-[var(--stone)] mt-3 leading-relaxed">You’ll receive confirmation & reminder emails. No native video — join via Google Meet at the scheduled time.</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-full border border-[var(--hairline)] text-[13px] font-medium">Book another</button>
                  <Link to="/app" className="flex-1 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-medium inline-flex items-center justify-center gap-1">Go to dashboard <ArrowRight size={14} /></Link>
                </div>
              </div>
            )}

            <div className="px-6 py-3 bg-[var(--canvas)] border-t border-[var(--hairline)] flex items-center justify-center gap-2 text-[11px] text-[var(--stone)]">
              <Shield size={12} /> Encrypted • Private • You control sharing • <span className="font-semibold text-[var(--green-700)]">Lumid AI is opt-in</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-10 border-t border-[var(--hairline)] bg-white">
        <div className="max-w-[980px] mx-auto px-4 lg:px-6 py-6 flex flex-col sm:flex-row gap-2 text-[11px] text-[var(--stone)]">
          <span>© 2026 Lumid AI • Practice → Care → Intelligence</span>
          <span className="sm:ml-auto">anitha.lumidai.in • Bengaluru • Privacy • Terms • Help</span>
        </div>
      </footer>
    </div>
  )
}
