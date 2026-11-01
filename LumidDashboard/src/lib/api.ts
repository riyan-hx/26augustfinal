// Client for Lumid Edge Functions. Speaks the { data } / { error } envelope,
// retries transient failures, and attaches Idempotency-Key to mutating calls.

import { ApiError, isErrorCode } from "./errors";

export interface ApiClientOptions {
  baseUrl: string; // e.g. https://<project>.supabase.co/functions/v1
  getAccessToken?: () => Promise<string | null>;
  anonKey?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryBaseMs?: number;
}

export interface RequestOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

type Method = "GET" | "POST" | "DELETE";

interface ErrorEnvelope {
  error?: { code?: unknown; message?: unknown; fields?: unknown; request_id?: unknown };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRetries = options.maxRetries ?? 2;
  const retryBaseMs = options.retryBaseMs ?? 400;

  async function request<T>(method: Method, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (options.anonKey) headers.apikey = options.anonKey;
    const token = (await options.getAccessToken?.()) ?? options.anonKey;
    if (token) headers.Authorization = `Bearer ${token}`;
    if (method !== "GET") headers["Idempotency-Key"] = opts.idempotencyKey ?? newIdempotencyKey();

    let attempt = 0;
    for (;;) {
      let response: Response;
      try {
        response = await fetchImpl(`${options.baseUrl}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: opts.signal,
        });
      } catch (cause) {
        if (opts.signal?.aborted) throw cause;
        if (attempt < maxRetries) {
          await sleep(retryBaseMs * 2 ** attempt++);
          continue;
        }
        throw new ApiError("NETWORK");
      }

      if (response.ok) {
        const json = (await response.json().catch(() => ({}))) as { data?: T };
        return json.data as T;
      }

      const error = await parseError(response);
      // Same Idempotency-Key on retry, so retrying a POST is safe.
      if (error.retryable && attempt < maxRetries) {
        await sleep(retryBaseMs * 2 ** attempt++);
        continue;
      }
      throw error;
    }
  }

  return {
    get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, undefined, opts),
    post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, body ?? {}, opts),
    delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, undefined, opts),
  };
}

async function parseError(response: Response): Promise<ApiError> {
  const requestId = response.headers.get("x-request-id") ?? undefined;
  let envelope: ErrorEnvelope = {};
  try {
    envelope = (await response.json()) as ErrorEnvelope;
  } catch {
    // non-JSON error body (gateway/proxy)
  }
  const e = envelope.error;
  if (e && isErrorCode(e.code)) {
    return new ApiError(e.code, {
      detail: typeof e.message === "string" ? e.message : undefined,
      fields: isStringRecord(e.fields) ? e.fields : undefined,
      requestId: typeof e.request_id === "string" ? e.request_id : requestId,
      status: response.status,
    });
  }
  if (response.status === 401) return new ApiError("UNAUTHENTICATED", { requestId });
  if (response.status === 429) return new ApiError("RATE_LIMITED", { requestId });
  if (response.status >= 500) return new ApiError("INTERNAL", { requestId, status: response.status });
  return new ApiError("INTERNAL", { requestId, status: response.status });
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value as Record<string, unknown>).every((v) => typeof v === "string")
  );
}
