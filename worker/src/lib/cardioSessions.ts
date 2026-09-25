import type { Env } from "../types";
import { localDateInTz } from "./time";
import { getNutritionProfile } from "./nutritionProfile";

export type ActivityType = "running" | "cycling";

export interface CardioSessionRow {
  id: number;
  user_id: number;
  activity_type: ActivityType;
  started_at: string;
  finished_at: string | null;
  started_date_local: string;
  distance_m: number;
  duration_s: number;
  calories_kcal: number;
  route_geojson: string | null;
  subtract_from_intake: number;
  rating: number | null;
  notes: string | null;
}

export function publicCardioSession(s: CardioSessionRow) {
  return {
    id: s.id,
    activityType: s.activity_type,
    startedAt: s.started_at,
    finishedAt: s.finished_at,
    distanceM: s.distance_m,
    durationS: s.duration_s,
    calories: s.calories_kcal,
    route: s.route_geojson ? JSON.parse(s.route_geojson) : null,
    subtractFromIntake: s.subtract_from_intake === 1,
    rating: s.rating,
    notes: s.notes,
  };
}

// Simple MET (Metabolic Equivalent of Task) lookup by average speed — a
// standard, defensible calorie estimate without needing heart-rate data.
// kcal = MET * weight_kg * duration_hours.
function metFor(activityType: ActivityType, kmh: number): number {
  if (activityType === "running") {
    if (kmh < 8) return 8;
    if (kmh < 10) return 9.8;
    if (kmh < 12) return 11;
    if (kmh < 14) return 12.8;
    return 14.5;
  }
  // cycling
  if (kmh < 16) return 4;
  if (kmh < 19) return 6.8;
  if (kmh < 22) return 8;
  if (kmh < 25) return 10;
  return 12;
}

export function estimateCalories(activityType: ActivityType, distanceM: number, durationS: number, weightKg: number): number {
  if (durationS <= 0) return 0;
  const hours = durationS / 3600;
  const kmh = distanceM / 1000 / Math.max(hours, 1 / 3600);
  const met = metFor(activityType, kmh);
  return Math.round(met * weightKg * hours);
}

export interface CreateCardioSessionParams {
  activityType: ActivityType;
  startedAt: string;
  finishedAt: string;
  distanceM: number;
  durationS: number;
  route?: { lat: number; lng: number; t: number }[];
  subtractFromIntake: boolean;
}

export async function createCardioSession(env: Env, userId: number, params: CreateCardioSessionParams): Promise<CardioSessionRow> {
  const profile = await getNutritionProfile(env, userId);
  const weightKg = profile?.weight_kg ?? 75; // reasonable fallback if onboarding weight is somehow missing
  const timezone = profile?.timezone ?? "Europe/Amsterdam";
  const calories = estimateCalories(params.activityType, params.distanceM, params.durationS, weightKg);
  const startedDateLocal = localDateInTz(new Date(params.startedAt), timezone);

  const result = await env.DB.prepare(
    `INSERT INTO cardio_sessions
       (user_id, activity_type, started_at, finished_at, started_date_local, distance_m, duration_s, calories_kcal, route_geojson, subtract_from_intake)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      userId,
      params.activityType,
      params.startedAt,
      params.finishedAt,
      startedDateLocal,
      params.distanceM,
      params.durationS,
      calories,
      params.route ? JSON.stringify(downsampleRoute(params.route)) : null,
      params.subtractFromIntake ? 1 : 0
    )
    .run();

  const id = result.meta.last_row_id as number;
  const row = await getCardioSessionOwned(env, userId, id);
  if (!row) throw new Error("Failed to load newly created cardio session.");
  return row;
}

// Caps route payloads/storage: keeps at most ~300 points, evenly sampled,
// which is plenty of fidelity for a post-run map preview.
function downsampleRoute<T>(points: T[], maxPoints = 300): T[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * step)]);
  return out;
}

export async function getCardioSessionOwned(env: Env, userId: number, id: number): Promise<CardioSessionRow | null> {
  return env.DB.prepare("SELECT * FROM cardio_sessions WHERE id = ? AND user_id = ?").bind(id, userId).first<CardioSessionRow>();
}

export async function listCardioSessionsForDate(env: Env, userId: number, dateLocal: string): Promise<CardioSessionRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM cardio_sessions WHERE user_id = ? AND started_date_local = ? ORDER BY started_at ASC"
  )
    .bind(userId, dateLocal)
    .all<CardioSessionRow>();
  return results;
}

export async function listCardioSessions(env: Env, userId: number, limit = 30): Promise<CardioSessionRow[]> {
  const { results } = await env.DB.prepare("SELECT * FROM cardio_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?")
    .bind(userId, limit)
    .all<CardioSessionRow>();
  return results;
}

export async function getBurnedKcalForDate(env: Env, userId: number, dateLocal: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COALESCE(SUM(calories_kcal), 0) AS total FROM cardio_sessions WHERE user_id = ? AND started_date_local = ? AND subtract_from_intake = 1"
  )
    .bind(userId, dateLocal)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

export async function updateCardioSession(
  env: Env,
  userId: number,
  id: number,
  params: { subtractFromIntake?: boolean; rating?: number; notes?: string }
): Promise<CardioSessionRow | null> {
  const existing = await getCardioSessionOwned(env, userId, id);
  if (!existing) return null;

  await env.DB.prepare(
    `UPDATE cardio_sessions SET
       subtract_from_intake = ?, rating = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  )
    .bind(
      params.subtractFromIntake != null ? (params.subtractFromIntake ? 1 : 0) : existing.subtract_from_intake,
      params.rating !== undefined ? params.rating : existing.rating,
      params.notes !== undefined ? params.notes : existing.notes,
      id
    )
    .run();

  return getCardioSessionOwned(env, userId, id);
}

export async function deleteCardioSession(env: Env, userId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM cardio_sessions WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return (result.meta.changes ?? 0) > 0;
}
