import type { Env } from "../types";
import type { SessionRow } from "./sessions";
import { listSessionExercises, listSessionSets } from "./sessions";

export type Badge = "pr" | "progress" | "on_target" | "regression";

export interface ExerciseProgress {
  exerciseId: number;
  exerciseName: string;
  bestSet: { reps: number; weightKg: number };
  weightDeltaBaseline: number;
  repsDeltaBaseline: number;
  setsDeltaBaseline: number;
  weightDeltaPrev: number | null;
  repsDeltaPrev: number | null;
  volumeDeltaPrev: number | null;
  isPr: boolean;
  badge: Badge;
}

export interface SessionProgress {
  perExercise: ExerciseProgress[];
  sessionBadge: Badge;
}

function bestOf(sets: { reps: number; weight_kg: number }[]) {
  return sets.reduce((best, s) => (s.weight_kg > best.weight_kg || (s.weight_kg === best.weight_kg && s.reps > best.reps) ? s : best));
}

function badgeFor(weightDeltaBaseline: number, repsDeltaBaseline: number, isPr: boolean): Badge {
  if (isPr) return "pr";
  if (weightDeltaBaseline > 0 && repsDeltaBaseline >= 0) return "progress";
  if (weightDeltaBaseline === 0 && repsDeltaBaseline > 0) return "progress";
  if (weightDeltaBaseline < 0 || repsDeltaBaseline < 0) return "regression";
  return "on_target";
}

const BADGE_PRECEDENCE: Badge[] = ["pr", "progress", "on_target", "regression"];

function majorityBadge(badges: Badge[]): Badge {
  if (badges.length === 0) return "on_target";
  const counts = new Map<Badge, number>();
  for (const b of badges) counts.set(b, (counts.get(b) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const tied = BADGE_PRECEDENCE.filter((b) => counts.get(b) === maxCount);
  return tied[0];
}

// Runs once at session-finish time; the result is cached on
// training_sessions.progress_summary so the feed/history never recomputes it.
export async function computeSessionProgress(env: Env, session: SessionRow): Promise<SessionProgress> {
  const sessionExercises = await listSessionExercises(env, session.id);
  const perExercise: ExerciseProgress[] = [];

  for (const se of sessionExercises) {
    const sets = await listSessionSets(env, se.id);
    if (sets.length === 0) continue;

    const best = bestOf(sets);
    const weightDeltaBaseline = best.weight_kg - se.target_weight_kg;
    const repsDeltaBaseline = best.reps - se.target_reps_min;
    const setsDeltaBaseline = sets.length - se.target_sets;

    // (b) most recent prior FINISHED session containing this exercise, any schema
    const prevSessionExercise = await env.DB.prepare(
      `SELECT se2.id FROM session_exercises se2
       JOIN training_sessions ts2 ON ts2.id = se2.session_id
       WHERE ts2.user_id = ? AND se2.exercise_id = ? AND ts2.finished_at IS NOT NULL AND ts2.started_at < ?
       ORDER BY ts2.started_at DESC LIMIT 1`
    )
      .bind(session.user_id, se.exercise_id, session.started_at)
      .first<{ id: number }>();

    let weightDeltaPrev: number | null = null;
    let repsDeltaPrev: number | null = null;
    let volumeDeltaPrev: number | null = null;

    if (prevSessionExercise) {
      const prevSets = await listSessionSets(env, prevSessionExercise.id);
      if (prevSets.length > 0) {
        const prevBest = bestOf(prevSets);
        weightDeltaPrev = best.weight_kg - prevBest.weight_kg;
        repsDeltaPrev = best.reps - prevBest.reps;
        const volumeNow = sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0);
        const volumePrev = prevSets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0);
        volumeDeltaPrev = volumeNow - volumePrev;
      }
    }

    // PR: heaviest single top-set weight ever for this user+exercise, excluding this session
    const allTimeMax = await env.DB.prepare(
      `SELECT MAX(ss.weight_kg) AS m FROM session_sets ss
       JOIN session_exercises se3 ON se3.id = ss.session_exercise_id
       JOIN training_sessions ts3 ON ts3.id = se3.session_id
       WHERE ts3.user_id = ? AND se3.exercise_id = ? AND ts3.id != ? AND ts3.finished_at IS NOT NULL`
    )
      .bind(session.user_id, se.exercise_id, session.id)
      .first<{ m: number | null }>();

    const isPr = allTimeMax?.m == null || best.weight_kg > allTimeMax.m;
    const badge = badgeFor(weightDeltaBaseline, repsDeltaBaseline, isPr);

    perExercise.push({
      exerciseId: se.exercise_id,
      exerciseName: se.exercise_name,
      bestSet: { reps: best.reps, weightKg: best.weight_kg },
      weightDeltaBaseline,
      repsDeltaBaseline,
      setsDeltaBaseline,
      weightDeltaPrev,
      repsDeltaPrev,
      volumeDeltaPrev,
      isPr,
      badge,
    });
  }

  return { perExercise, sessionBadge: majorityBadge(perExercise.map((e) => e.badge)) };
}

