import { addLocalDays, localDateString } from "./dates";
import { calculateEntry, getPayPeriodDates } from "./overtime";
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
  const calculated = periodEntries.map(entry =>
    calculateEntry(entry, settings.hourlyRate, settings.overtimeMultiplier)
  );

  const totals = calculated.reduce(
    (total, entry) => ({
      regularHours: total.regularHours + entry.regularHours,
      overtimeHours: total.overtimeHours + entry.overtimeHours,
      paidHours: total.paidHours + entry.paidHours,
      grossPay: total.grossPay + entry.totalPay,
    }),
    { regularHours: 0, overtimeHours: 0, paidHours: 0, grossPay: 0 }
  );

  return {
    id: `timecard-${settings.periodStart}`,
    periodStart: settings.periodStart,
    periodEnd: addLocalDays(settings.periodStart, 13),
    savedAt: new Date().toISOString(),
    source,
    hourlyRate: settings.hourlyRate,
    overtimeMultiplier: settings.overtimeMultiplier,
    entries: periodEntries,
    ...totals,
  };
}

export async function savePeriodTimeCard(
  settings: PaySettings,
  entries: TimeEntry[],
  source: TimeCardSaveSource = "manual"
): Promise<SavedTimeCard> {
  const card = buildTimeCard(settings, entries, source);
  const cards = await loadTimeCards();
  const existingIndex = cards.findIndex(item => item.periodStart === card.periodStart);

  const next = existingIndex >= 0
    ? cards.map((item, index) => (index === existingIndex ? card : item))
    : [card, ...cards];

  next.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  await saveTimeCards(next);
  return card;
}

export async function saveCurrentTimeCard(): Promise<SavedTimeCard> {
  const [settings, entries] = await Promise.all([loadSettings(), loadEntries()]);
  return savePeriodTimeCard(settings, entries, "manual");
}

export async function ensureCurrentPayPeriod(): Promise<{
  settings: PaySettings;
  rolledPeriods: number;
}> {
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

    if (periodEntries.length > 0) {
      await savePeriodTimeCard(settings, entries, "automatic");
    }

    settings = {
      ...settings,
      periodStart: addLocalDays(settings.periodStart, 14),
    };
    rolledPeriods += 1;
  }

  if (rolledPeriods > 0) {
    await saveSettings(settings);
  }

  return { settings, rolledPeriods };
}
