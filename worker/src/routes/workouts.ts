import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { createCustomExercise, listExercises, publicExercise } from "../lib/exercises";
import {
  addSchemaExercise,
  archiveSchema,
  copySchemaToUser,
  createSchema,
  deleteSchemaExercise,
  getSchemaById,
  getSchemaOwned,
  listFriendVisibleSchemas,
  listSchemaExercises,
  listSchemas,
  publicSchemaExercise,
  reorderSchemaExercises,
  updateSchema,
  updateSchemaExercise,
  type SchemaRow,
  type SchemaVisibility,
} from "../lib/schemas";
import { areFriends } from "../lib/friendships";

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

async function publicSchemaWithExercises(env: Env, schema: SchemaRow) {
  const exercises = await listSchemaExercises(env, schema.id);
  return {
    id: schema.id,
    name: schema.name,
    description: schema.description,
    visibility: schema.visibility,
    updatedAt: schema.updated_at,
    exercises: exercises.map(publicSchemaExercise),
  };
}

async function schemaWithExercises(env: Env, userId: number, id: number) {
  const schema = await getSchemaOwned(env, userId, id);
  if (!schema) return null;
  return publicSchemaWithExercises(env, schema);
}

workoutsRoute.get("/api/schemas", async (c) => {
  const schemas = await listSchemas(c.env, c.get("userId"));
  return c.json({
    schemas: schemas.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      visibility: s.visibility,
      updatedAt: s.updated_at,
    })),
  });
});

// Friends-visibility only — private schemas never leave the owner's own list above.
workoutsRoute.get("/api/schemas/friend/:friendUserId", async (c) => {
  const friendUserId = Number(c.req.param("friendUserId"));
  const friends = await areFriends(c.env, c.get("userId"), friendUserId);
  if (!friends) return c.json({ error: "Not friends with this user." }, 403);

  const schemas = await listFriendVisibleSchemas(c.env, friendUserId);
  const withExercises = await Promise.all(schemas.map((s) => publicSchemaWithExercises(c.env, s)));
  return c.json({ schemas: withExercises });
});

workoutsRoute.post("/api/schemas/:id/copy", async (c) => {
  const sourceId = Number(c.req.param("id"));
  const source = await getSchemaById(c.env, sourceId);
  if (!source || source.visibility !== "friends") return c.json({ error: "Not found." }, 404);

  const userId = c.get("userId");
  if (source.user_id === userId) return c.json({ error: "That's already your own schema." }, 422);

  const friends = await areFriends(c.env, userId, source.user_id);
  if (!friends) return c.json({ error: "Not friends with this user." }, 403);

  const newSchemaId = await copySchemaToUser(c.env, sourceId, userId);
  return c.json({ schema: await schemaWithExercises(c.env, userId, newSchemaId) }, 201);
});

interface CreateSchemaBody {
  name: string;
  description?: string;
  visibility?: SchemaVisibility;
}

const VALID_SCHEMA_VISIBILITY: SchemaVisibility[] = ["private", "friends"];

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
  if (body?.visibility && !VALID_SCHEMA_VISIBILITY.includes(body.visibility)) {
    return c.json({ error: "Invalid visibility." }, 422);
  }

  const updated = await updateSchema(c.env, c.get("userId"), Number(c.req.param("id")), {
    name: body?.name,
    description: body?.description,
    visibility: body?.visibility,
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
