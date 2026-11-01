// Times are UTC in the database and shown in the practice timezone (default IST).

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Parses a Postgres tstzrange as returned by PostgREST, e.g.
 * ["2026-11-04 04:30:00+00","2026-11-04 05:20:00+00")
 */
export function parseTstzRange(value: string): TimeRange {
  const match = /^[[(]"?([^",]+)"?,"?([^",]+)"?[)\]]$/.exec(value.trim());
  if (!match?.[1] || !match[2]) throw new Error(`Invalid tstzrange: ${value}`);
  const start = new Date(match[1].replace(" ", "T").replace(/\+00$/, "Z"));
  const end = new Date(match[2].replace(" ", "T").replace(/\+00$/, "Z"));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid tstzrange: ${value}`);
  }
  return { start, end };
}

/** Serialises a range as a half-open tstzrange literal for PostgREST writes. */
export function toTstzRange({ start, end }: TimeRange): string {
  if (end <= start) throw new RangeError("Range end must be after start");
  return `[${start.toISOString()},${end.toISOString()})`;
}

export function formatTime(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone, hour: "numeric", minute: "2-digit", hour12: true })
    .format(date)
    .toUpperCase();
}

export function formatDay(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(date);
}

export function formatDateTime(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return `${formatDay(date, timeZone)} · ${formatTime(date, timeZone)}`;
}

/** YYYY-MM-DD of `date` as seen in `timeZone`. */
export function localDateKey(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Start and end (exclusive) of the local day containing `date`, as UTC instants. */
export function localDayBounds(date: Date, timeZone = DEFAULT_TIMEZONE): TimeRange {
  const key = localDateKey(date, timeZone);
  const start = zonedMidnight(key, timeZone);
  const next = new Date(start.getTime() + 36 * 3_600_000); // safely inside the next day
  return { start, end: zonedMidnight(localDateKey(next, timeZone), timeZone) };
}

function zonedMidnight(dateKey: string, timeZone: string): Date {
  const utcGuess = new Date(`${dateKey}T00:00:00Z`);
  const offsetMinutes = timezoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

function timezoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

export function minutesUntil(target: Date, now = new Date()): number {
  return Math.ceil((target.getTime() - now.getTime()) / 60_000);
}

/** "9:45" countdown for the hold timer; "0:00" once expired. */
export function formatCountdown(target: Date, now = new Date()): string {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
