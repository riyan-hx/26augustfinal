// POST /razorpay-webhook — the source of truth for payment state.
// Signature-checked, idempotent per event id, always 200 for duplicates.

import { apiError, log, ok, requireEnv, serve, type Ctx } from "../_shared/http.ts";
import { sha256Hex, verifyWebhookSignature } from "../_shared/razorpay.ts";
import { refundPayment } from "../_shared/razorpay-api.ts";
import { rpc, service } from "../_shared/supabase.ts";

interface PaymentEntity {
  id: string;
  order_id: string;
  method?: string;
  fee?: number;
  tax?: number;
  amount: number;
}

interface RefundEntity {
  id: string;
  payment_id: string;
  status: string;
}

interface WebhookEvent {
  event: string;
  payload: {
    payment?: { entity: PaymentEntity };
    refund?: { entity: RefundEntity };
  };
}

serve(async (ctx) => {
  if (ctx.req.method !== "POST") throw apiError("NOT_FOUND");

  const raw = await ctx.req.text();
  const valid = await verifyWebhookSignature(
    raw,
    ctx.req.headers.get("x-razorpay-signature"),
    requireEnv("RAZORPAY_WEBHOOK_SECRET"),
  );
  if (!valid) {
    log(ctx, "warn", "webhook signature rejected");
    throw apiError("UNAUTHENTICATED");
  }

  const event = JSON.parse(raw) as WebhookEvent;
  const eventId = ctx.req.headers.get("x-razorpay-event-id") ?? (await sha256Hex(raw));
  const db = service();

  const { data: inserted, error: insertError } = await db
    .from("webhook_events")
    .upsert(
      { provider: "razorpay", event_id: eventId, event_type: event.event, payload_sha256: await sha256Hex(raw) },
      { onConflict: "provider,event_id", ignoreDuplicates: true },
    )
    .select("id");
  if (insertError) throw insertError;
  if (!inserted?.length) {
    const { data: prior } = await db
      .from("webhook_events")
      .select("processed_at")
      .eq("provider", "razorpay")
      .eq("event_id", eventId)
      .single();
    if (prior?.processed_at) return ok(ctx, { duplicate: true });
  }

  try {
    await handle(ctx, event);
    await db
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("provider", "razorpay")
      .eq("event_id", eventId);
  } catch (error) {
    await db
      .from("webhook_events")
      .update({ error: error instanceof Error ? error.message.slice(0, 300) : "failed" })
      .eq("provider", "razorpay")
      .eq("event_id", eventId);
    throw error; // non-2xx → Razorpay retries
  }

  return ok(ctx, { received: true });
});

async function handle(ctx: Ctx, event: WebhookEvent): Promise<void> {
  const db = service();
  switch (event.event) {
    case "payment.captured": {
      const p = event.payload.payment!.entity;
      const outcome = await rpc<string>("confirm_payment", {
        p_order_id: p.order_id,
        p_payment_id: p.id,
        p_method: p.method ?? null,
        p_fee_paise: p.fee ?? null,
        p_tax_paise: p.tax ?? null,
      });
      log(ctx, "info", "payment captured", { order_id: p.order_id, outcome });
      if (outcome === "needs_refund") await refundLatePayment(ctx, p);
      return;
    }
    case "payment.failed": {
      const p = event.payload.payment!.entity;
      await db.from("payments").update({ status: "failed" }).eq("razorpay_order_id", p.order_id).eq("status", "created");
      return;
    }
    case "refund.processed":
    case "refund.failed": {
      const r = event.payload.refund!.entity;
      await db
        .from("refunds")
        .update({ status: event.event === "refund.processed" ? "processed" : "failed" })
        .eq("razorpay_refund_id", r.id);
      return;
    }
    default:
      log(ctx, "info", "webhook ignored", { event: event.event });
  }
}

async function refundLatePayment(ctx: Ctx, p: PaymentEntity): Promise<void> {
  const db = service();
  const { data: payment, error } = await db
    .from("payments")
    .select("id, psychologist_id, amount_paise, refunded_paise")
    .eq("razorpay_order_id", p.order_id)
    .single();
  if (error) throw error;
  const remaining = payment.amount_paise - payment.refunded_paise;
  if (remaining <= 0) return;

  const refund = await refundPayment(p.id, remaining, { reason: "slot_unavailable_after_late_payment" });
  await db.from("refunds").insert({
    psychologist_id: payment.psychologist_id,
    payment_id: payment.id,
    amount_paise: remaining,
    reason: "Slot was taken before payment completed",
    razorpay_refund_id: refund.id,
  });
  await db
    .from("payments")
    .update({ refunded_paise: payment.amount_paise, status: "refunded" })
    .eq("id", payment.id);
  log(ctx, "warn", "late payment refunded", { payment_id: payment.id });
}
