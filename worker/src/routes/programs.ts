import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import {
  createProgram,
  deleteProgram,
  getProgramOwned,
  getTodaysSchema,
  listProgramDays,
  listPrograms,
  publicProgram,
  setActiveProgram,
  setProgramDays,
} from "../lib/programs";
import { getNutritionProfile } from "../lib/nutritionProfile";
import { localWeekdayInTz } from "../lib/time";

export const programsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

programsRoute.use("/api/programs*", requireAuth);
programsRoute.use("/api/workouts/today", requireAuth);

async function programWithDays(env: Env, userId: number, id: number) {
  const program = await getProgramOwned(env, userId, id);
  if (!program) return null;
  return publicProgram(program, await listProgramDays(env, id));
}

programsRoute.get("/api/programs", async (c) => {
  const programs = await listPrograms(c.env, c.get("userId"));
  const withDays = await Promise.all(programs.map((p) => programWithDays(c.env, c.get("userId"), p.id)));
  return c.json({ programs: withDays });
});

interface CreateProgramBody {
  name: string;
}

programsRoute.post("/api/programs", async (c) => {
  const body = await c.req.json<Partial<CreateProgramBody>>().catch(() => null);
  if (!body?.name) return c.json({ error: "name is required." }, 422);
  const program = await createProgram(c.env, c.get("userId"), body.name);
  return c.json({ program: await programWithDays(c.env, c.get("userId"), program.id) }, 201);
});

interface SetDaysBody {
  days: { weekday: number; schemaId: number | null }[];
}

programsRoute.put("/api/programs/:id/days", async (c) => {
  const programId = Number(c.req.param("id"));
  const program = await getProgramOwned(c.env, c.get("userId"), programId);
  if (!program) return c.json({ error: "Not found." }, 404);

  const body = await c.req.json<Partial<SetDaysBody>>().catch(() => null);
  if (!Array.isArray(body?.days)) return c.json({ error: "days array is required." }, 422);
  for (const d of body.days) {
    if (typeof d.weekday !== "number" || d.weekday < 0 || d.weekday > 6) {
      return c.json({ error: "Each day needs a weekday 0-6." }, 422);
    }
  }

  await setProgramDays(c.env, programId, body.days);
  return c.json({ program: await programWithDays(c.env, c.get("userId"), programId) });
});

programsRoute.post("/api/programs/:id/activate", async (c) => {
  const programId = Number(c.req.param("id"));
  const program = await getProgramOwned(c.env, c.get("userId"), programId);
  if (!program) return c.json({ error: "Not found." }, 404);
  await setActiveProgram(c.env, c.get("userId"), programId);
  return c.json({ ok: true });
});

programsRoute.post("/api/programs/deactivate", async (c) => {
  await setActiveProgram(c.env, c.get("userId"), null);
  return c.json({ ok: true });
});

programsRoute.delete("/api/programs/:id", async (c) => {
  const ok = await deleteProgram(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

programsRoute.get("/api/workouts/today", async (c) => {
  const userId = c.get("userId");
  const profile = await getNutritionProfile(c.env, userId);
  const weekday = localWeekdayInTz(new Date(), profile?.timezone ?? "Europe/Amsterdam");
  const today = await getTodaysSchema(c.env, userId, weekday);
  return c.json({ today });
});
