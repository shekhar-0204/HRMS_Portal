import { prisma } from "./db";
import { addDays } from "./time";
import { fromDateOnly, toDateOnly } from "./dates";

/** Working days = Mon-Fri minus non-optional company holidays, as YYYY-MM-DD strings. */
export async function listWorkingDays(start: string, end: string): Promise<string[]> {
  const holidays = await prisma.holiday.findMany({
    where: { isOptional: false, date: { gte: fromDateOnly(start)!, lte: fromDateOnly(end)! } },
    select: { date: true },
  });
  const off = new Set(holidays.map((h) => toDateOnly(h.date)));
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const dow = new Date(`${d}T00:00:00.000Z`).getUTCDay();
    if (dow !== 0 && dow !== 6 && !off.has(d)) days.push(d);
  }
  return days;
}
