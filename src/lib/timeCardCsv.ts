import { calculateEntry } from "./overtime";
import { formatTime12h } from "./timeFormat";
import { SavedTimeCard } from "../types/models";

function csvCell(value: string | number) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function timeCardToCsv(card: SavedTimeCard): string {
  const lines: string[] = [];

  lines.push(["Time & Pay Tracker - Saved Time Card"].map(csvCell).join(","));
  lines.push(["Pay Period Start", card.periodStart].map(csvCell).join(","));
  lines.push(["Pay Period End", card.periodEnd].map(csvCell).join(","));
  lines.push(["Saved", card.savedAt].map(csvCell).join(","));
  lines.push(["Hourly Rate", card.hourlyRate.toFixed(2)].map(csvCell).join(","));
  lines.push(
    ["Overtime Multiplier", card.overtimeMultiplier].map(csvCell).join(",")
  );
  lines.push("");

  lines.push(
    [
      "Date",
      "Clock In",
      "Clock Out",
      "Break Minutes",
      "Straight Hours",
      "Overtime Hours",
      "Paid Hours",
      "Straight Pay",
      "Overtime Pay",
      "Total Pay",
      "Notes",
    ]
      .map(csvCell)
      .join(",")
  );

  for (const entry of card.entries) {
    const calculated = calculateEntry(
      entry,
      card.hourlyRate,
      card.overtimeMultiplier
    );

    lines.push(
      [
        entry.date,
        formatTime12h(entry.clockIn),
        formatTime12h(entry.clockOut),
        entry.breakMinutes,
        calculated.regularHours.toFixed(2),
        calculated.overtimeHours.toFixed(2),
        calculated.paidHours.toFixed(2),
        calculated.regularPay.toFixed(2),
        calculated.overtimePay.toFixed(2),
        calculated.totalPay.toFixed(2),
        entry.notes ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  lines.push("");
  lines.push(
    ["TOTAL STRAIGHT HOURS", card.regularHours.toFixed(2)]
      .map(csvCell)
      .join(",")
  );
  lines.push(
    ["TOTAL OVERTIME HOURS", card.overtimeHours.toFixed(2)]
      .map(csvCell)
      .join(",")
  );
  lines.push(
    ["TOTAL PAID HOURS", card.paidHours.toFixed(2)]
      .map(csvCell)
      .join(",")
  );
  lines.push(
    ["ESTIMATED GROSS PAY", card.grossPay.toFixed(2)]
      .map(csvCell)
      .join(",")
  );

  return lines.join("\n");
}
