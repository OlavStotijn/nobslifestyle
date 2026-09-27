import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import {
  createCardioSession,
  deleteCardioSession,
  getCardioSessionOwned,
  getCardioTrend,
  listCardioSessions,
  listCardioSessionsForDate,
  publicCardioSession,
  updateCardioSession,
  type ActivityType,
} from "../lib/cardioSessions";
import { getNutritionProfile } from "../lib/nutritionProfile";

export const cardioRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

cardioRoute.use("/api/cardio-sessions*", requireAuth);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_ACTIVITY: ActivityType[] = ["running", "cycling"];

cardioRoute.get("/api/cardio-sessions", async (c) => {
  const date = c.req.query("date");
  if (date && DATE_PATTERN.test(date)) {
    const sessions = await listCardioSessionsForDate(c.env, c.get("userId"), date);
    return c.json({ sessions: sessions.map(publicCardioSession) });
  }
  const sessions = await listCardioSessions(c.env, c.get("userId"));
  return c.json({ sessions: sessions.map(publicCardioSession) });
});

// Registered before /:id so "reports" isn't swallowed as a session id param.
cardioRoute.get("/api/cardio-sessions/reports", async (c) => {
  const userId = c.get("userId");
  const weeks = Math.min(52, Math.max(1, Number(c.req.query("weeks")) || 12));
  const profile = await getNutritionProfile(c.env, userId);
  const trend = await getCardioTrend(c.env, userId, profile?.timezone ?? "Europe/Amsterdam", weeks);
  return c.json({ trend });
});

cardioRoute.get("/api/cardio-sessions/:id", async (c) => {
  const session = await getCardioSessionOwned(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!session) return c.json({ error: "Not found." }, 404);
  return c.json({ session: publicCardioSession(session) });
});

interface CreateCardioSessionBody {
  activityType: ActivityType;
  startedAt: string;
  finishedAt: string;
  distanceM: number;
  durationS: number;
  route?: { lat: number; lng: number; t: number }[];
  subtractFromIntake?: boolean;
}

cardioRoute.post("/api/cardio-sessions", async (c) => {
  const body = await c.req.json<Partial<CreateCardioSessionBody>>().catch(() => null);
  if (
    !body?.activityType ||
    !VALID_ACTIVITY.includes(body.activityType) ||
    !body.startedAt ||
    !body.finishedAt ||
    body.distanceM == null ||
    body.distanceM < 0 ||
    body.durationS == null ||
    body.durationS <= 0
  ) {
    return c.json({ error: "activityType, startedAt, finishedAt, distanceM, and durationS are required." }, 422);
  }

  const session = await createCardioSession(c.env, c.get("userId"), {
    activityType: body.activityType,
    startedAt: body.startedAt,
    finishedAt: body.finishedAt,
    distanceM: body.distanceM,
    durationS: body.durationS,
    route: body.route,
    subtractFromIntake: body.subtractFromIntake ?? true,
  });

  return c.json({ session: publicCardioSession(session) }, 201);
});

interface UpdateCardioSessionBody {
  subtractFromIntake?: boolean;
  rating?: number;
  notes?: string;
}

cardioRoute.patch("/api/cardio-sessions/:id", async (c) => {
  const body = await c.req.json<UpdateCardioSessionBody>().catch(() => null);
  if (body?.rating != null && (body.rating < 1 || body.rating > 5)) {
    return c.json({ error: "rating must be between 1 and 5." }, 422);
  }

  const session = await updateCardioSession(c.env, c.get("userId"), Number(c.req.param("id")), body ?? {});
  if (!session) return c.json({ error: "Not found." }, 404);
  return c.json({ session: publicCardioSession(session) });
});

cardioRoute.delete("/api/cardio-sessions/:id", async (c) => {
  const ok = await deleteCardioSession(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});
