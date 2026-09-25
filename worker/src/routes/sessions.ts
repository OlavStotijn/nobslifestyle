import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import {
  addSessionSet,
  applySessionExerciseWeight,
  deleteSessionSet,
  finishSession,
  getSessionOwned,
  listSessionExercises,
  listSessionSets,
  listSessions,
  publicSession,
  publicSessionExercise,
  saveSessionAsSchema,
  setProgressSummary,
  startSession,
} from "../lib/sessions";
import { computeSessionProgress } from "../lib/progress";

export const sessionsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

sessionsRoute.use("/api/sessions*", requireAuth);

async function sessionWithExercises(env: Env, userId: number, id: number) {
  const session = await getSessionOwned(env, userId, id);
  if (!session) return null;
  const exercises = await listSessionExercises(env, id);
  const withSets = await Promise.all(
    exercises.map(async (e) => publicSessionExercise(e, await listSessionSets(env, e.id)))
  );
  return { ...publicSession(session), exercises: withSets };
}

interface StartSessionBody {
  schemaId: number;
}

sessionsRoute.post("/api/sessions", async (c) => {
  const body = await c.req.json<Partial<StartSessionBody>>().catch(() => null);
  if (!body?.schemaId) return c.json({ error: "schemaId is required." }, 422);

  try {
    const session = await startSession(c.env, c.get("userId"), body.schemaId);
    return c.json({ session: await sessionWithExercises(c.env, c.get("userId"), session.id) }, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Couldn't start session." }, 422);
  }
});

sessionsRoute.get("/api/sessions", async (c) => {
  const sessions = await listSessions(c.env, c.get("userId"));
  return c.json({ sessions: sessions.map(publicSession) });
});

sessionsRoute.get("/api/sessions/:id", async (c) => {
  const session = await sessionWithExercises(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!session) return c.json({ error: "Not found." }, 404);
  return c.json({ session });
});

interface AddSetBody {
  reps: number;
  weightKg: number;
}

sessionsRoute.post("/api/sessions/:id/exercises/:sessionExerciseId/sets", async (c) => {
  const body = await c.req.json<Partial<AddSetBody>>().catch(() => null);
  if (body?.reps == null || body.weightKg == null) {
    return c.json({ error: "reps and weightKg are required." }, 422);
  }

  try {
    const set = await addSessionSet(
      c.env,
      c.get("userId"),
      Number(c.req.param("id")),
      Number(c.req.param("sessionExerciseId")),
      { reps: body.reps, weightKg: body.weightKg }
    );
    return c.json(
      {
        set: {
          id: set.id,
          setNumber: set.set_number,
          reps: set.reps,
          weightKg: set.weight_kg,
          weightChangeApplied: set.weight_change_applied,
        },
      },
      201
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Couldn't log set." }, 422);
  }
});

sessionsRoute.delete("/api/sessions/:id/sets/:setId", async (c) => {
  const ok = await deleteSessionSet(c.env, c.get("userId"), Number(c.req.param("id")), Number(c.req.param("setId")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

interface ApplyWeightBody {
  permanent: boolean;
}

sessionsRoute.post("/api/sessions/:id/exercises/:sessionExerciseId/apply-weight", async (c) => {
  const body = await c.req.json<Partial<ApplyWeightBody>>().catch(() => null);
  const ok = await applySessionExerciseWeight(
    c.env,
    c.get("userId"),
    Number(c.req.param("id")),
    Number(c.req.param("sessionExerciseId")),
    body?.permanent === true
  );
  if (!ok) return c.json({ error: "Not found or no sets logged yet." }, 404);
  return c.json({ ok: true });
});

interface FinishSessionBody {
  rating?: number;
  notes?: string;
}

sessionsRoute.post("/api/sessions/:id/finish", async (c) => {
  const body = await c.req.json<Partial<FinishSessionBody>>().catch(() => null);
  if (body?.rating != null && (body.rating < 1 || body.rating > 5)) {
    return c.json({ error: "rating must be between 1 and 5." }, 422);
  }

  const session = await finishSession(c.env, c.get("userId"), Number(c.req.param("id")), {
    rating: body?.rating,
    notes: body?.notes,
  });
  if (!session) return c.json({ error: "Not found." }, 404);

  const progress = await computeSessionProgress(c.env, session);
  await setProgressSummary(c.env, session.id, JSON.stringify(progress));

  return c.json({ session: await sessionWithExercises(c.env, c.get("userId"), session.id) });
});

interface SaveAsSchemaBody {
  name: string;
}

sessionsRoute.post("/api/sessions/:id/save-as-schema", async (c) => {
  const body = await c.req.json<Partial<SaveAsSchemaBody>>().catch(() => null);
  if (!body?.name) return c.json({ error: "name is required." }, 422);

  const session = await getSessionOwned(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!session) return c.json({ error: "Not found." }, 404);

  const schemaId = await saveSessionAsSchema(c.env, c.get("userId"), session.id, body.name);
  return c.json({ schemaId }, 201);
});
