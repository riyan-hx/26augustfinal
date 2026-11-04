import { ComingSoon } from '../components/ui/ComingSoon'
import { TrendingUp } from '../lib/icons'

export function InsightsSoon() {
  return <ComingSoon title="Insights" icon={<TrendingUp size={20} />}
    description="Patterns across your practice, built from sessions you’ve run."
    points={['Rebooking rate and average gap between sessions', 'Busiest days and hours, to plan your availability', 'No-show and cancellation trends', 'Earnings by session type']} />
}