export interface PersonalRecord {
  exerciseId: number;
  exerciseName: string;
  bestWeightKg: number;
  bestReps: number;
  achievedAt: string;
  sessionId: number;
}

// All-time PR per exercise the user has ever logged (heaviest single set,
// ties broken by more reps) — a dedicated overview, separate from the
// per-session badges computed above.
export async function listPersonalRecords(env: Env, userId: number): Promise<PersonalRecord[]> {
  const { results } = await env.DB.prepare(
    `SELECT
       se.exercise_id AS exerciseId, e.name AS exerciseName,
       ss.weight_kg AS bestWeightKg, ss.reps AS bestReps,
       ts.started_at AS achievedAt, ts.id AS sessionId
     FROM session_sets ss
     JOIN session_exercises se ON se.id = ss.session_exercise_id
     JOIN training_sessions ts ON ts.id = se.session_id
     JOIN exercises e ON e.id = se.exercise_id
     WHERE ts.user_id = ? AND ts.finished_at IS NOT NULL
       AND ss.weight_kg = (
         SELECT MAX(ss2.weight_kg) FROM session_sets ss2
         JOIN session_exercises se2 ON se2.id = ss2.session_exercise_id
         JOIN training_sessions ts2 ON ts2.id = se2.session_id
         WHERE ts2.user_id = ts.user_id AND se2.exercise_id = se.exercise_id AND ts2.finished_at IS NOT NULL
       )
     GROUP BY se.exercise_id
     ORDER BY e.name COLLATE NOCASE ASC`
  )
    .bind(userId)
    .all<PersonalRecord>();
  return results;
}

export interface ExerciseHistoryPoint {
  sessionId: number;
  startedAt: string;
  bestWeightKg: number;
  bestReps: number;
  volumeKg: number;
}

// One point per past session containing this exercise: best set (weight,
// reps) and total volume (Σ reps×weight) — feeds the progress chart.
export async function getExerciseHistory(env: Env, userId: number, exerciseId: number, limit = 60): Promise<ExerciseHistoryPoint[]> {
  const { results } = await env.DB.prepare(
    `SELECT
       ts.id AS sessionId, ts.started_at AS startedAt,
       MAX(ss.weight_kg) AS bestWeightKg,
       SUM(ss.reps * ss.weight_kg) AS volumeKg,
       (SELECT ss3.reps FROM session_sets ss3
          WHERE ss3.session_exercise_id = se.id
          ORDER BY ss3.weight_kg DESC, ss3.reps DESC LIMIT 1) AS bestReps
     FROM session_exercises se
     JOIN training_sessions ts ON ts.id = se.session_id
     JOIN session_sets ss ON ss.session_exercise_id = se.id
     WHERE ts.user_id = ? AND se.exercise_id = ? AND ts.finished_at IS NOT NULL
     GROUP BY se.id
     ORDER BY ts.started_at ASC
     LIMIT ?`
  )
    .bind(userId, exerciseId, limit)
    .all<ExerciseHistoryPoint>();
  return results;
}
