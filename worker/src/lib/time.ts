// Timezone-aware wall-clock helpers, built on the Workers runtime's built-in
// ICU (no extra library needed) — used to auto-bucket food logs into a meal
// type and to compute each user's "local diary date" for fast lookups.

export function localDateInTz(instant: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the sortable format we
  // store in food_logs.logged_date_local.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// 0 = Sunday .. 6 = Saturday, same convention as JS Date#getDay() and
// program_days.weekday, but computed in the user's local timezone rather
// than the Worker's UTC clock.
export function localWeekdayInTz(instant: Date, timeZone: string): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(instant);
  return WEEKDAY_INDEX[short] ?? instant.getUTCDay();
}

export function localTimeInTz(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealWindows {
  breakfastEnd: string; // "HH:MM", local time
  lunchEnd: string;
  dinnerEnd: string;
}

// Simple threshold buckets, applied to local wall-clock time: everything up
// to breakfastEnd is breakfast, up to lunchEnd is lunch, up to dinnerEnd is
// dinner, everything after is a snack (including the pre-breakfast hours —
// there's no separate "early morning" bucket by design).
export function determineMealType(localTime: string, windows: MealWindows): MealType {
  if (localTime <= windows.breakfastEnd) return "breakfast";
  if (localTime <= windows.lunchEnd) return "lunch";
  if (localTime <= windows.dinnerEnd) return "dinner";
  return "snack";
}
