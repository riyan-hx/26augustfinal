import { ComingSoon } from '../components/ui/ComingSoon'
import { Repeat2, TrendingUp } from '../lib/icons'

export function FollowUpsSoon() {
  return <ComingSoon title="Follow-ups" icon={<Repeat2 size={20} />}
    description="Keep patients from drifting between sessions, without chasing them on WhatsApp."
    points={['Patients due to rebook, sorted by how long since their last session', 'One-tap reminder with your booking link', 'Notes on what to pick up next time', 'Only what the patient has agreed to share']} />
}

export function InsightsSoon() {
  return <ComingSoon title="Insights" icon={<TrendingUp size={20} />}
    description="Patterns across your practice, built from sessions you’ve run."
    points={['Rebooking rate and average gap between sessions', 'Busiest days and hours, to plan your availability', 'No-show and cancellation trends', 'Earnings by session type']} />
}
