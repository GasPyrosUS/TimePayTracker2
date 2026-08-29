export function formatTime12h(time24: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
  if (!match) return time24;

  let hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return time24;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function parseTimeInput(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ").toUpperCase();

  // Accept existing 24-hour input such as 07:00 or 15:30.
  const twentyFourHour = /^(\d{1,2}):(\d{2})$/.exec(normalized);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  // Accept standard time such as 7:00 AM, 07:00 AM, or 3:30PM.
  const twelveHour = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(normalized);
  if (!twelveHour) return null;

  let hour = Number(twelveHour[1]);
  const minute = Number(twelveHour[2]);
  const suffix = twelveHour[3];

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  if (suffix == "AM") {
    if (hour == 12) hour = 0;
  } else if (hour != 12) {
    hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
