import { addLocalDays, localDateString } from "./dates";
import { captureStorageScope } from "./storageScope";
import { calculatePayPeriodTotals, getPayPeriodDates } from "./overtime";
import {
  loadActiveClock,
  loadEntries,
  loadSettings,
  loadTimeCards,
  saveSettings,
  saveTimeCards,
} from "./storage";
import { PaySettings, SavedTimeCard, TimeCardSaveSource, TimeEntry } from "../types/models";

function buildTimeCard(
  settings: PaySettings,
  entries: TimeEntry[],
  source: TimeCardSaveSource
): SavedTimeCard {
  const dates = new Set(getPayPeriodDates(settings.periodStart));
  const periodEntries = entries.filter(entry => dates.has(entry.date));
  const periodTotals = calculatePayPeriodTotals(periodEntries, settings);

  return {
    id: `timecard-${settings.periodStart}`,
    periodStart: settings.periodStart,
    periodEnd: addLocalDays(settings.periodStart, 13),
    savedAt: new Date().toISOString(),
    source,
    hourlyRate: settings.hourlyRate,
    overtimeMultiplier: settings.overtimeMultiplier,
    weekdayBaseHoursEnabled: settings.weekdayBaseHoursEnabled,
    entries: periodEntries,
    regularHours: periodTotals.regularHours,
    overtimeHours: periodTotals.overtimeHours,
    paidHours: periodTotals.paidHours,
    grossPay: periodTotals.estimatedGrossPay,
  };
}

export async function savePeriodTimeCard(
  settings: PaySettings,
  entries: TimeEntry[],
  source: TimeCardSaveSource = "manual"
): Promise<SavedTimeCard> {
  const isCurrent = captureStorageScope();
  const card = buildTimeCard(settings, entries, source);
  const cards = await loadTimeCards();
  const existingIndex = cards.findIndex(item => item.periodStart === card.periodStart);

  const next = existingIndex >= 0
    ? cards.map((item, index) => (index === existingIndex ? card : item))
    : [card, ...cards];

  next.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  if (!isCurrent()) throw new Error("Account changed while saving the time card. Please try again.");
  await saveTimeCards(next);
  return card;
}

export async function saveCurrentTimeCard(): Promise<SavedTimeCard> {
  const isCurrent = captureStorageScope();
  const [settings, entries] = await Promise.all([loadSettings(), loadEntries()]);
  if (!isCurrent()) throw new Error("Account changed. Please try again.");
  return savePeriodTimeCard(settings, entries, "manual");
}

export async function ensureCurrentPayPeriod(): Promise<{
  settings: PaySettings;
  rolledPeriods: number;
}> {
  const isCurrent = captureStorageScope();
  let settings = await loadSettings();
  const today = localDateString();
  const entries = await loadEntries();
  const activeClock = await loadActiveClock();
  let rolledPeriods = 0;

  // Guard against a corrupt/very old date causing an unbounded loop.
  for (let i = 0; i < 520; i++) {
    const periodEnd = addLocalDays(settings.periodStart, 13);
    if (today <= periodEnd) break;

    // If a shift from the period is still active, wait to archive until clock-out.
    if (
      activeClock &&
      activeClock.date >= settings.periodStart &&
      activeClock.date <= periodEnd
    ) {
      break;
    }

    const periodDates = new Set(getPayPeriodDates(settings.periodStart));
    const periodEntries = entries.filter(entry => periodDates.has(entry.date));

    if (periodEntries.length > 0 || settings.weekdayBaseHoursEnabled) {
      if (!isCurrent()) throw new Error("Account changed during pay-period rollover.");
      await savePeriodTimeCard(settings, entries, "automatic");
    }

    settings = {
      ...settings,
      periodStart: addLocalDays(settings.periodStart, 14),
    };
    rolledPeriods += 1;
  }

  if (rolledPeriods > 0) {
    if (!isCurrent()) throw new Error("Account changed during pay-period rollover.");
    await saveSettings(settings);
  }

  return { settings, rolledPeriods };
}
