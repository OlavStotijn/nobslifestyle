import type { Env } from "../types";
import { localDateInTz } from "./time";
import { getNutritionProfile } from "./nutritionProfile";

export interface BodyMeasurementRow {
  id: number;
  user_id: number;
  logged_date_local: string;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  arms_cm: number | null;
  thighs_cm: number | null;
  note: string | null;
  created_at: string;
}

export function publicBodyMeasurement(row: BodyMeasurementRow) {
  return {
    id: row.id,
    loggedDate: row.logged_date_local,
    waistCm: row.waist_cm,
    chestCm: row.chest_cm,
    hipsCm: row.hips_cm,
    armsCm: row.arms_cm,
    thighsCm: row.thighs_cm,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function listBodyMeasurements(env: Env, userId: number, limit = 90): Promise<BodyMeasurementRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM body_measurements WHERE user_id = ? ORDER BY logged_date_local ASC, created_at ASC LIMIT ?"
  )
    .bind(userId, limit)
    .all<BodyMeasurementRow>();
  return results;
}

export interface CreateBodyMeasurementParams {
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  armsCm?: number;
  thighsCm?: number;
  note?: string;
  loggedAt?: Date;
}

export async function createBodyMeasurement(env: Env, userId: number, params: CreateBodyMeasurementParams): Promise<BodyMeasurementRow> {
  const profile = await getNutritionProfile(env, userId);
  const timezone = profile?.timezone ?? "Europe/Amsterdam";
  const loggedDate = localDateInTz(params.loggedAt ?? new Date(), timezone);

  const result = await env.DB.prepare(
    `INSERT INTO body_measurements (user_id, logged_date_local, waist_cm, chest_cm, hips_cm, arms_cm, thighs_cm, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      userId,
      loggedDate,
      params.waistCm ?? null,
      params.chestCm ?? null,
      params.hipsCm ?? null,
      params.armsCm ?? null,
      params.thighsCm ?? null,
      params.note ?? null
    )
    .run();

  const id = result.meta.last_row_id as number;
  const row = await env.DB.prepare("SELECT * FROM body_measurements WHERE id = ?").bind(id).first<BodyMeasurementRow>();
  if (!row) throw new Error("Failed to load newly created measurement.");
  return row;
}

export async function deleteBodyMeasurement(env: Env, userId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM body_measurements WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return (result.meta.changes ?? 0) > 0;
}
