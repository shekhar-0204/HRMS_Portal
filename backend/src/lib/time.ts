/** Business timezone is Asia/Kolkata (UTC+05:30, no DST). Timestamps are stored in UTC and rendered in IST. */
const IST_MS = 330 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");
const shift = (d: Date) => new Date(d.getTime() + IST_MS);

export const todayIST = (): string => shift(new Date()).toISOString().slice(0, 10);

/** Calendar date (YYYY-MM-DD) of an instant in IST. Use for timestamps shown as dates; plain toISOString() gives the UTC date (off by one before 05:30 IST). */
export const dateIST = (d: Date): string => shift(d).toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "09:28 AM" (matches the frontend's display format). */
export function fmtTime(d?: Date | null): string | undefined {
  if (!d) return undefined;
  const s = shift(d);
  const h = s.getUTCHours();
  return `${pad(h % 12 || 12)}:${pad(s.getUTCMinutes())} ${h >= 12 ? "PM" : "AM"}`;
}

/** "2026-10-24 10:15 AM" */
export const fmtDateTime = (d?: Date | null): string | undefined =>
  d ? `${shift(d).toISOString().slice(0, 10)} ${fmtTime(d)}` : undefined;

/** Accepts "09:30 AM", "6:35 pm" or 24h "18:35". */
export function parseClock(s: string): { h: number; m: number } | null {
  const x = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(s.trim());
  if (!x) return null;
  let h = Number(x[1]);
  const m = Number(x[2]);
  const ap = x[3]?.toUpperCase();
  if (m > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ap === "PM" ? 12 : 0);
  } else if (h > 23) return null;
  return { h, m };
}

/** IST wall-clock on an IST calendar date -> UTC instant. */
export function istToUtc(date: string, clock: { h: number; m: number }): Date {
  return new Date(`${date}T${pad(clock.h)}:${pad(clock.m)}:00+05:30`);
}

export const minutesOfDayIST = (d: Date): number => {
  const s = shift(d);
  return s.getUTCHours() * 60 + s.getUTCMinutes();
};

/** "2026-10-24 10:15:32" (IST) - used by the audit log. */
export function fmtTimestamp(d: Date): string {
  const s = shift(d);
  return `${s.toISOString().slice(0, 10)} ${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}:${pad(s.getUTCSeconds())}`;
}

export const dayName = (date: string): string =>
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(`${date}T00:00:00.000Z`).getUTCDay()];

export const startOfMonthIST = (): string => todayIST().slice(0, 8) + "01";
