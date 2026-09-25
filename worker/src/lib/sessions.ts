import type { Env } from "../types";
import { getSchemaOwned, listSchemaExercises, createSchema, addSchemaExercise } from "./schemas";

export interface SessionRow {
  id: number;
  user_id: number;
  schema_id: number;
  schema_name_snapshot: string;
  started_at: string;
  finished_at: string | null;
  rating: number | null;
  notes: string | null;
  progress_summary: string | null;
}

export interface SessionExerciseRow {
  id: number;
  session_id: number;
  exercise_id: number;
  schema_exercise_id: number | null;
  sort_order: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_weight_kg: number;
  exercise_name: string;
}

export interface SessionSetRow {
  id: number;
  session_exercise_id: number;
  set_number: number;
  reps: number;
  weight_kg: number;
  weight_change_applied: "none" | "session_only" | "permanent";
}

export function publicSession(s: SessionRow) {
  return {
    id: s.id,
    schemaId: s.schema_id,
    schemaName: s.schema_name_snapshot,
    startedAt: s.started_at,
    finishedAt: s.finished_at,
    rating: s.rating,
    notes: s.notes,
    progressSummary: s.progress_summary ? JSON.parse(s.progress_summary) : null,
  };
}

export function publicSessionExercise(e: SessionExerciseRow, sets: SessionSetRow[]) {
  return {
    id: e.id,
    exerciseId: e.exercise_id,
    exerciseName: e.exercise_name,
    sortOrder: e.sort_order,
    targetSets: e.target_sets,
    targetRepsMin: e.target_reps_min,
    targetRepsMax: e.target_reps_max,
    targetWeightKg: e.target_weight_kg,
    sets: sets.map((s) => ({
      id: s.id,
      setNumber: s.set_number,
      reps: s.reps,
      weightKg: s.weight_kg,
      weightChangeApplied: s.weight_change_applied,
    })),
  };
}

export async function getSessionOwned(env: Env, userId: number, id: number): Promise<SessionRow | null> {
  return env.DB.prepare("SELECT * FROM training_sessions WHERE id = ? AND user_id = ?").bind(id, userId).first<SessionRow>();
}

export async function listSessions(env: Env, userId: number, limit = 30): Promise<SessionRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM training_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?"
  )
    .bind(userId, limit)
    .all<SessionRow>();
  return results;
}

export async function listSessionExercises(env: Env, sessionId: number): Promise<SessionExerciseRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT se.*, e.name AS exercise_name
     FROM session_exercises se
     JOIN exercises e ON e.id = se.exercise_id
     WHERE se.session_id = ?
     ORDER BY se.sort_order ASC`
  )
    .bind(sessionId)
    .all<SessionExerciseRow>();
  return results;
}

export async function listSessionSets(env: Env, sessionExerciseId: number): Promise<SessionSetRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM session_sets WHERE session_exercise_id = ? ORDER BY set_number ASC"
  )
    .bind(sessionExerciseId)
    .all<SessionSetRow>();
  return results;
}

// Starting a session snapshots the schema's current targets into
// session_exercises — later schema edits never retroactively change a past
// session's baseline, which is what the progress-comparison algorithm relies on.
export async function startSession(env: Env, userId: number, schemaId: number): Promise<SessionRow> {
  const schema = await getSchemaOwned(env, userId, schemaId);
  if (!schema) throw new Error("Schema not found.");

  const schemaExercises = await listSchemaExercises(env, schemaId);
  if (schemaExercises.length === 0) throw new Error("This schema has no exercises yet.");

  const result = await env.DB.prepare(
    "INSERT INTO training_sessions (user_id, schema_id, schema_name_snapshot, started_at) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))"
  )
    .bind(userId, schemaId, schema.name)
    .run();
  const sessionId = result.meta.last_row_id as number;

  const statements = schemaExercises.map((se) =>
    env.DB.prepare(
      `INSERT INTO session_exercises
         (session_id, exercise_id, schema_exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, target_weight_kg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(sessionId, se.exercise_id, se.id, se.sort_order, se.target_sets, se.target_reps_min, se.target_reps_max, se.target_weight_kg)
  );
  await env.DB.batch(statements);

  const session = await getSessionOwned(env, userId, sessionId);
  if (!session) throw new Error("Failed to load newly created session.");
  return session;
}

async function getSessionExerciseOwned(env: Env, userId: number, sessionId: number, sessionExerciseId: number) {
  return env.DB.prepare(
    `SELECT se.* FROM session_exercises se
     JOIN training_sessions ts ON ts.id = se.session_id
     WHERE se.id = ? AND se.session_id = ? AND ts.user_id = ?`
  )
    .bind(sessionExerciseId, sessionId, userId)
    .first<SessionExerciseRow>();
}

