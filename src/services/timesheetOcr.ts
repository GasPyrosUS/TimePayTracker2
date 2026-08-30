import { ImportedTimeEntry } from "../types/models";

const endpoint = process.env.EXPO_PUBLIC_OCR_API_URL;

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function validateImportedRow(row: Omit<ImportedTimeEntry, "warnings">): ImportedTimeEntry {
  const warnings: string[] = [];
  if (!validDate(row.date)) warnings.push("Enter a valid date (YYYY-MM-DD).");
  if (!validTime(row.clockIn)) warnings.push("Enter a valid clock-in time (HH:MM).");
  if (!validTime(row.clockOut)) warnings.push("Enter a valid clock-out time (HH:MM).");
  if (!Number.isFinite(row.breakMinutes) || row.breakMinutes < 0 || row.breakMinutes > 720) warnings.push("Check break minutes.");
  return { ...row, warnings };
}

export const timesheetOcrService = {
  configured: !!endpoint,
  async scan(uri: string): Promise<ImportedTimeEntry[]> {
    if (!endpoint) throw new Error("OCR is not connected. Add EXPO_PUBLIC_OCR_API_URL to enable image extraction.");
    const body = new FormData();
    body.append("image", { uri, name: "timesheet.jpg", type: "image/jpeg" } as never);
    const response = await fetch(endpoint, { method: "POST", body });
    if (!response.ok) throw new Error("The OCR service could not read this image.");
    const payload = await response.json() as { rows?: Array<Partial<ImportedTimeEntry>> };
    return (payload.rows || []).map((row, index) => validateImportedRow({
      id: row.id || `ocr-${Date.now()}-${index}`, selected: row.selected ?? true,
      date: row.date || "", clockIn: row.clockIn || "", clockOut: row.clockOut || "",
      breakMinutes: Number(row.breakMinutes || 0),
    }));
  },
};
