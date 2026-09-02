import type { TeamHoursRecord, TimeEntry } from "../types/models";

export function isTeamHoursDuplicate(
  entry: TimeEntry,
  record: TeamHoursRecord
): boolean {
  if (
    entry.importSource?.type === "team-hours" &&
    entry.importSource.recordId === record.id
  ) {
    return true;
  }

  return (
    entry.date === record.date &&
    entry.clockIn === record.clockIn &&
    entry.clockOut === record.clockOut &&
    entry.breakMinutes === record.breakMinutes
  );
}

export function createTeamHoursEntry(
  record: TeamHoursRecord,
  importedAt = new Date().toISOString()
): TimeEntry {
  // Build an explicit local projection. Shared ST/OT/total metadata is review-only;
  // the current user's calculator recomputes it and their private pay locally.
  return {
    id: `team-import-${encodeURIComponent(record.id)}-${Date.parse(importedAt)}`,
    date: record.date,
    clockIn: record.clockIn,
    clockOut: record.clockOut,
    breakMinutes: record.breakMinutes,
    notes: `Imported from Team Hours — ${record.memberName}`,
    importSource: {
      type: "team-hours",
      recordId: record.id,
      userId: record.userId,
      memberName: record.memberName,
      importedAt,
    },
  };
}

export function partitionTeamHoursImports(
  records: TeamHoursRecord[],
  existingEntries: TimeEntry[]
): { ready: TeamHoursRecord[]; duplicateIds: Set<string> } {
  const ready: TeamHoursRecord[] = [];
  const duplicateIds = new Set<string>();
  const comparisonEntries = [...existingEntries];

  for (const record of records) {
    if (comparisonEntries.some(entry => isTeamHoursDuplicate(entry, record))) {
      duplicateIds.add(record.id);
      continue;
    }
    ready.push(record);
    // Include accepted rows while checking the remainder so two selected team
    // records with the same date/times/break cannot be imported together.
    comparisonEntries.push(
      createTeamHoursEntry(record, "2000-01-01T00:00:00.000Z")
    );
  }

  return { ready, duplicateIds };
}
