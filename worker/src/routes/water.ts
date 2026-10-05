import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { isUserPro } from "../lib/proStatus";
import {
  createWaterLog,
  deleteWaterLog,
  getOrCreateWaterSettings,
  listWaterLogsForDate,
  publicWaterLog,
  publicWaterSettings,
  updateWaterSettings,
} from "../lib/waterLogs";

export const waterRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

waterRoute.use("/api/water/*", requireAuth);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function todayFallback(dateParam: string | undefined): string {
  if (dateParam && DATE_PATTERN.test(dateParam)) return dateParam;
  return new Date().toISOString().slice(0, 10);
}

waterRoute.get("/api/water/settings", async (c) => {
  const settings = await getOrCreateWaterSettings(c.env, c.get("userId"));
  return c.json({ settings: publicWaterSettings(settings) });
});

interface UpdateSettingsBody {
  goalMl?: number;
  remindersEnabled?: boolean;
  reminderIntervalMinutes?: number;
  reminderStartTime?: string;
  reminderEndTime?: string;
}

waterRoute.put("/api/water/settings", async (c) => {
  const body = await c.req.json<UpdateSettingsBody>().catch(() => null);
  if (!body) return c.json({ error: "Invalid body." }, 422);

  if (body.goalMl != null && (typeof body.goalMl !== "number" || body.goalMl <= 0)) {
    return c.json({ error: "goalMl must be a positive number." }, 422);
  }
  if (body.reminderIntervalMinutes != null) {
    if (typeof body.reminderIntervalMinutes !== "number" || body.reminderIntervalMinutes < 5) {
      return c.json({ error: "reminderIntervalMinutes must be at least 5." }, 422);
    }
    // Basic is capped at hourly reminders; Pro can go as frequent as every
    // 5 minutes.
    const minInterval = (await isUserPro(c.env, c.get("userId"))) ? 5 : 60;
    if (body.reminderIntervalMinutes < minInterval) {
      return c.json({ error: `Reminders more frequent than every ${minInterval} minutes require Pro.` }, 422);
    }
  }
  if (body.reminderStartTime != null && !TIME_PATTERN.test(body.reminderStartTime)) {
    return c.json({ error: "reminderStartTime must be HH:MM." }, 422);
  }
  if (body.reminderEndTime != null && !TIME_PATTERN.test(body.reminderEndTime)) {
    return c.json({ error: "reminderEndTime must be HH:MM." }, 422);
  }

  const settings = await updateWaterSettings(c.env, c.get("userId"), body);
  return c.json({ settings: publicWaterSettings(settings) });
});

waterRoute.get("/api/water/logs", async (c) => {
  const date = todayFallback(c.req.query("date"));
  const logs = await listWaterLogsForDate(c.env, c.get("userId"), date);
  return c.json({ date, logs: logs.map(publicWaterLog) });
});

interface CreateWaterLogBody {
  amountMl: number;
}

waterRoute.post("/api/water/logs", async (c) => {
  const body = await c.req.json<Partial<CreateWaterLogBody>>().catch(() => null);
  if (!body?.amountMl || body.amountMl <= 0) {
    return c.json({ error: "A positive amountMl is required." }, 422);
  }

  const log = await createWaterLog(c.env, c.get("userId"), Math.round(body.amountMl));
  return c.json({ log: publicWaterLog(log) }, 201);
});

waterRoute.delete("/api/water/logs/:id", async (c) => {
  const deleted = await deleteWaterLog(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!deleted) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});
