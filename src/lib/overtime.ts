import { CalculatedEntry, PaySettings, TimeEntry } from "../types/models";
import { addLocalDays } from "./dates";

const MINUTES_PER_DAY = 24 * 60;
export const WEEKDAY_BASE_HOURS = 8;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Company overtime rules:
 * Mon-Fri: before 07:00 = OT; 07:00-15:00 = straight; after 15:00 = OT.
 * Sat/Sun: all OT.
 *
 * Break time is removed from the shift before classification. For V1, the
 * unpaid break is removed from the end of the shift. A later version can
 * support a specific break start/end time.
 */
export function calculateEntry(
  entry: TimeEntry,
  hourlyRate: number,
  overtimeMultiplier = 1.5,
  weekdayBaseHoursEnabled = false
): CalculatedEntry {
  const start = toMinutes(entry.clockIn);
  let end = toMinutes(entry.clockOut);
  if (end <= start) end += MINUTES_PER_DAY;

  const totalMinutes = Math.max(0, end - start - entry.breakMinutes);
  let regularMinutes = 0;
  let overtimeMinutes = 0;

  // Walk minute-by-minute. This makes boundary behavior exact and easy to test.
  // Performance is trivial for a single workday.
  for (let i = 0; i < totalMinutes; i++) {
    const absoluteMinute = start + i;
    const dayOffset = Math.floor(absoluteMinute / MINUTES_PER_DAY);
    const minuteOfDay = ((absoluteMinute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

    // Date is kept for display; weekday is derived from the entry date.
    // For a normal same-day shift, this is the entry's weekday. Overnight
    // shifts are treated using the starting day's rule in V1.
    const date = new Date(`${entry.date}T00:00:00`);
    const weekday = date.getDay(); // 0 Sunday, 6 Saturday

    const isWeekend = weekday === 0 || weekday === 6;
    const isStraight = !isWeekend && minuteOfDay >= 7 * 60 && minuteOfDay < 15 * 60;

    if (isStraight) regularMinutes++;
    else overtimeMinutes++;
  }

  // In weekday-base mode, straight time is supplied once per Mon-Fri period
  // date below. Individual entries contribute only their overtime portion.
  const regularHours = weekdayBaseHoursEnabled ? 0 : round(regularMinutes / 60);
  const overtimeHours = round(overtimeMinutes / 60);
  const paidHours = weekdayBaseHoursEnabled
    ? overtimeHours
    : round((regularMinutes + overtimeMinutes) / 60);
  const regularPay = round(regularHours * hourlyRate);
  const overtimePay = round(overtimeHours * hourlyRate * overtimeMultiplier);

  return {
    ...entry,
    regularHours,
    overtimeHours,
    paidHours,
    regularPay,
    overtimePay,
    totalPay: round(regularPay + overtimePay),
  };
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(2)} hrs`;
}

export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function getPayPeriodDates(startDate: string): string[] {
  return Array.from({ length: 14 }, (_, i) => addLocalDays(startDate, i));
}

export function isWeekdayDate(date: string): boolean {
  const weekday = new Date(`${date}T00:00:00`).getDay();
  return weekday >= 1 && weekday <= 5;
}

export function getWeekdayBaseDates(startDate: string): string[] {
  return getPayPeriodDates(startDate).filter(isWeekdayDate);
}

export function calculatePayPeriodTotals(
  entries: TimeEntry[],
  settings: PaySettings
): {
  regularHours: number;
  overtimeHours: number;
  paidHours: number;
  estimatedGrossPay: number;
} {
  const periodDates = new Set(getPayPeriodDates(settings.periodStart));
  const weekdayBaseHours = settings.weekdayBaseHoursEnabled
    ? getWeekdayBaseDates(settings.periodStart).length * WEEKDAY_BASE_HOURS
    : 0;
  return entries
    .filter(entry => periodDates.has(entry.date))
    .map(entry =>
      calculateEntry(
        entry,
        settings.hourlyRate,
        settings.overtimeMultiplier,
        settings.weekdayBaseHoursEnabled
      )
    )
    .reduce(
      (totals, entry) => ({
        regularHours: totals.regularHours + entry.regularHours,
        overtimeHours: totals.overtimeHours + entry.overtimeHours,
        paidHours: totals.paidHours + entry.paidHours,
        estimatedGrossPay: totals.estimatedGrossPay + entry.totalPay,
      }),
      {
        regularHours: weekdayBaseHours,
        overtimeHours: 0,
        paidHours: weekdayBaseHours,
        estimatedGrossPay: weekdayBaseHours * settings.hourlyRate,
      }
    );
}

export function dateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
