// HTTP plumbing shared by all Edge Functions: envelope, request id, CORS,
// error mapping and logging without personal data.

import { ApiError, fromPostgrestError, type ErrorCode } from "../../../LumidDashboard/src/lib/errors.ts";

export { ApiError };

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((o) => o.trim()).filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.lumidai\.in$/.test(origin) ? origin : allowedOrigins[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, idempotency-key, x-request-id",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Expose-Headers": "x-request-id",
    Vary: "Origin",
  };
}

export interface Ctx {
  req: Request;
  requestId: string;
  url: URL;
  ip: string;
}

export function json(ctx: Ctx, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(ctx.req), "content-type": "application/json", "x-request-id": ctx.requestId },
  });
}

export const ok = (ctx: Ctx, data: unknown, status = 200) => json(ctx, status, { data });

export function fail(ctx: Ctx, error: ApiError): Response {
  return json(ctx, error.status || 500, {
    error: { code: error.code, message: error.userMessage, fields: error.fields, request_id: ctx.requestId },
  });
}

export function apiError(code: ErrorCode, detail?: string, fields?: Record<string, string>): ApiError {
  return new ApiError(code, { detail, fields });
}

/** Structured log line. Never pass names, emails, phone numbers or note text. */
export function log(ctx: Pick<Ctx, "requestId">, level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown> = {}) {
  console[level](JSON.stringify({ level, msg, request_id: ctx.requestId, ...extra }));
}

/** Wraps a handler with CORS preflight, request id and error mapping. */
export function serve(handler: (ctx: Ctx) => Promise<Response>) {
  Deno.serve(async (req) => {
    const ctx: Ctx = {
      req,
      url: new URL(req.url),
      requestId: req.headers.get("x-request-id") ?? `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown",
    };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    try {
      return await handler(ctx);
    } catch (cause) {
      const error =
        cause instanceof ApiError
          ? cause
          : typeof cause === "object" && cause !== null && "code" in cause
            ? fromPostgrestError(cause as { code?: string; message?: string; details?: string })
            : new ApiError("INTERNAL");
      if (error.code === "INTERNAL") {
        log(ctx, "error", "unhandled", { error: cause instanceof Error ? cause.message : String(cause) });
      }
      return fail(ctx, error);
    }
  });
}

export async function readJson(ctx: Ctx, maxBytes = 16_384): Promise<unknown> {
  const text = await ctx.req.text();
  if (text.length > maxBytes) throw apiError("VALIDATION_FAILED", "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw apiError("VALIDATION_FAILED", "Request body must be JSON.");
  }
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new ApiError("INTERNAL", { detail: undefined });
  return value;
}
