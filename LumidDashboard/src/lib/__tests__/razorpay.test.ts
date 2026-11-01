import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  newManageToken,
  sha256Hex,
  timingSafeEqual,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../../../../supabase/functions/_shared/razorpay";

describe("razorpay signatures", () => {
  const secret = "whsec_test";
  const body = '{"event":"payment.captured"}';
  const good = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a valid webhook signature and rejects tampering", async () => {
    expect(await verifyWebhookSignature(body, good, secret)).toBe(true);
    expect(await verifyWebhookSignature(body + " ", good, secret)).toBe(false);
    expect(await verifyWebhookSignature(body, null, secret)).toBe(false);
  });

  it("verifies checkout signatures (order_id|payment_id)", async () => {
    const sig = createHmac("sha256", "key_secret").update("order_1|pay_1").digest("hex");
    expect(await verifyPaymentSignature("order_1", "pay_1", sig, "key_secret")).toBe(true);
    expect(await verifyPaymentSignature("order_1", "pay_2", sig, "key_secret")).toBe(false);
  });

  it("compares in constant time and handles length mismatch", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "ab")).toBe(false);
  });

  it("creates unguessable manage tokens and hashes them", async () => {
    const t = newManageToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newManageToken()).not.toBe(t);
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
