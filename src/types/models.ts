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

/** Public team projection. Pay and rate fields intentionally cannot exist here. */
export type TeamHoursRecord = {
  id: string;
  teamId: string;
  userId: string;
  memberName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  updatedAt: string;
  notes: string;
};

export type ImportedTimeEntry = {
  id: string;
  selected: boolean;
  date: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  warnings: string[];
};
