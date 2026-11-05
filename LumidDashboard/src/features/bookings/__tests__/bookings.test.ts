import { describe, expect, it } from "vitest";
import { sortForList } from "../sort";
import { createBooking, listBookings, rescheduleBooking } from "../api";
import { demoBookings, demoSessionTypes } from "../../demo/fixtures";
import { ApiError } from "../../../lib/errors";

const H = 3_600_000;
const b = (id: string, startOffsetH: number, lenH = 1) => {
  const startsAt = new Date(Date.UTC(2026, 10, 4, 10) + startOffsetH * H);
  return { id, startsAt, endsAt: new Date(startsAt.getTime() + lenH * H) };
};

describe("sortForList", () => {
  it("puts the next upcoming sessions first, then past ones most recent first", () => {
    const now = Date.UTC(2026, 10, 4, 10, 30); // b('now') is in progress
    const list = [b("past-old", -48), b("later", 72), b("past-recent", -3), b("now", 0), b("soon", 2)];
    expect(sortForList(list, now).map((x) => x.id)).toEqual(["now", "soon", "later", "past-recent", "past-old"]);
  });
});

describe("demo bookings api", () => {
  it("filters by status on the 'server' and returns oldest first", async () => {
    const awaiting = await listBookings({ status: "pending_payment" });
    expect(awaiting.length).toBeGreaterThan(0);
    expect(awaiting.every((x) => x.status === "pending_payment")).toBe(true);
    const all = await listBookings();
    const times = all.map((x) => x.startsAt.getTime());
    expect(times).toEqual([...times].sort((a, c) => a - c));
  });

  it("refuses to double-book a slot that is already taken", async () => {
    const taken = demoBookings.find((x) => x.status === "confirmed" && x.startsAt.getTime() > Date.now())!;
    const err = await createBooking({
      patient: { id: taken.patientId === "1" ? "2" : "1" },
      sessionTypeId: demoSessionTypes[0]!.id,
      startsAt: new Date(taken.startsAt.getTime() + 10 * 60_000),
      paid: false,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("SLOT_UNAVAILABLE");
  });

  it("refuses to move a session onto another booking but allows a free time", async () => {
    const future = demoBookings
      .filter((x) => (x.status === "confirmed" || x.status === "pending_payment") && x.startsAt.getTime() > Date.now())
      .sort((a, c) => a.startsAt.getTime() - c.startsAt.getTime());
    const [first, second] = future as [typeof future[number], typeof future[number]];
    const err = await rescheduleBooking(first.id, second.startsAt).catch((e: unknown) => e);
    expect((err as ApiError).code).toBe("SLOT_UNAVAILABLE");

    const free = new Date(Date.now() + 40 * 24 * H);
    await rescheduleBooking(first.id, free);
    expect(demoBookings.find((x) => x.id === first.id)!.startsAt.getTime()).toBe(free.getTime());
  });
});
