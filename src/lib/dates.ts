export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addLocalDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function utcDayNumber(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function weekdayDateLabel(dateString: string): string {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function getPayPeriodProgress(
  periodStart: string,
  today = localDateString()
): {
  day: number;
  totalDays: 14;
  fraction: number;
  weekday: string;
} {
  const rawDay = utcDayNumber(today) - utcDayNumber(periodStart) + 1;
  const day = Math.min(14, Math.max(1, Number.isFinite(rawDay) ? rawDay : 1));
  const correlatedDate = addLocalDays(periodStart, day - 1);
  const weekday = new Date(`${correlatedDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });

  return { day, totalDays: 14, fraction: day / 14, weekday };
}
