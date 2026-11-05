import { describe, expect, it } from "vitest";
import { ApiError, fromPostgrestError, toApiError } from "../errors";

describe("errors", () => {
  it("maps SQL function errors by code and keeps the user detail", () => {
    const e = fromPostgrestError({ code: "P0001", message: "SLOT_UNAVAILABLE", details: "That time was just booked." });
    expect(e.code).toBe("SLOT_UNAVAILABLE");
    expect(e.status).toBe(409);
    expect(e.userMessage).toBe("That time was just booked.");
  });

  it("maps Postgres constraint and permission errors", () => {
    expect(fromPostgrestError({ code: "23P01" }).code).toBe("SLOT_UNAVAILABLE");
    expect(fromPostgrestError({ code: "23514" }).code).toBe("VALIDATION_FAILED");
    expect(fromPostgrestError({ code: "42501" }).code).toBe("FORBIDDEN");
    expect(fromPostgrestError({ code: "PGRST116" }).code).toBe("NOT_FOUND");
  });

  it("never exposes unknown server text", () => {
    const e = fromPostgrestError({ code: "XX000", message: "relation secret_table does not exist" });
    expect(e.code).toBe("INTERNAL");
    expect(e.userMessage).not.toContain("secret_table");
  });

  it("treats fetch TypeErrors as network errors and marks them retryable", () => {
    const e = toApiError(new TypeError("Failed to fetch"));
    expect(e.code).toBe("NETWORK");
    expect(e.retryable).toBe(true);
    expect(new ApiError("SLOT_UNAVAILABLE").retryable).toBe(false);
  });
  it("treats supabase-js network failures as NETWORK", () => {
    expect(toApiError({ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" }).code).toBe("NETWORK");
    expect(toApiError({ message: "TypeError: Failed to fetch", code: "", details: "" }).code).toBe("NETWORK");
    expect(toApiError({ code: "P0001", message: "SLOT_UNAVAILABLE" }).code).toBe("SLOT_UNAVAILABLE");
  });
});
