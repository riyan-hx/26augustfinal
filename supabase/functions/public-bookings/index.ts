// POST /public-bookings            → hold a slot + create a Razorpay order
// POST /public-bookings/verify     → checkout fast path (signature check), confirms if valid
//
// Price, availability and slot validity are always decided by the database.

import { bookingRequestSchema, fieldErrors } from "../../../LumidDashboard/src/lib/schemas.ts";
import { apiError, log, ok, readJson, requireEnv, serve, type Ctx } from "../_shared/http.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { newManageToken, sha256Hex, verifyPaymentSignature } from "../_shared/razorpay.ts";
import { createOrder, publicKeyId } from "../_shared/razorpay-api.ts";
import { rateLimit, rpc, service } from "../_shared/supabase.ts";

interface HoldResult {
  booking_id: string;
  code: string;
  psychologist_id: string;
  price_paise: number;
  hold_expires_at: string;
  starts_at: string;
  ends_at: string;
}

serve(async (ctx) => {
  if (ctx.req.method !== "POST") throw apiError("NOT_FOUND");
  if (ctx.url.pathname.endsWith("/verify")) return verify(ctx);
  return createHold(ctx);
});

async function createHold(ctx: Ctx): Promise<Response> {
  await rateLimit(`hold:${ctx.ip}`, 10, 600);

  const raw = await ctx.req.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw apiError("VALIDATION_FAILED", "Request body must be JSON.");
  }
  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) throw apiError("VALIDATION_FAILED", undefined, fieldErrors(parsed.error));
  const input = parsed.data;

  const result = await withIdempotency(ctx, "public-bookings", raw, async () => {
    const manageToken = newManageToken();
    const hold = await rpc<HoldResult>("create_booking_hold", {
      p_slug: input.slug,
      p_session_type_id: input.session_type_id,
      p_start: input.starts_at,
      p_full_name: input.full_name,
      p_email: input.email,
      p_phone: input.phone || null,
      p_note: input.note ?? null,
      p_manage_token_hash: await sha256Hex(manageToken),
    });

    let order;
    try {
      order = await createOrder(hold.price_paise, hold.code, { booking_id: hold.booking_id });
    } catch (error) {
      // Release the slot so the patient can retry immediately.
      await rpc("transition_booking", { p_booking_id: hold.booking_id, p_to: "cancelled", p_actor: "system" });
      log(ctx, "warn", "razorpay order failed; hold released", { booking_id: hold.booking_id });
      throw error;
    }

    const { error } = await service().from("payments").insert({
      psychologist_id: hold.psychologist_id,
      booking_id: hold.booking_id,
      razorpay_order_id: order.id,
      amount_paise: hold.price_paise,
    });
    if (error) throw error;

    log(ctx, "info", "hold created", { booking_id: hold.booking_id });
    return {
      status: 201,
      body: {
        booking_id: hold.booking_id,
        code: hold.code,
        starts_at: hold.starts_at,
        ends_at: hold.ends_at,
        hold_expires_at: hold.hold_expires_at,
        manage_token: manageToken,
        payment: { key_id: publicKeyId(), order_id: order.id, amount: order.amount, currency: order.currency },
      },
    };
  });

  return ok(ctx, result.body, result.status);
}

async function verify(ctx: Ctx): Promise<Response> {
  await rateLimit(`verify:${ctx.ip}`, 30, 600);
  const body = (await readJson(ctx)) as Record<string, unknown>;
  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");

  const valid = await verifyPaymentSignature(orderId, paymentId, signature, requireEnv("RAZORPAY_KEY_SECRET"));
  if (!valid) throw apiError("INVALID_SIGNATURE");

  // Fee/tax arrive later via the webhook; record capture now so the patient sees confirmation.
  const outcome = await rpc<string>("confirm_payment", {
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_method: null,
    p_fee_paise: null,
    p_tax_paise: null,
  });

  // needs_refund is handled by the webhook (single place that issues refunds).
  return ok(ctx, { status: outcome === "needs_refund" ? "refund_pending" : "confirmed" });
}
