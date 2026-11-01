import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ApiError, fromPostgrestError } from "../../../LumidDashboard/src/lib/errors.ts";
import { requireEnv } from "./http.ts";

let serviceClient: SupabaseClient | null = null;

/** Service-role client. Only ever used inside Edge Functions. */
export function service(): SupabaseClient {
  serviceClient ??= createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

/** Calls an RPC and throws contract errors. */
export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await service().rpc(fn, args);
  if (error) throw fromPostgrestError(error);
  return data as T;
}

/** Fixed-window limit; throws RATE_LIMITED when exceeded. */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<void> {
  const allowed = await rpc<boolean>("check_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (!allowed) throw new ApiError("RATE_LIMITED");
}
