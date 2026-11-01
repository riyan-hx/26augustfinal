import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../api";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("api client", () => {
  it("unwraps { data }", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { data: { ok: 1 } }));
    const api = createApiClient({ baseUrl: "https://x", fetchImpl, retryBaseMs: 0 });
    await expect(api.get("/a")).resolves.toEqual({ ok: 1 });
  });

  it("throws contract errors without retrying 4xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json(409, { error: { code: "SLOT_UNAVAILABLE", message: "Taken", request_id: "req_1" } }),
    );
    const api = createApiClient({ baseUrl: "https://x", fetchImpl, retryBaseMs: 0 });
    await expect(api.post("/b", {})).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE", requestId: "req_1" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx and network errors with the same idempotency key", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(json(503, { error: { code: "INTEGRATION_UNAVAILABLE" } }))
      .mockResolvedValueOnce(json(200, { data: "done" }));
    const api = createApiClient({ baseUrl: "https://x", fetchImpl, retryBaseMs: 0 });
    await expect(api.post("/c", { a: 1 }, { idempotencyKey: "k-1" })).resolves.toBe("done");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const keys = fetchImpl.mock.calls.map((c) => (c[1] as RequestInit & { headers: Record<string, string> }).headers["Idempotency-Key"]);
    expect(new Set(keys)).toEqual(new Set(["k-1"]));
  });

  it("gives up after max retries with NETWORK", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("offline"));
    const api = createApiClient({ baseUrl: "https://x", fetchImpl, retryBaseMs: 0, maxRetries: 1 });
    await expect(api.get("/d")).rejects.toMatchObject({ code: "NETWORK" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
