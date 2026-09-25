import type { Env } from "../types";

export interface ExerciseRow {
  id: number;
  owner_user_id: number | null;
  name: string;
  category: string | null;
  equipment: string | null;
  image_r2_key: string | null;
}

export function publicExercise(e: ExerciseRow) {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    equipment: e.equipment,
    isCustom: e.owner_user_id !== null,
    imageUrl: e.image_r2_key ? `/api/media/${e.image_r2_key}` : null,
  };
}

export async function listExercises(
  env: Env,
  userId: number,
  filters: { q?: string; category?: string }
): Promise<ExerciseRow[]> {
  const conditions = ["(owner_user_id IS NULL OR owner_user_id = ?)"];
  const params: unknown[] = [userId];

  if (filters.q) {
    conditions.push("name LIKE ? COLLATE NOCASE");
    params.push(`%${filters.q}%`);
  }
  if (filters.category) {
    conditions.push("category = ?");
    params.push(filters.category);
  }

  const { results } = await env.DB.prepare(
    `SELECT * FROM exercises WHERE ${conditions.join(" AND ")} ORDER BY name COLLATE NOCASE ASC LIMIT 100`
  )
    .bind(...params)
    .all<ExerciseRow>();
  return results;
}

export async function getExerciseById(env: Env, id: number): Promise<ExerciseRow | null> {
  return env.DB.prepare("SELECT * FROM exercises WHERE id = ?").bind(id).first<ExerciseRow>();
}

export async function createCustomExercise(
  env: Env,
  userId: number,
  params: { name: string; category?: string | null; equipment?: string | null }
): Promise<ExerciseRow> {
  const result = await env.DB.prepare(
    "INSERT INTO exercises (owner_user_id, name, category, equipment) VALUES (?, ?, ?, ?)"
  )
    .bind(userId, params.name, params.category ?? null, params.equipment ?? null)
    .run();

  const id = result.meta.last_row_id as number;
  const row = await getExerciseById(env, id);
  if (!row) throw new Error("Failed to load newly created exercise.");
  return row;
}
