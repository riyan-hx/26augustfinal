// Razorpay signature checks using WebCrypto (works in Deno Edge Functions and Node 20+).
// Both comparisons are constant-time.

const encoder = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Webhook: X-Razorpay-Signature = HMAC_SHA256(raw_body, webhook_secret). */
export async function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  return timingSafeEqual(await hmacSha256Hex(secret, rawBody), signature.toLowerCase());
}

/** Checkout handler: razorpay_signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export async function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): Promise<boolean> {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  return timingSafeEqual(await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`), signature.toLowerCase());
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 32 random bytes, base64url. Given to the patient; only its SHA-256 is stored. */
export function newManageToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
