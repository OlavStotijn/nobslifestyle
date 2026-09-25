import type { Env } from "../types";

export type PhotoVisibility = "private" | "friends";

export interface ProgressPhotoRow {
  id: number;
  user_id: number;
  r2_key: string;
  taken_at: string;
  weight_kg: number | null;
  notes: string | null;
  visibility: PhotoVisibility;
  created_at: string;
}

export function publicProgressPhoto(p: ProgressPhotoRow) {
  return {
    id: p.id,
    imageUrl: `/api/media/${p.r2_key}`,
    takenAt: p.taken_at,
    weightKg: p.weight_kg,
    notes: p.notes,
    visibility: p.visibility,
  };
}

export async function listOwnProgressPhotos(env: Env, userId: number): Promise<ProgressPhotoRow[]> {
  const { results } = await env.DB.prepare("SELECT * FROM progress_photos WHERE user_id = ? ORDER BY taken_at DESC")
    .bind(userId)
    .all<ProgressPhotoRow>();
  return results;
}

export async function listFriendVisibleProgressPhotos(env: Env, friendUserId: number): Promise<ProgressPhotoRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM progress_photos WHERE user_id = ? AND visibility = 'friends' ORDER BY taken_at DESC"
  )
    .bind(friendUserId)
    .all<ProgressPhotoRow>();
  return results;
}

export async function getOwnProgressPhoto(env: Env, userId: number, id: number): Promise<ProgressPhotoRow | null> {
  return env.DB.prepare("SELECT * FROM progress_photos WHERE id = ? AND user_id = ?").bind(id, userId).first<ProgressPhotoRow>();
}

export interface CreateProgressPhotoParams {
  r2Key: string;
  takenAt?: string;
  weightKg?: number | null;
  notes?: string | null;
  visibility?: PhotoVisibility;
}

export async function createProgressPhoto(env: Env, userId: number, params: CreateProgressPhotoParams): Promise<ProgressPhotoRow> {
  const takenAt = params.takenAt ?? new Date().toISOString();
  const result = await env.DB.prepare(
    "INSERT INTO progress_photos (user_id, r2_key, taken_at, weight_kg, notes, visibility) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(userId, params.r2Key, takenAt, params.weightKg ?? null, params.notes ?? null, params.visibility ?? "private")
    .run();

  const id = result.meta.last_row_id as number;
  const row = await getOwnProgressPhoto(env, userId, id);
  if (!row) throw new Error("Failed to load newly created progress photo.");
  return row;
}

export async function updateProgressPhoto(
  env: Env,
  userId: number,
  id: number,
  params: { weightKg?: number | null; notes?: string | null; visibility?: PhotoVisibility }
): Promise<ProgressPhotoRow | null> {
  const existing = await getOwnProgressPhoto(env, userId, id);
  if (!existing) return null;

  await env.DB.prepare("UPDATE progress_photos SET weight_kg = ?, notes = ?, visibility = ? WHERE id = ?")
    .bind(
      params.weightKg !== undefined ? params.weightKg : existing.weight_kg,
      params.notes !== undefined ? params.notes : existing.notes,
      params.visibility ?? existing.visibility,
      id
    )
    .run();

  return getOwnProgressPhoto(env, userId, id);
}

export async function deleteProgressPhoto(env: Env, userId: number, id: number): Promise<ProgressPhotoRow | null> {
  const existing = await getOwnProgressPhoto(env, userId, id);
  if (!existing) return null;
  await env.DB.prepare("DELETE FROM progress_photos WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return existing;
}
