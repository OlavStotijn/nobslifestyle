import type { Env } from "../types";
import { localDateInTz } from "./time";
import { getNutritionProfile } from "./nutritionProfile";

export interface WeightLogRow {
  id: number;
  user_id: number;
  weight_kg: number;
  logged_date_local: string;
  note: string | null;
  created_at: string;
}

export function publicWeightLog(row: WeightLogRow) {
  return {
    id: row.id,
    weightKg: row.weight_kg,
    loggedDate: row.logged_date_local,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function listWeightLogs(env: Env, userId: number, limit = 90): Promise<WeightLogRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM weight_logs WHERE user_id = ? ORDER BY logged_date_local ASC, created_at ASC LIMIT ?"
  )
    .bind(userId, limit)
    .all<WeightLogRow>();
  return results;
}

export async function createWeightLog(
  env: Env,
  userId: number,
  params: { weightKg: number; note?: string; loggedAt?: Date }
): Promise<WeightLogRow> {
  const profile = await getNutritionProfile(env, userId);
  const timezone = profile?.timezone ?? "Europe/Amsterdam";
  const loggedDate = localDateInTz(params.loggedAt ?? new Date(), timezone);

  const result = await env.DB.prepare(
    "INSERT INTO weight_logs (user_id, weight_kg, logged_date_local, note) VALUES (?, ?, ?, ?)"
  )
    .bind(userId, params.weightKg, loggedDate, params.note ?? null)
    .run();

  const id = result.meta.last_row_id as number;
  const row = await env.DB.prepare("SELECT * FROM weight_logs WHERE id = ?").bind(id).first<WeightLogRow>();
  if (!row) throw new Error("Failed to load newly created weight log.");
  return row;
}

export async function deleteWeightLog(env: Env, userId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM weight_logs WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return (result.meta.changes ?? 0) > 0;
}
