// Idempotency-Key support: the first response for (scope, key) is stored and
// replayed for retries. A different body under the same key is rejected.

import { apiError, type Ctx } from "./http.ts";
import { sha256Hex } from "./razorpay.ts";
import { service } from "./supabase.ts";

export interface StoredResponse {
  status: number;
  body: unknown;
}

export async function withIdempotency(
  ctx: Ctx,
  scope: string,
  rawBody: string,
  run: () => Promise<StoredResponse>,
): Promise<StoredResponse> {
  const key = ctx.req.headers.get("idempotency-key");
  if (!key || !/^[A-Za-z0-9-]{8,80}$/.test(key)) {
    throw apiError("VALIDATION_FAILED", "Missing Idempotency-Key header.");
  }
  const requestHash = await sha256Hex(rawBody);
  const db = service();

  const { data: existing } = await db
    .from("idempotency_keys")
    .select("request_sha256, response_status, response_body")
    .eq("scope", scope)
    .eq("key", key)
    .maybeSingle();

  if (existing) {
    if (existing.request_sha256 !== requestHash) {
      throw apiError("VALIDATION_FAILED", "This request key was already used for different details.");
    }
    if (existing.response_status) {
      return { status: existing.response_status, body: existing.response_body };
    }
    throw apiError("RATE_LIMITED", "This request is still being processed.");
  }

  const { error: claimError } = await db
    .from("idempotency_keys")
    .insert({ scope, key, request_sha256: requestHash });
  if (claimError) throw apiError("RATE_LIMITED", "This request is still being processed.");

  try {
    const result = await run();
    await db
      .from("idempotency_keys")
      .update({ response_status: result.status, response_body: result.body })
      .eq("scope", scope)
      .eq("key", key);
    return result;
  } catch (error) {
    // Let the client retry with the same key after a failure.
    await db.from("idempotency_keys").delete().eq("scope", scope).eq("key", key);
    throw error;
  }
}
