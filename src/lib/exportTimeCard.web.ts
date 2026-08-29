import { SavedTimeCard } from "../types/models";
import { timeCardToCsv } from "./timeCardCsv";

export { timeCardToCsv } from "./timeCardCsv";

export async function exportTimeCardCsv(card: SavedTimeCard) {
  const csv = timeCardToCsv(card);
  const fileName = `time-card_${card.periodStart}_to_${card.periodEnd}.csv`;

  const browser = globalThis as any;

  if (!browser.Blob || !browser.URL || !browser.document) {
    throw new Error("CSV downloads are unavailable in this browser.");
  }

  const blob = new browser.Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = browser.URL.createObjectURL(blob);
  const anchor = browser.document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";

  browser.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  browser.setTimeout(() => {
    browser.URL.revokeObjectURL(url);
  }, 1000);
}
