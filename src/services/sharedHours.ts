import { calculateEntry } from "../lib/overtime";
import type { TeamHoursRecord, TimeEntry } from "../types/models";

export const sharedFields = ["id", "teamId", "userId", "memberName", "date", "clockIn", "clockOut", "breakMinutes", "regularHours", "overtimeHours", "totalHours", "updatedAt", "notes"];

export function validShift(entry: Pick<TimeEntry, "date" | "clockIn" | "clockOut" | "breakMinutes">) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
  const date = new Date(`${entry.date}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== entry.date) return false;
  if (![entry.clockIn, entry.clockOut].every(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))) return false;
  const minute = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const span = (minute(entry.clockOut) - minute(entry.clockIn) + 1440) % 1440 || 1440;
  return Number.isInteger(entry.breakMinutes) && entry.breakMinutes >= 0 && entry.breakMinutes <= span;
}

export function projectHours(entry: TimeEntry, teamId: string, userId: string, memberName: string): TeamHoursRecord {
  if (!validShift(entry)) throw new Error(`Check the date, clock times or break in entry ${entry.id}. Local data was not changed.`);
  const hours = calculateEntry(entry, 0, 1.5);
  // Never spread entry/calculated objects. All structured pay fields stay local.
  return {
    id: `${userId}_${encodeURIComponent(entry.id)}`, teamId, userId, memberName,
    date: entry.date, clockIn: entry.clockIn, clockOut: entry.clockOut,
    breakMinutes: entry.breakMinutes, regularHours: hours.regularHours,
    overtimeHours: hours.overtimeHours, totalHours: hours.paidHours,
    updatedAt: new Date().toISOString(), notes: entry.notes ?? "",
  };
}

export function parseHours(value: Record<string, unknown>, id: string, teamId: string): TeamHoursRecord {
  if (Object.keys(value).some(key => !sharedFields.includes(key)) ||
      value.id !== id || value.teamId !== teamId ||
      ("notes" in value && typeof value.notes !== "string") ||
      !["id", "teamId", "userId", "memberName", "date", "clockIn", "clockOut", "updatedAt"].every(key => typeof value[key] === "string") ||
      !["breakMinutes", "regularHours", "overtimeHours", "totalHours"].every(key => typeof value[key] === "number" && Number.isFinite(value[key]) && Number(value[key]) >= 0)) {
    throw new Error("A shared record has an unexpected schema. Ask your administrator to check Firestore data and rules.");
  }
  const row = value as TeamHoursRecord;
  if (!validShift(row) || row.totalHours > 24 || row.regularHours > 24 || row.overtimeHours > 24) throw new Error("A shared record contains invalid hours.");
  return {
    id: row.id, teamId: row.teamId, userId: row.userId, memberName: row.memberName,
    date: row.date, clockIn: row.clockIn, clockOut: row.clockOut, breakMinutes: row.breakMinutes,
    regularHours: row.regularHours, overtimeHours: row.overtimeHours, totalHours: row.totalHours, updatedAt: row.updatedAt, notes: row.notes ?? "",
  };
}

// Manifest tracks only entries originating on this device; never replace an
// employee's entire cloud collection with one device's incomplete local list.
export function fingerprint(row: TeamHoursRecord) {
  const { updatedAt, ...stable } = row;
  return JSON.stringify(stable);
}
export function planSync(records: TeamHoursRecord[], previous: Record<string, string>) {
  const next = Object.fromEntries(records.map(row => [row.id, fingerprint(row)]));
  return {
    writes: records.filter(row => previous[row.id] !== next[row.id]),
    deletes: Object.keys(previous).filter(id => !(id in next)), next,
  };
}
