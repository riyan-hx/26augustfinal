import { describe, expect, it } from "vitest";
import { initials, relativeDateTime, relativeDaysAgo } from "../format";

// 2026-11-04 00:30 IST = 2026-11-03T19:00:00Z
const ist = (iso: string) => new Date(`${iso}+05:30`);

describe("relativeDaysAgo", () => {
  it("counts IST calendar days, not 24h periods", () => {
    const now = ist("2026-11-04T00:30:00");
    // 11:30 PM the previous IST day is only one hour earlier, but it was yesterday.
    expect(relativeDaysAgo(ist("2026-11-03T23:30:00"), now)).toBe("Yesterday");
    expect(relativeDaysAgo(ist("2026-11-04T00:05:00"), now)).toBe("Today");
  });

  it("treats late yesterday as yesterday even near midnight UTC", () => {
    const now = ist("2026-11-04T23:50:00");
    expect(relativeDaysAgo(ist("2026-11-03T00:10:00"), now)).toBe("Yesterday");
    expect(relativeDaysAgo(ist("2026-11-02T23:59:00"), now)).toBe("2 days ago");
  });

  it("returns Today for future dates and a date beyond 30 days", () => {
    const now = ist("2026-11-04T10:00:00");
    expect(relativeDaysAgo(ist("2026-11-05T10:00:00"), now)).toBe("Today");
    expect(relativeDaysAgo(ist("2026-10-20T10:00:00"), now)).toBe("15 days ago");
    expect(relativeDaysAgo(ist("2026-09-01T10:00:00"), now)).toBe("Tue, 1 Sept");
  });

  it("works across month and year boundaries", () => {
    expect(relativeDaysAgo(ist("2026-12-31T22:00:00"), ist("2027-01-01T01:00:00"))).toBe("Yesterday");
    expect(relativeDaysAgo(ist("2026-02-28T09:00:00"), ist("2026-03-02T09:00:00"))).toBe("2 days ago");
  });
});

describe("relativeDateTime", () => {
  it("labels today, tomorrow and yesterday in IST", () => {
    const now = ist("2026-11-04T09:00:00");
    expect(relativeDateTime(ist("2026-11-04T17:00:00"), now)).toBe("Today, 5:00 PM");
    expect(relativeDateTime(ist("2026-11-05T10:00:00"), now)).toBe("Tomorrow, 10:00 AM");
    expect(relativeDateTime(ist("2026-11-03T23:30:00"), now)).toBe("Yesterday, 11:30 PM");
  });
});

describe("initials", () => {
  it("uses first and last name", () => {
    expect(initials("Dr. Anitha Menon")).toBe("AM");
    expect(initials("Divya")).toBe("D");
    expect(initials("")).toBe("?");
  });
});

describe('initials (honorifics)', () => {
  it('ignores an honorific', () => {
    expect(initials('Dr. Meera Krishnan')).toBe('MK')
    expect(initials('Dr Anitha Raghavan')).toBe('AR')
    expect(initials('Drishya Nair')).toBe('DN')
  })
})
