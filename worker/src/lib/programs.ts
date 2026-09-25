import type { Env } from "../types";

export interface ProgramRow {
  id: number;
  user_id: number;
  name: string;
  updated_at: string;
}

export interface ProgramDayRow {
  id: number;
  program_id: number;
  weekday: number;
  schema_id: number | null;
  schema_name: string | null;
}

export function publicProgram(row: ProgramRow, days: ProgramDayRow[]) {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
    days: days.map((d) => ({ weekday: d.weekday, schemaId: d.schema_id, schemaName: d.schema_name })),
  };
}

export async function listPrograms(env: Env, userId: number): Promise<ProgramRow[]> {
  const { results } = await env.DB.prepare("SELECT * FROM workout_programs WHERE user_id = ? ORDER BY updated_at DESC")
    .bind(userId)
    .all<ProgramRow>();
  return results;
}

export async function getProgramOwned(env: Env, userId: number, id: number): Promise<ProgramRow | null> {
  return env.DB.prepare("SELECT * FROM workout_programs WHERE id = ? AND user_id = ?").bind(id, userId).first<ProgramRow>();
}

export async function listProgramDays(env: Env, programId: number): Promise<ProgramDayRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT pd.*, ws.name AS schema_name FROM program_days pd
     LEFT JOIN workout_schemas ws ON ws.id = pd.schema_id
     WHERE pd.program_id = ? ORDER BY pd.weekday ASC`
  )
    .bind(programId)
    .all<ProgramDayRow>();
  return results;
}

export async function createProgram(env: Env, userId: number, name: string): Promise<ProgramRow> {
  const result = await env.DB.prepare("INSERT INTO workout_programs (user_id, name) VALUES (?, ?)").bind(userId, name).run();
  const id = result.meta.last_row_id as number;
  const row = await getProgramOwned(env, userId, id);
  if (!row) throw new Error("Failed to load newly created program.");
  return row;
}

export async function deleteProgram(env: Env, userId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM workout_programs WHERE id = ? AND user_id = ?").bind(id, userId).run();
  const deleted = (result.meta.changes ?? 0) > 0;
  if (deleted) {
    // Clear any user that had this as their active program, so we don't
    // dangle a reference to a program that no longer exists.
    await env.DB.prepare("UPDATE users SET active_program_id = NULL WHERE active_program_id = ?").bind(id).run();
  }
  return deleted;
}

// Upserts every weekday's schema assignment in one go (the builder UI sends
// the full week each time, simpler than a per-day PATCH endpoint).
export async function setProgramDays(
  env: Env,
  programId: number,
  days: { weekday: number; schemaId: number | null }[]
): Promise<void> {
  const statements = days.map((d) =>
    env.DB.prepare(
      `INSERT INTO program_days (program_id, weekday, schema_id) VALUES (?, ?, ?)
       ON CONFLICT (program_id, weekday) DO UPDATE SET schema_id = excluded.schema_id`
    ).bind(programId, d.weekday, d.schemaId)
  );
  await env.DB.batch(statements);
}

export async function setActiveProgram(env: Env, userId: number, programId: number | null): Promise<void> {
  await env.DB.prepare("UPDATE users SET active_program_id = ? WHERE id = ?").bind(programId, userId).run();
}

// Resolves "today's workout" for the home/workouts screen: the active
// program's schema for the current weekday, or null on a rest day / no
// active program.
export async function getTodaysSchema(env: Env, userId: number, weekday: number): Promise<{ schemaId: number; schemaName: string } | null> {
  const row = await env.DB.prepare(
    `SELECT pd.schema_id AS schemaId, ws.name AS schemaName
     FROM users u
     JOIN program_days pd ON pd.program_id = u.active_program_id AND pd.weekday = ?
     LEFT JOIN workout_schemas ws ON ws.id = pd.schema_id
     WHERE u.id = ?`
  )
    .bind(weekday, userId)
    .first<{ schemaId: number | null; schemaName: string | null }>();
  if (!row || row.schemaId == null) return null;
  return { schemaId: row.schemaId, schemaName: row.schemaName ?? "" };
}
