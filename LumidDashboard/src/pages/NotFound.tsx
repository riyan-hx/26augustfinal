import { Link, useLocation } from 'react-router-dom'
import { EmptyState } from '../components/ui/StateViews'
import { Search } from '../lib/icons'

/** Unknown address: say so plainly and offer the way back. */
export default function NotFound({ standalone = false }: { standalone?: boolean }) {
  const { pathname } = useLocation()
  const body = (
    <div className="bg-white border border-[var(--hairline)] rounded-[16px]">
      <EmptyState icon={<Search size={18} />} title="Page not found"
        description={`There’s nothing at ${pathname}. The link may be mistyped or the page has moved.`}
        action={<Link to="/app" className="btn-primary">Go to Overview</Link>} />
    </div>
  )
  return standalone
    ? <main className="min-h-screen flex items-center justify-center p-4"><div className="w-full max-w-[520px]">{body}</div></main>
    : <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">{body}</div>
}
