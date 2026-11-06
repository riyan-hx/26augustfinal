import { describe, expect, it } from "vitest";
import { getSummary, listPayments } from "../api";
import { demoBookings } from "../../demo/fixtures";
import { localDayBounds } from "../../../lib/dates";

describe("demo earnings", () => {
  it("derives today's total from today's paid demo bookings", async () => {
    const { start, end } = localDayBounds(new Date());
    const expected = demoBookings
      .filter((b) => b.paymentStatus === "captured" && b.startsAt >= start && b.startsAt < end)
      .reduce((s, b) => s + b.pricePaise, 0);
    const today = await getSummary(start, end);
    expect(today.netPaise).toBe(expected);
    expect(today.feesPaise).toBe(0);
  });

  it("lists paid and refunded bookings as payments, newest first", async () => {
    const rows = await listPayments(10_000);
    expect(rows.length).toBe(demoBookings.filter((b) => ["captured", "refunded", "partially_refunded"].includes(b.paymentStatus ?? "")).length);
    const times = rows.map((r) => r.capturedAt!.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(rows.find((r) => r.status === "refunded")?.refundedPaise).toBeGreaterThan(0);
  });
});
