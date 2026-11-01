import { describe, expect, it } from "vitest";
import { availabilityRuleSchema, bookingRequestSchema, fieldErrors, slugSchema } from "../schemas";

describe("schemas", () => {
  it("validates slugs like the database does", () => {
    expect(slugSchema.parse(" Anitha-R ")).toBe("anitha-r");
    expect(slugSchema.safeParse("admin").success).toBe(false);
    expect(slugSchema.safeParse("-bad").success).toBe(false);
  });

  it("requires terms acceptance and a valid email for bookings", () => {
    const r = bookingRequestSchema.safeParse({
      slug: "anitha",
      session_type_id: "8b1c2a8e-6f9e-4a8a-9f4a-2b7e1c3d4e5f",
      starts_at: "2026-11-04T10:00:00+05:30",
      full_name: "Divya",
      email: "nope",
      accept_terms: false,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = fieldErrors(r.error);
      expect(f.email).toBe("Enter a valid email.");
      expect(f.accept_terms).toBe("Please accept the terms to book.");
    }
  });

  it("rejects availability that ends before it starts", () => {
    expect(availabilityRuleSchema.safeParse({ weekday: 1, start_time: "18:00", end_time: "09:00" }).success).toBe(false);
  });
});
