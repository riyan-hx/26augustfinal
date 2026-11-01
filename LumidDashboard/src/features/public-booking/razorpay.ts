// Loads Razorpay Checkout on demand and wraps it in a promise-friendly API.

interface CheckoutResponse { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
interface CheckoutOptions {
  key: string
  order_id: string
  amount: number
  currency: string
  name: string
  description: string
  prefill: { name: string; email: string; contact?: string }
  theme: { color: string }
  modal: { ondismiss: () => void; confirm_close: boolean }
  handler: (response: CheckoutResponse) => void
}
interface CheckoutInstance { open(): void; on(event: 'payment.failed', cb: (e: { error?: { description?: string } }) => void): void }
declare global { interface Window { Razorpay?: new (options: CheckoutOptions) => CheckoutInstance } }

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let loading: Promise<void> | null = null

export function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { loading = null; script.remove(); reject(new Error('checkout-script')) }
    document.head.appendChild(script)
  })
  return loading
}

export type CheckoutResult =
  | { kind: 'paid'; response: CheckoutResponse }
  | { kind: 'failed'; reason: string }
  | { kind: 'dismissed' }

export interface CheckoutParams {
  keyId: string; orderId: string; amount: number; currency: string
  title: string; description: string; prefill: { name: string; email: string; contact?: string }
}

/** Opens Checkout and resolves exactly once with how it ended. */
export async function openCheckout(p: CheckoutParams): Promise<CheckoutResult> {
  await loadCheckout()
  const Razorpay = window.Razorpay
  if (!Razorpay) throw new Error('checkout-unavailable')
  return new Promise<CheckoutResult>((resolve) => {
    const instance = new Razorpay({
      key: p.keyId, order_id: p.orderId, amount: p.amount, currency: p.currency,
      name: p.title, description: p.description, prefill: p.prefill,
      theme: { color: '#242E21' },
      modal: { confirm_close: true, ondismiss: () => resolve({ kind: 'dismissed' }) },
      handler: (response) => resolve({ kind: 'paid', response }),
    })
    instance.on('payment.failed', (e) => resolve({ kind: 'failed', reason: e.error?.description ?? 'The payment did not go through.' }))
    instance.open()
  })
}
