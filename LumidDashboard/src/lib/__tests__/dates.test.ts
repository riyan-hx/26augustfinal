import { describe, expect, it } from "vitest";
import { formatCountdown, formatTime, localDateKey, localDayBounds, parseTstzRange, toTstzRange } from "../dates";

describe("dates", () => {
  it("parses PostgREST tstzrange output", () => {
    const r = parseTstzRange('["2026-11-04 04:30:00+00","2026-11-04 05:20:00+00")');
    expect(r.start.toISOString()).toBe("2026-11-04T04:30:00.000Z");
    expect(r.end.toISOString()).toBe("2026-11-04T05:20:00.000Z");
  });

  it("round-trips a range literal", () => {
    const s = toTstzRange({ start: new Date("2026-11-04T04:30:00Z"), end: new Date("2026-11-04T05:20:00Z") });
    expect(s).toBe("[2026-11-04T04:30:00.000Z,2026-11-04T05:20:00.000Z)");
    expect(() => toTstzRange({ start: new Date(2), end: new Date(1) })).toThrow();
  });

  it("shows times in IST", () => {
    expect(formatTime(new Date("2026-11-04T04:30:00Z"))).toBe("10:00 AM");
  });

  it("computes the local IST day", () => {
    // 20:00 UTC on the 3rd is 01:30 IST on the 4th
    expect(localDateKey(new Date("2026-11-03T20:00:00Z"))).toBe("2026-11-04");
    const { start, end } = localDayBounds(new Date("2026-11-04T06:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-03T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-11-04T18:30:00.000Z");
  });

  it("formats the hold countdown and clamps at zero", () => {
    const now = new Date("2026-11-04T00:00:00Z");
    expect(formatCountdown(new Date("2026-11-04T00:09:45Z"), now)).toBe("9:45");
    expect(formatCountdown(new Date("2026-11-03T23:59:00Z"), now)).toBe("0:00");
  });
});
