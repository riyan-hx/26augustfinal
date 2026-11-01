// Minimal Razorpay REST client (orders, refunds). Keys come from env only.

import { ApiError } from "../../../LumidDashboard/src/lib/errors.ts";
import { requireEnv } from "./http.ts";

const BASE = "https://api.razorpay.com/v1";

function authHeader(): string {
  return `Basic ${btoa(`${requireEnv("RAZORPAY_KEY_ID")}:${requireEnv("RAZORPAY_KEY_SECRET")}`)}`;
}

async function call<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError("INTEGRATION_UNAVAILABLE");
  }
  if (!response.ok) {
    throw new ApiError(response.status >= 500 ? "INTEGRATION_UNAVAILABLE" : "INTERNAL");
  }
  return (await response.json()) as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

export function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  return call<RazorpayOrder>("/orders", { amount: amountPaise, currency: "INR", receipt, notes });
}

export function refundPayment(paymentId: string, amountPaise: number, notes: Record<string, string>) {
  return call<{ id: string; status: string }>(`/payments/${paymentId}/refund`, {
    amount: amountPaise,
    speed: "normal",
    notes,
  });
}

export const publicKeyId = () => requireEnv("RAZORPAY_KEY_ID");
