import type { Env } from "../types";
import { localDateInTz } from "./time";
import { getNutritionProfile } from "./nutritionProfile";

// Consecutive-day streak ending today (or yesterday, if today hasn't
// happened yet — a streak isn't "broken" just because the day isn't over).
function computeStreak(datesDesc: string[], todayLocal: string): number {
  const set = new Set(datesDesc);
  const yesterday = new Date(`${todayLocal}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayLocal = yesterday.toISOString().slice(0, 10);

  let cursor: Date;
  if (set.has(todayLocal)) cursor = new Date(`${todayLocal}T00:00:00Z`);
  else if (set.has(yesterdayLocal)) cursor = new Date(`${yesterdayLocal}T00:00:00Z`);
  else return 0;

  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export interface Streaks {
  loggingStreakDays: number;
  workoutStreakDays: number;
}

export async function getStreaks(env: Env, userId: number): Promise<Streaks> {
  const profile = await getNutritionProfile(env, userId);
  const timezone = profile?.timezone ?? "Europe/Amsterdam";
  const todayLocal = localDateInTz(new Date(), timezone);

  const [foodDates, sessionDates, cardioDates] = await Promise.all([
    env.DB.prepare("SELECT DISTINCT logged_date_local AS d FROM food_logs WHERE user_id = ? ORDER BY d DESC LIMIT 60")
      .bind(userId)
      .all<{ d: string }>(),
    env.DB.prepare("SELECT finished_at FROM training_sessions WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 60")
      .bind(userId)
      .all<{ finished_at: string }>(),
    env.DB.prepare(
      "SELECT DISTINCT started_date_local AS d FROM cardio_sessions WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY d DESC LIMIT 60"
    )
      .bind(userId)
      .all<{ d: string }>(),
  ]);

  const workoutDates = new Set<string>([
    ...sessionDates.results.map((r) => localDateInTz(new Date(r.finished_at), timezone)),
    ...cardioDates.results.map((r) => r.d),
  ]);

  return {
    loggingStreakDays: computeStreak(foodDates.results.map((r) => r.d), todayLocal),
    workoutStreakDays: computeStreak([...workoutDates], todayLocal),
  };
}
