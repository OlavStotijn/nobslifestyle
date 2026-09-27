import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import {
  createChecklistItem,
  deleteChecklistItem,
  getChecklistItemById,
  inviteCollaborator,
  listItemInstancesForDate,
  listPendingInvitesForUser,
  publicChecklistItem,
  respondToCollabInvite,
  toggleCompletion,
  updateChecklistItem,
  upsertChecklistSnapshot,
  type ChecklistRecurrence,
} from "../lib/checklist";
import { areFriends } from "../lib/friendships";
import { getSchemaOwned } from "../lib/schemas";
import { getFoodItemById } from "../lib/foodItems";
import { getUserById } from "../lib/users";
import { notifyUser } from "../lib/notifications";
import { getNutritionProfile } from "../lib/nutritionProfile";
import { localDateInTz } from "../lib/time";

export const checklistRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

checklistRoute.use("/api/checklist/*", requireAuth);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_RECURRENCE: ChecklistRecurrence[] = ["none", "daily", "weekly"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

async function todayFor(env: Env, userId: number): Promise<string> {
  const profile = await getNutritionProfile(env, userId);
  return localDateInTz(new Date(), profile?.timezone ?? "Europe/Amsterdam");
}

function dateParam(c: { req: { query: (name: string) => string | undefined } }, fallback: string): string {
  const raw = c.req.query("date");
  return raw && DATE_PATTERN.test(raw) ? raw : fallback;
}

checklistRoute.get("/api/checklist/items", async (c) => {
  const userId = c.get("userId");
  const date = dateParam(c, await todayFor(c.env, userId));
  const items = await listItemInstancesForDate(c.env, userId, date);
  return c.json({ date, items });
});

// Registered before the create/list handlers below so route order is clear:
// only the owner can fetch the raw definition (for the edit form).
checklistRoute.get("/api/checklist/items/:id", async (c) => {
  const item = await getChecklistItemById(c.env, Number(c.req.param("id")));
  if (!item || item.owner_user_id !== c.get("userId")) return c.json({ error: "Not found." }, 404);

  const [schema, foodItem] = await Promise.all([
    item.linked_workout_schema_id ? getSchemaOwned(c.env, c.get("userId"), item.linked_workout_schema_id) : null,
    item.linked_food_item_id ? getFoodItemById(c.env, item.linked_food_item_id) : null,
  ]);

  return c.json({
    item: { ...publicChecklistItem(item), linkedWorkoutSchemaName: schema?.name ?? null, linkedFoodItemName: foodItem?.name ?? null },
  });
});

checklistRoute.get("/api/checklist/pending-invites", async (c) => {
  const invites = await listPendingInvitesForUser(c.env, c.get("userId"));
  return c.json({ invites });
});

interface CreateChecklistItemBody {
  title: string;
  notes?: string;
  startDate?: string;
  recurrence?: ChecklistRecurrence;
  recurrenceWeekdays?: number[];
  reminderTime?: string;
  deadlineTime?: string;
  linkedWorkoutSchemaId?: number;
  linkedFoodItemId?: number;
  collaboratorUserId?: number;
}

checklistRoute.post("/api/checklist/items", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<Partial<CreateChecklistItemBody>>().catch(() => null);
  if (!body?.title?.trim()) return c.json({ error: "A title is required." }, 422);

  const recurrence = body.recurrence && VALID_RECURRENCE.includes(body.recurrence) ? body.recurrence : "none";
  if (recurrence === "weekly" && (!body.recurrenceWeekdays || body.recurrenceWeekdays.length === 0)) {
    return c.json({ error: "Pick at least one weekday for a weekly repeat." }, 422);
  }
  if (body.reminderTime && !TIME_PATTERN.test(body.reminderTime)) {
    return c.json({ error: "reminderTime must be HH:MM." }, 422);
  }
  if (body.deadlineTime && !TIME_PATTERN.test(body.deadlineTime)) {
    return c.json({ error: "deadlineTime must be HH:MM." }, 422);
  }

  if (body.linkedWorkoutSchemaId) {
    const schema = await getSchemaOwned(c.env, userId, body.linkedWorkoutSchemaId);
    if (!schema) return c.json({ error: "Workout not found." }, 422);
  }
  if (body.linkedFoodItemId) {
    const item = await getFoodItemById(c.env, body.linkedFoodItemId);
    if (!item) return c.json({ error: "Food item not found." }, 422);
  }

  let collaboratorUserId: number | null = null;
  if (body.collaboratorUserId) {
    if (body.collaboratorUserId === userId) return c.json({ error: "You can't tag yourself." }, 422);
    const friends = await areFriends(c.env, userId, body.collaboratorUserId);
    if (!friends) return c.json({ error: "You can only tag friends on a checklist item." }, 422);
    collaboratorUserId = body.collaboratorUserId;
  }

  const startDate = body.startDate && DATE_PATTERN.test(body.startDate) ? body.startDate : await todayFor(c.env, userId);

  const item = await createChecklistItem(c.env, userId, {
    title: body.title.trim(),
    notes: body.notes?.trim() || null,
    startDate,
    recurrence,
    recurrenceWeekdays: body.recurrenceWeekdays,
    reminderTime: body.reminderTime ?? null,
    deadlineTime: body.deadlineTime ?? null,
    linkedWorkoutSchemaId: body.linkedWorkoutSchemaId ?? null,
    linkedFoodItemId: body.linkedFoodItemId ?? null,
  });

  if (collaboratorUserId) {
    await inviteCollaborator(c.env, item.id, collaboratorUserId);
    const owner = await getUserById(c.env, userId);
    c.executionCtx.waitUntil(
      notifyUser(c.env, collaboratorUserId, {
        type: "checklist_invite",
        title: "Checklist invite",
        body: `${owner?.display_name ?? "Someone"} wants to team up on "${item.title}"`,
        link: "/checklist",
      })
    );
  }

  return c.json({ item: publicChecklistItem(item) }, 201);
});

