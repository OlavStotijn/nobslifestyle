import type { Env } from "../types";

export type SchemaVisibility = "private" | "friends";

export interface SchemaRow {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  archived_at: string | null;
  visibility: SchemaVisibility;
  updated_at: string;
}

export interface SchemaExerciseRow {
  id: number;
  schema_id: number;
  exercise_id: number;
  sort_order: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_weight_kg: number;
  notes: string | null;
  exercise_name: string;
  exercise_category: string | null;
}

export function publicSchemaExercise(row: SchemaExerciseRow) {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    category: row.exercise_category,
    sortOrder: row.sort_order,
    targetSets: row.target_sets,
    targetRepsMin: row.target_reps_min,
    targetRepsMax: row.target_reps_max,
    targetWeightKg: row.target_weight_kg,
    notes: row.notes,
  };
}

export async function listSchemas(env: Env, userId: number): Promise<SchemaRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM workout_schemas WHERE user_id = ? AND archived_at IS NULL ORDER BY updated_at DESC"
  )
    .bind(userId)
    .all<SchemaRow>();
  return results;
}

export async function getSchemaOwned(env: Env, userId: number, id: number): Promise<SchemaRow | null> {
  return env.DB.prepare("SELECT * FROM workout_schemas WHERE id = ? AND user_id = ?").bind(id, userId).first<SchemaRow>();
}

export async function getSchemaById(env: Env, id: number): Promise<SchemaRow | null> {
  return env.DB.prepare("SELECT * FROM workout_schemas WHERE id = ?").bind(id).first<SchemaRow>();
}

export async function listFriendVisibleSchemas(env: Env, friendUserId: number): Promise<SchemaRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM workout_schemas WHERE user_id = ? AND archived_at IS NULL AND visibility = 'friends' ORDER BY updated_at DESC"
  )
    .bind(friendUserId)
    .all<SchemaRow>();
  return results;
}

export async function listSchemaExercises(env: Env, schemaId: number): Promise<SchemaExerciseRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT se.*, e.name AS exercise_name, e.category AS exercise_category
     FROM schema_exercises se
     JOIN exercises e ON e.id = se.exercise_id
     WHERE se.schema_id = ?
     ORDER BY se.sort_order ASC`
  )
    .bind(schemaId)
    .all<SchemaExerciseRow>();
  return results;
}

export async function createSchema(
  env: Env,
  userId: number,
  params: { name: string; description?: string | null }
): Promise<SchemaRow> {
  const result = await env.DB.prepare("INSERT INTO workout_schemas (user_id, name, description) VALUES (?, ?, ?)")
    .bind(userId, params.name, params.description ?? null)
    .run();
  const id = result.meta.last_row_id as number;
  const row = await getSchemaOwned(env, userId, id);
  if (!row) throw new Error("Failed to load newly created schema.");
  return row;
}

export async function updateSchema(
  env: Env,
  userId: number,
  id: number,
  params: { name?: string; description?: string | null; visibility?: SchemaVisibility }
): Promise<SchemaRow | null> {
  const existing = await getSchemaOwned(env, userId, id);
  if (!existing) return null;

  await env.DB.prepare(
    `UPDATE workout_schemas SET
       name = COALESCE(?, name),
       description = ?,
       visibility = COALESCE(?, visibility),
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  )
    .bind(
      params.name ?? null,
      params.description !== undefined ? params.description : existing.description,
      params.visibility ?? null,
      id
    )
    .run();

  return getSchemaOwned(env, userId, id);
}

// Duplicates another user's schema (name, description, and every schema
// exercise row) into the requesting user's own schemas — always creates a
// new schema, never links back to or mutates the original.
export async function copySchemaToUser(env: Env, sourceSchemaId: number, targetUserId: number): Promise<number> {
  const source = await getSchemaById(env, sourceSchemaId);
  if (!source) throw new Error("Schema not found.");

  const copy = await createSchema(env, targetUserId, { name: source.name, description: source.description });
  const exercises = await listSchemaExercises(env, sourceSchemaId);

  for (const ex of exercises) {
    await addSchemaExercise(env, copy.id, {
      exerciseId: ex.exercise_id,
      targetSets: ex.target_sets,
      targetRepsMin: ex.target_reps_min,
      targetRepsMax: ex.target_reps_max,
      targetWeightKg: ex.target_weight_kg,
      notes: ex.notes,
    });
  }

  return copy.id;
}

export async function archiveSchema(env: Env, userId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE workout_schemas SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND user_id = ? AND archived_at IS NULL"
  )
    .bind(id, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export interface AddSchemaExerciseParams {
  exerciseId: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeightKg: number;
  notes?: string | null;
}

export async function addSchemaExercise(
  env: Env,
  schemaId: number,
  params: AddSchemaExerciseParams
): Promise<SchemaExerciseRow> {
  const maxOrder = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM schema_exercises WHERE schema_id = ?")
    .bind(schemaId)
    .first<{ m: number }>();
  const sortOrder = (maxOrder?.m ?? -1) + 1;

  const result = await env.DB.prepare(
    `INSERT INTO schema_exercises
       (schema_id, exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, target_weight_kg, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      schemaId,
      params.exerciseId,
      sortOrder,
      params.targetSets,
      params.targetRepsMin,
      params.targetRepsMax,
      params.targetWeightKg,
      params.notes ?? null
    )
    .run();

  const id = result.meta.last_row_id as number;
  const rows = await env.DB.prepare(
    `SELECT se.*, e.name AS exercise_name, e.category AS exercise_category
     FROM schema_exercises se JOIN exercises e ON e.id = se.exercise_id WHERE se.id = ?`
  )
    .bind(id)
    .first<SchemaExerciseRow>();
  if (!rows) throw new Error("Failed to load newly created schema exercise.");
  return rows;
}

export interface UpdateSchemaExerciseParams {
  targetSets?: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetWeightKg?: number;
  notes?: string | null;
}

export async function updateSchemaExercise(
  env: Env,
  schemaId: number,
  rowId: number,
  params: UpdateSchemaExerciseParams
): Promise<boolean> {
  const existing = await env.DB.prepare("SELECT * FROM schema_exercises WHERE id = ? AND schema_id = ?")
    .bind(rowId, schemaId)
    .first<SchemaExerciseRow>();
  if (!existing) return false;

  await env.DB.prepare(
    `UPDATE schema_exercises SET
       target_sets = ?, target_reps_min = ?, target_reps_max = ?, target_weight_kg = ?, notes = ?
     WHERE id = ?`
  )
    .bind(
      params.targetSets ?? existing.target_sets,
      params.targetRepsMin ?? existing.target_reps_min,
      params.targetRepsMax ?? existing.target_reps_max,
      params.targetWeightKg ?? existing.target_weight_kg,
      params.notes !== undefined ? params.notes : existing.notes,
      rowId
    )
    .run();
  return true;
}

export async function deleteSchemaExercise(env: Env, schemaId: number, rowId: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM schema_exercises WHERE id = ? AND schema_id = ?").bind(rowId, schemaId).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function reorderSchemaExercises(env: Env, schemaId: number, orderedIds: number[]): Promise<void> {
  const statements = orderedIds.map((rowId, index) =>
    env.DB.prepare("UPDATE schema_exercises SET sort_order = ? WHERE id = ? AND schema_id = ?").bind(index, rowId, schemaId)
  );
  await env.DB.batch(statements);
}
