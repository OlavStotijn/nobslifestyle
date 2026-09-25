import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { createCustomExercise, listExercises, publicExercise } from "../lib/exercises";
import {
  addSchemaExercise,
  archiveSchema,
  createSchema,
  deleteSchemaExercise,
  getSchemaOwned,
  listSchemaExercises,
  listSchemas,
  publicSchemaExercise,
  reorderSchemaExercises,
  updateSchema,
  updateSchemaExercise,
} from "../lib/schemas";

export const workoutsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

workoutsRoute.use("/api/exercises*", requireAuth);
workoutsRoute.use("/api/schemas*", requireAuth);

workoutsRoute.get("/api/exercises", async (c) => {
  const exercises = await listExercises(c.env, c.get("userId"), {
    q: c.req.query("q") ?? undefined,
    category: c.req.query("category") ?? undefined,
  });
  return c.json({ exercises: exercises.map(publicExercise) });
});

interface CreateExerciseBody {
  name: string;
  category?: string;
  equipment?: string;
}

workoutsRoute.post("/api/exercises", async (c) => {
  const body = await c.req.json<Partial<CreateExerciseBody>>().catch(() => null);
  if (!body?.name) return c.json({ error: "name is required." }, 422);

  const exercise = await createCustomExercise(c.env, c.get("userId"), {
    name: body.name,
    category: body.category,
    equipment: body.equipment,
  });
  return c.json({ exercise: publicExercise(exercise) }, 201);
});

async function schemaWithExercises(env: Env, userId: number, id: number) {
  const schema = await getSchemaOwned(env, userId, id);
  if (!schema) return null;
  const exercises = await listSchemaExercises(env, id);
  return {
    id: schema.id,
    name: schema.name,
    description: schema.description,
    updatedAt: schema.updated_at,
    exercises: exercises.map(publicSchemaExercise),
  };
}

workoutsRoute.get("/api/schemas", async (c) => {
  const schemas = await listSchemas(c.env, c.get("userId"));
  return c.json({
    schemas: schemas.map((s) => ({ id: s.id, name: s.name, description: s.description, updatedAt: s.updated_at })),
  });
});

interface CreateSchemaBody {
  name: string;
  description?: string;
}

workoutsRoute.post("/api/schemas", async (c) => {
  const body = await c.req.json<Partial<CreateSchemaBody>>().catch(() => null);
  if (!body?.name) return c.json({ error: "name is required." }, 422);

  const schema = await createSchema(c.env, c.get("userId"), { name: body.name, description: body.description });
  return c.json({ schema: await schemaWithExercises(c.env, c.get("userId"), schema.id) }, 201);
});

workoutsRoute.get("/api/schemas/:id", async (c) => {
  const schema = await schemaWithExercises(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!schema) return c.json({ error: "Not found." }, 404);
  return c.json({ schema });
});

workoutsRoute.put("/api/schemas/:id", async (c) => {
  const body = await c.req.json<Partial<CreateSchemaBody>>().catch(() => null);
  const updated = await updateSchema(c.env, c.get("userId"), Number(c.req.param("id")), {
    name: body?.name,
    description: body?.description,
  });
  if (!updated) return c.json({ error: "Not found." }, 404);
  return c.json({ schema: await schemaWithExercises(c.env, c.get("userId"), updated.id) });
});

workoutsRoute.delete("/api/schemas/:id", async (c) => {
  const ok = await archiveSchema(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

interface AddSchemaExerciseBody {
  exerciseId: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeightKg: number;
  notes?: string;
}

workoutsRoute.post("/api/schemas/:id/exercises", async (c) => {
  const schemaId = Number(c.req.param("id"));
  const schema = await getSchemaOwned(c.env, c.get("userId"), schemaId);
  if (!schema) return c.json({ error: "Not found." }, 404);

  const body = await c.req.json<Partial<AddSchemaExerciseBody>>().catch(() => null);
  if (
    !body?.exerciseId ||
    body.targetSets == null ||
    body.targetRepsMin == null ||
    body.targetRepsMax == null ||
    body.targetWeightKg == null
  ) {
    return c.json({ error: "exerciseId, targetSets, targetRepsMin, targetRepsMax, and targetWeightKg are required." }, 422);
  }

  const row = await addSchemaExercise(c.env, schemaId, {
    exerciseId: body.exerciseId,
    targetSets: body.targetSets,
    targetRepsMin: body.targetRepsMin,
    targetRepsMax: body.targetRepsMax,
    targetWeightKg: body.targetWeightKg,
    notes: body.notes,
  });
  return c.json({ schemaExercise: publicSchemaExercise(row) }, 201);
});

workoutsRoute.put("/api/schemas/:id/exercises/:rowId", async (c) => {
  const schemaId = Number(c.req.param("id"));
  const schema = await getSchemaOwned(c.env, c.get("userId"), schemaId);
  if (!schema) return c.json({ error: "Not found." }, 404);

  const body = await c.req.json<Partial<AddSchemaExerciseBody>>().catch(() => null);
  const ok = await updateSchemaExercise(c.env, schemaId, Number(c.req.param("rowId")), {
    targetSets: body?.targetSets,
    targetRepsMin: body?.targetRepsMin,
    targetRepsMax: body?.targetRepsMax,
    targetWeightKg: body?.targetWeightKg,
    notes: body?.notes,
  });
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

workoutsRoute.delete("/api/schemas/:id/exercises/:rowId", async (c) => {
  const schemaId = Number(c.req.param("id"));
  const schema = await getSchemaOwned(c.env, c.get("userId"), schemaId);
  if (!schema) return c.json({ error: "Not found." }, 404);

  const ok = await deleteSchemaExercise(c.env, schemaId, Number(c.req.param("rowId")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

workoutsRoute.put("/api/schemas/:id/exercises/reorder", async (c) => {
  const schemaId = Number(c.req.param("id"));
  const schema = await getSchemaOwned(c.env, c.get("userId"), schemaId);
  if (!schema) return c.json({ error: "Not found." }, 404);

  const body = await c.req.json<{ orderedIds?: number[] }>().catch(() => null);
  if (!Array.isArray(body?.orderedIds)) return c.json({ error: "orderedIds array is required." }, 422);

  await reorderSchemaExercises(c.env, schemaId, body.orderedIds);
  return c.json({ ok: true });
});
