import type { Env } from "../types";
import { localDateInTz } from "./time";
import { getNutritionProfile } from "./nutritionProfile";

export interface WaterLogRow {
  id: number;
  user_id: number;
  amount_ml: number;
  logged_at: string;
  logged_date_local: string;
}

export function publicWaterLog(row: WaterLogRow) {
  return { id: row.id, amountMl: row.amount_ml, loggedAt: row.logged_at };
}

async function localDateFor(env: Env, userId: number, instant: Date): Promise<string> {
  const profile = await getNutritionProfile(env, userId);
  return localDateInTz(instant, profile?.timezone ?? "Europe/Amsterdam");
}

export async function createWaterLog(env: Env, userId: number, amountMl: number, loggedAt = new Date()): Promise<WaterLogRow> {
  const localDate = await localDateFor(env, userId, loggedAt);
  const result = await env.DB.prepare(
    "INSERT INTO water_logs (user_id, amount_ml, logged_at, logged_date_local) VALUES (?, ?, ?, ?)"
  )
    .bind(userId, amountMl, loggedAt.toISOString(), localDate)
    .run();

  const id = result.meta.last_row_id as number;
  const row = await env.DB.prepare("SELECT * FROM water_logs WHERE id = ?").bind(id).first<WaterLogRow>();
  if (!row) throw new Error("Failed to load newly created water log.");
  return row;
}

export async function listWaterLogsForDate(env: Env, userId: number, dateLocal: string): Promise<WaterLogRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM water_logs WHERE user_id = ? AND logged_date_local = ? ORDER BY logged_at ASC"
  )
    .bind(userId, dateLocal)
    .all<WaterLogRow>();
  return results;
}

export async function deleteWaterLog(env: Env, userId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM water_logs WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return (result.meta.changes ?? 0) > 0;
}

export interface WaterSettingsRow {
  user_id: number;
  goal_ml: number;
  reminders_enabled: number;
  reminder_interval_minutes: number;
  reminder_start_time: string;
  reminder_end_time: string;
}

export function publicWaterSettings(row: WaterSettingsRow) {
  return {
    goalMl: row.goal_ml,
    remindersEnabled: row.reminders_enabled === 1,
    reminderIntervalMinutes: row.reminder_interval_minutes,
    reminderStartTime: row.reminder_start_time,
    reminderEndTime: row.reminder_end_time,
  };
}

export async function getOrCreateWaterSettings(env: Env, userId: number): Promise<WaterSettingsRow> {
  const existing = await env.DB.prepare("SELECT * FROM water_settings WHERE user_id = ?").bind(userId).first<WaterSettingsRow>();
  if (existing) return existing;

  await env.DB.prepare("INSERT INTO water_settings (user_id) VALUES (?)").bind(userId).run();
  const row = await env.DB.prepare("SELECT * FROM water_settings WHERE user_id = ?").bind(userId).first<WaterSettingsRow>();
  if (!row) throw new Error("Failed to load water settings.");
  return row;
}

export interface UpdateWaterSettingsParams {
  goalMl?: number;
  remindersEnabled?: boolean;
  reminderIntervalMinutes?: number;
  reminderStartTime?: string;
  reminderEndTime?: string;
}

export async function updateWaterSettings(env: Env, userId: number, params: UpdateWaterSettingsParams): Promise<WaterSettingsRow> {
  const existing = await getOrCreateWaterSettings(env, userId);

  const goalMl = params.goalMl ?? existing.goal_ml;
  const remindersEnabled = params.remindersEnabled ?? existing.reminders_enabled === 1;
  const reminderIntervalMinutes = params.reminderIntervalMinutes ?? existing.reminder_interval_minutes;
  const reminderStartTime = params.reminderStartTime ?? existing.reminder_start_time;
  const reminderEndTime = params.reminderEndTime ?? existing.reminder_end_time;

  await env.DB.prepare(
    `UPDATE water_settings SET
       goal_ml = ?, reminders_enabled = ?, reminder_interval_minutes = ?,
       reminder_start_time = ?, reminder_end_time = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE user_id = ?`
  )
    .bind(goalMl, remindersEnabled ? 1 : 0, reminderIntervalMinutes, reminderStartTime, reminderEndTime, userId)
    .run();

  return getOrCreateWaterSettings(env, userId);
}