export async function addSessionSet(
  env: Env,
  userId: number,
  sessionId: number,
  sessionExerciseId: number,
  params: { reps: number; weightKg: number }
): Promise<SessionSetRow> {
  const sessionExercise = await getSessionExerciseOwned(env, userId, sessionId, sessionExerciseId);
  if (!sessionExercise) throw new Error("Session exercise not found.");

  const maxSetNumber = await env.DB.prepare(
    "SELECT COALESCE(MAX(set_number), 0) AS m FROM session_sets WHERE session_exercise_id = ?"
  )
    .bind(sessionExerciseId)
    .first<{ m: number }>();
  const setNumber = (maxSetNumber?.m ?? 0) + 1;

  const result = await env.DB.prepare(
    "INSERT INTO session_sets (session_exercise_id, set_number, reps, weight_kg) VALUES (?, ?, ?, ?)"
  )
    .bind(sessionExerciseId, setNumber, params.reps, params.weightKg)
    .run();

  const id = result.meta.last_row_id as number;
  const row = await env.DB.prepare("SELECT * FROM session_sets WHERE id = ?").bind(id).first<SessionSetRow>();
  if (!row) throw new Error("Failed to load newly created set.");
  return row;
}

export async function deleteSessionSet(env: Env, userId: number, sessionId: number, setId: number): Promise<boolean> {
  const result = await env.DB.prepare(
    `DELETE FROM session_sets WHERE id = ? AND session_exercise_id IN (
       SELECT se.id FROM session_exercises se
       JOIN training_sessions ts ON ts.id = se.session_id
       WHERE se.session_id = ? AND ts.user_id = ?
     )`
  )
    .bind(setId, sessionId, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

// The core permanent-vs-session-only choice: "permanent" writes the new
// weight back to the originating schema_exercise (future sessions inherit
// it as their baseline); "session_only" just stamps the sets so the UI/progress
// algorithm knows a deliberate override happened, without touching the schema.
export async function applySessionExerciseWeight(
  env: Env,
  userId: number,
  sessionId: number,
  sessionExerciseId: number,
  permanent: boolean
): Promise<boolean> {
  const sessionExercise = await getSessionExerciseOwned(env, userId, sessionId, sessionExerciseId);
  if (!sessionExercise) return false;

  const sets = await listSessionSets(env, sessionExerciseId);
  if (sets.length === 0) return false;
  const heaviest = sets.reduce((a, b) => (b.weight_kg > a.weight_kg ? b : a));

  if (permanent && sessionExercise.schema_exercise_id) {
    await env.DB.prepare("UPDATE schema_exercises SET target_weight_kg = ? WHERE id = ?")
      .bind(heaviest.weight_kg, sessionExercise.schema_exercise_id)
      .run();
  }

  await env.DB.prepare("UPDATE session_sets SET weight_change_applied = ? WHERE session_exercise_id = ?")
    .bind(permanent ? "permanent" : "session_only", sessionExerciseId)
    .run();

  return true;
}

export async function finishSession(
  env: Env,
  userId: number,
  sessionId: number,
  params: { rating?: number; notes?: string }
): Promise<SessionRow | null> {
  const session = await getSessionOwned(env, userId, sessionId);
  if (!session) return null;

  await env.DB.prepare(
    `UPDATE training_sessions SET
       finished_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
       rating = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  )
    .bind(params.rating ?? null, params.notes ?? null, sessionId)
    .run();

  return getSessionOwned(env, userId, sessionId);
}

// Kept separate from finishSession (rather than importing lib/progress here)
// to avoid a circular import between sessions.ts and progress.ts, which
// itself reads session data via the list* helpers above.
export async function setProgressSummary(env: Env, sessionId: number, summaryJson: string): Promise<void> {
  await env.DB.prepare("UPDATE training_sessions SET progress_summary = ? WHERE id = ?").bind(summaryJson, sessionId).run();
}

// "Graduates" a session's actually-performed sets into a brand-new schema —
// always creates a new one, never overwrites the original the session came from.
export async function saveSessionAsSchema(
  env: Env,
  userId: number,
  sessionId: number,
  name: string
): Promise<number> {
  const sessionExercises = await listSessionExercises(env, sessionId);
  const schema = await createSchema(env, userId, { name });

  for (const se of sessionExercises) {
    const sets = await listSessionSets(env, se.id);
    if (sets.length === 0) continue;
    const heaviest = sets.reduce((a, b) => (b.weight_kg > a.weight_kg ? b : a));
    const maxReps = Math.max(...sets.map((s) => s.reps));
    const minReps = Math.min(...sets.map((s) => s.reps));

    await addSchemaExercise(env, schema.id, {
      exerciseId: se.exercise_id,
      targetSets: sets.length,
      targetRepsMin: minReps,
      targetRepsMax: maxReps,
      targetWeightKg: heaviest.weight_kg,
    });
  }

  return schema.id;
}