interface UpdateChecklistItemBody {
  title?: string;
  notes?: string | null;
  reminderTime?: string | null;
  deadlineTime?: string | null;
  linkedWorkoutSchemaId?: number | null;
  linkedFoodItemId?: number | null;
  archived?: boolean;
}

checklistRoute.patch("/api/checklist/items/:id", async (c) => {
  const userId = c.get("userId");
  const id = Number(c.req.param("id"));
  const body = await c.req.json<UpdateChecklistItemBody>().catch(() => null);
  if (!body) return c.json({ error: "Invalid body." }, 422);

  if (body.reminderTime && !TIME_PATTERN.test(body.reminderTime)) {
    return c.json({ error: "reminderTime must be HH:MM." }, 422);
  }
  if (body.deadlineTime && !TIME_PATTERN.test(body.deadlineTime)) {
    return c.json({ error: "deadlineTime must be HH:MM." }, 422);
  }
  if (body.linkedWorkoutSchemaId) {
    const schema = await getSchemaOwned(c.env, userId, body.linkedWorkoutSchemaId);
    if (!schema) return c.json({ error: "Workout not found." }, 422);
  }
  if (body.linkedFoodItemId) {
    const item = await getFoodItemById(c.env, body.linkedFoodItemId);
    if (!item) return c.json({ error: "Food item not found." }, 422);
  }

  const item = await updateChecklistItem(c.env, userId, id, body);
  if (!item) return c.json({ error: "Not found." }, 404);
  return c.json({ item: publicChecklistItem(item) });
});

checklistRoute.delete("/api/checklist/items/:id", async (c) => {
  const ok = await deleteChecklistItem(c.env, c.get("userId"), Number(c.req.param("id")));
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

checklistRoute.post("/api/checklist/items/:id/toggle", async (c) => {
  const userId = c.get("userId");
  const id = Number(c.req.param("id"));
  const item = await getChecklistItemById(c.env, id);
  if (!item) return c.json({ error: "Not found." }, 404);

  const date = dateParam(c, await todayFor(c.env, userId));
  const completed = await toggleCompletion(c.env, id, userId, date);
  return c.json({ completed });
});

interface RespondCollabBody {
  accept: boolean;
}

checklistRoute.post("/api/checklist/collab/:id/respond", async (c) => {
  const userId = c.get("userId");
  const collaboratorId = Number(c.req.param("id"));
  const body = await c.req.json<Partial<RespondCollabBody>>().catch(() => null);
  if (typeof body?.accept !== "boolean") return c.json({ error: "accept (boolean) is required." }, 422);

  const updated = await respondToCollabInvite(c.env, userId, collaboratorId, body.accept);
  if (!updated) return c.json({ error: "Not found." }, 404);

  if (body.accept) {
    const item = await getChecklistItemById(c.env, updated.checklist_item_id);
    const responder = await getUserById(c.env, userId);
    if (item) {
      c.executionCtx.waitUntil(
        notifyUser(c.env, item.owner_user_id, {
          type: "checklist_accepted",
          title: "Checklist invite accepted",
          body: `${responder?.display_name ?? "Someone"} joined "${item.title}"`,
          link: "/checklist",
        })
      );
    }
  }

  return c.json({ ok: true });
});

interface ShareBody {
  date?: string;
}

checklistRoute.post("/api/checklist/share", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<Partial<ShareBody>>().catch(() => null);
  const date = body?.date && DATE_PATTERN.test(body.date) ? body.date : await todayFor(c.env, userId);

  const snapshot = await upsertChecklistSnapshot(c.env, userId, date);
  return c.json({ ok: true, ...snapshot });
});
