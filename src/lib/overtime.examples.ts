import { calculateEntry } from "./overtime";

// 6:00 AM–4:00 PM with a 30-minute unpaid break:
// 1.0 OT + 8.0 straight + 1.0 OT - 0.5 break = 9.5 paid hours.
const example = calculateEntry({
  id: "example",
  date: "2026-08-24", // Monday
  clockIn: "06:00",
  clockOut: "16:00",
  breakMinutes: 30
}, 25, 1.5);

console.log(example);
// Expected: regularHours 8, overtimeHours 1.5, paidHours 9.5,
// totalPay $293.75.
