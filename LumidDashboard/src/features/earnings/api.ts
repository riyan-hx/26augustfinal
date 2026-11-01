import { unwrap } from '../../lib/query'
import { db } from '../../lib/supabase'

export interface EarningsSummary { collectedPaise: number; refundedPaise: number; feesPaise: number; netPaise: number; pendingPaise: number; paidSessions: number }
export interface PaymentRow {
  id: string; patientName: string; code: string; status: string
  amountPaise: number; feesPaise: number; refundedPaise: number; capturedAt: Date | null
}

interface SummaryRow { collected_paise: number; refunded_paise: number; fee_paise: number; net_paise: number; pending_paise: number; paid_sessions: number }
interface PaymentJoin {
  id: string; status: string; amount_paise: number; fee_paise: number; tax_paise: number; refunded_paise: number; captured_at: string | null
  bookings: { code: string; patients: { full_name: string } | null } | null
}

export async function getSummary(from: Date, to: Date): Promise<EarningsSummary> {
  const rows = unwrap(await db().rpc('earnings_summary', { p_from: from.toISOString(), p_to: to.toISOString() })) as SummaryRow[]
  const r = rows[0]
  return {
    collectedPaise: Number(r?.collected_paise ?? 0), refundedPaise: Number(r?.refunded_paise ?? 0), feesPaise: Number(r?.fee_paise ?? 0),
    netPaise: Number(r?.net_paise ?? 0), pendingPaise: Number(r?.pending_paise ?? 0), paidSessions: Number(r?.paid_sessions ?? 0),
  }
}

export async function listPayments(limit = 50): Promise<PaymentRow[]> {
  const rows = unwrap(
    await db().from('payments')
      .select('id, status, amount_paise, fee_paise, tax_paise, refunded_paise, captured_at, bookings(code, patients(full_name))')
      .neq('status', 'created').order('created_at', { ascending: false }).limit(limit),
  ) as unknown as PaymentJoin[]
  return rows.map((r) => ({
    id: r.id, patientName: r.bookings?.patients?.full_name ?? 'Patient', code: r.bookings?.code ?? '—', status: r.status,
    amountPaise: r.amount_paise, feesPaise: r.fee_paise + r.tax_paise, refundedPaise: r.refunded_paise,
    capturedAt: r.captured_at ? new Date(r.captured_at) : null,
  }))
}
