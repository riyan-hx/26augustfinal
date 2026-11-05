// The single error contract (BLUEPRINT.md §12). Everything that can fail —
// PostgREST, RPC, Edge Functions, the network — becomes an ApiError with a code.
// Screens map codes to copy; they never show raw server text.

export const ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "CUTOFF_PASSED",
  "NOT_FOUND",
  "SLOT_UNAVAILABLE",
  "INVALID_TRANSITION",
  "VERSION_CONFLICT",
  "PUBLISH_REQUIREMENTS",
  "HOLD_EXPIRED",
  "INVALID_SIGNATURE",
  "RATE_LIMITED",
  "INTEGRATION_UNAVAILABLE",
  "NETWORK",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  CUTOFF_PASSED: 403,
  NOT_FOUND: 404,
  SLOT_UNAVAILABLE: 409,
  INVALID_TRANSITION: 409,
  VERSION_CONFLICT: 409,
  PUBLISH_REQUIREMENTS: 422,
  HOLD_EXPIRED: 410,
  INVALID_SIGNATURE: 400,
  RATE_LIMITED: 429,
  INTEGRATION_UNAVAILABLE: 503,
  NETWORK: 0,
  INTERNAL: 500,
};

/** Plain-language copy for each code. Screens may override per context. */
export const ERROR_COPY: Record<ErrorCode, string> = {
  VALIDATION_FAILED: "Some details need fixing.",
  UNAUTHENTICATED: "You've been signed out. Sign in to continue.",
  FORBIDDEN: "You don't have access to this.",
  CUTOFF_PASSED: "It's too close to the session to change it here.",
  NOT_FOUND: "We couldn't find that.",
  SLOT_UNAVAILABLE: "That time was just booked. Pick another.",
  INVALID_TRANSITION: "This booking has already changed. Refresh to see the latest.",
  VERSION_CONFLICT: "This changed in another tab. Reload to see the latest.",
  PUBLISH_REQUIREMENTS: "Finish setup before publishing your page.",
  HOLD_EXPIRED: "Your hold ended. Pick the time again to continue.",
  INVALID_SIGNATURE: "We couldn't verify that payment. You weren't charged twice.",
  RATE_LIMITED: "Too many attempts. Try again in a minute.",
  INTEGRATION_UNAVAILABLE: "A connected service isn't responding. Try again shortly.",
  NETWORK: "Couldn't connect. Check your connection and retry.",
  INTERNAL: "Something went wrong on our side. Try again.",
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields: Record<string, string> | undefined;
  readonly requestId: string | undefined;
  /** Server-provided detail, safe to show (written for users in SQL/Edge Functions). */
  readonly detail: string | undefined;

  constructor(
    code: ErrorCode,
    options: { detail?: string; fields?: Record<string, string>; requestId?: string; status?: number } = {},
  ) {
    super(options.detail ?? ERROR_COPY[code]);
    this.name = "ApiError";
    this.code = code;
    this.status = options.status ?? STATUS_BY_CODE[code];
    this.fields = options.fields;
    this.requestId = options.requestId;
    this.detail = options.detail;
  }

  get userMessage(): string {
    return this.detail ?? ERROR_COPY[this.code];
  }

  /** Worth retrying automatically (transient). */
  get retryable(): boolean {
    return this.code === "NETWORK" || this.code === "INTEGRATION_UNAVAILABLE" || this.status >= 500;
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/** Maps a supabase-js / PostgREST error into the contract. */
export function fromPostgrestError(error: PostgrestLikeError, status?: number): ApiError {
  const pgCode = error.code ?? "";
  const message = error.message ?? "";

  // Raised by our SQL functions: message = API code, details = user copy.
  if (pgCode === "P0001" && isErrorCode(message)) {
    return new ApiError(message, { detail: error.details ?? undefined });
  }

  switch (pgCode) {
    case "23P01": // exclusion violation (double booking)
      return new ApiError("SLOT_UNAVAILABLE");
    case "23505": // unique violation
      return new ApiError("VALIDATION_FAILED", { detail: "That already exists." });
    case "23514": // check violation
    case "23502": // not null
    case "22P02": // invalid input syntax
    case "22001": // value too long
      return new ApiError("VALIDATION_FAILED");
    case "42501": // insufficient privilege / RLS
      return new ApiError("FORBIDDEN");
    case "PGRST116": // no rows for .single()
      return new ApiError("NOT_FOUND");
    case "PGRST301":
    case "PGRST302":
      return new ApiError("UNAUTHENTICATED");
  }

  if (status === 401) return new ApiError("UNAUTHENTICATED");
  if (status === 429) return new ApiError("RATE_LIMITED");
  return new ApiError("INTERNAL");
}

/** Normalises anything thrown into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof TypeError) return new ApiError("NETWORK"); // fetch network failures
  // supabase-js reports an unreachable server as a value, not a TypeError:
  // auth as AuthRetryableFetchError (status 0), PostgREST as message "TypeError: Failed to fetch".
  if (typeof error === "object" && error !== null) {
    const e = error as { name?: unknown; status?: unknown; message?: unknown };
    if (e.name === "AuthRetryableFetchError" && (e.status === 0 || e.status === undefined)) return new ApiError("NETWORK");
    if (typeof e.message === "string" && /^(TypeError: )?(Failed to fetch|NetworkError|Load failed|fetch failed)/.test(e.message)) return new ApiError("NETWORK");
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    return fromPostgrestError(error as PostgrestLikeError);
  }
  return new ApiError("INTERNAL");
}
