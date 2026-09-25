import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { createWeightLog, deleteWeightLog, listWeightLogs, publicWeightLog } from "../lib/weightLogs";

export const weightLogsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

weightLogsRoute.use("/api/weight-logs*", requireAuth);

weightLogsRoute.get("/api/weight-logs", async (c) => {
  const logs = await listWeightLogs(c.env, c.get("userId"));
  return c.json({ logs: logs.map(publicWeightLog) });
});

interface CreateWeightLogBody {
  weightKg: number;
  note?: string;
}

weightLogsRoute.post("/api/weight-logs", async (c) => {
  const body = await c.req.json<Partial<CreateWeightLogBody>>().catch(() => null);
  if (!body?.weightKg || body.weightKg <= 0) return c.json({ error: "A positive weightKg is required." }, 422);

  const log = await createWeightLog(c.env, c.get("userId"), { weightKg: body.weightKg, note: body.note });
  return c.json({ log: publicWeightLog(log) }, 201);
});

weightLogsRoute.delete("/api/weight-logs/:id", async (c) => {
  const ok = await deleteWeightLog(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});
