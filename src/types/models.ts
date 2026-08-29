export type AppearanceMode = "system" | "light" | "dark";

export type TimeSegmentType = "straight" | "overtime";

export type TimeEntry = {
  id: string;
  date: string;       // YYYY-MM-DD
  clockIn: string;    // HH:mm
  clockOut: string;   // HH:mm
  breakMinutes: number;
  notes?: string;
};

export type PaySettings = {
  hourlyRate: number;
  overtimeMultiplier: number;
  periodStart: string; // YYYY-MM-DD
};

export type CalculatedEntry = TimeEntry & {
  regularHours: number;
  overtimeHours: number;
  paidHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
};

export type DaySummary = {
  date: string;
  regularHours: number;
  overtimeHours: number;
  paidHours: number;
  totalPay: number;
};


export type ActiveClockSession = {
  date: string;
  clockIn: string;
  breakMinutes: number;
};


export type TimeCardSaveSource = "manual" | "automatic";

export type SavedTimeCard = {
  id: string;
  periodStart: string;
  periodEnd: string;
  savedAt: string;
  source: TimeCardSaveSource;
  hourlyRate: number;
  overtimeMultiplier: number;
  entries: TimeEntry[];
  regularHours: number;
  overtimeHours: number;
  paidHours: number;
  grossPay: number;
};
