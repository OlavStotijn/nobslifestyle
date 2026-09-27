import type { Env } from "../types";
import { getUserById } from "./users";

export type ChecklistRecurrence = "none" | "daily" | "weekly";
export type CollabStatus = "pending" | "accepted" | "declined";

export interface ChecklistItemRow {
  id: number;
  owner_user_id: number;
  title: string;
  notes: string | null;
  start_date: string;
  recurrence: ChecklistRecurrence;
  recurrence_weekdays: string | null;
  reminder_time: string | null;
  deadline_time: string | null;
  linked_workout_schema_id: number | null;
  linked_food_item_id: number | null;
  last_reminder_sent_date: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollaboratorRow {
  id: number;
  checklist_item_id: number;
  user_id: number;
  status: CollabStatus;
  created_at: string;
  responded_at: string | null;
}

export function publicChecklistItem(row: ChecklistItemRow) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    notes: row.notes,
    startDate: row.start_date,
    recurrence: row.recurrence,
    recurrenceWeekdays: row.recurrence_weekdays ? row.recurrence_weekdays.split(",").map(Number) : [],
    reminderTime: row.reminder_time,
    deadlineTime: row.deadline_time,
    linkedWorkoutSchemaId: row.linked_workout_schema_id,
    linkedFoodItemId: row.linked_food_item_id,
    archivedAt: row.archived_at,
  };
}

// none -> only its own start_date; daily -> any date from start_date on;
// weekly -> weekday-of-date is one of recurrence_weekdays, from start_date on.
export function isItemActiveOnDate(item: ChecklistItemRow, dateLocal: string): boolean {
  if (dateLocal < item.start_date) return false;
  if (item.recurrence === "none") return dateLocal === item.start_date;
  if (item.recurrence === "daily") return true;

  const [y, m, d] = dateLocal.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  const allowedDays = (item.recurrence_weekdays ?? "").split(",").filter(Boolean).map(Number);
  return allowedDays.includes(weekday);
}

export interface CreateChecklistItemInput {
  title: string;
  notes?: string | null;
  startDate: string;
  recurrence: ChecklistRecurrence;
  recurrenceWeekdays?: number[];
  reminderTime?: string | null;
  deadlineTime?: string | null;
  linkedWorkoutSchemaId?: number | null;
  linkedFoodItemId?: number | null;
}

export async function getChecklistItemById(env: Env, id: number): Promise<ChecklistItemRow | null> {
  return env.DB.prepare("SELECT * FROM checklist_items WHERE id = ?").bind(id).first<ChecklistItemRow>();
}

export async function createChecklistItem(env: Env, ownerUserId: number, input: CreateChecklistItemInput): Promise<ChecklistItemRow> {
  const weekdaysStr =
    input.recurrence === "weekly" && input.recurrenceWeekdays && input.recurrenceWeekdays.length > 0
      ? input.recurrenceWeekdays.join(",")
      : null;

  const result = await env.DB.prepare(
    `INSERT INTO checklist_items
       (owner_user_id, title, notes, start_date, recurrence, recurrence_weekdays,
        reminder_time, deadline_time, linked_workout_schema_id, linked_food_item_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      ownerUserId,
      input.title,
      input.notes ?? null,
      input.startDate,
      input.recurrence,
      weekdaysStr,
      input.reminderTime ?? null,
      input.deadlineTime ?? null,
      input.linkedWorkoutSchemaId ?? null,
      input.linkedFoodItemId ?? null
    )
    .run();

  const id = result.meta.last_row_id as number;
  const row = await getChecklistItemById(env, id);
  if (!row) throw new Error("Failed to load newly created checklist item.");
  return row;
}

export interface UpdateChecklistItemInput {
  title?: string;
  notes?: string | null;
  reminderTime?: string | null;
  deadlineTime?: string | null;
  linkedWorkoutSchemaId?: number | null;
  linkedFoodItemId?: number | null;
  archived?: boolean;
}

export async function updateChecklistItem(
  env: Env,
  ownerUserId: number,
  id: number,
  input: UpdateChecklistItemInput
): Promise<ChecklistItemRow | null> {
  const existing = await env.DB.prepare("SELECT * FROM checklist_items WHERE id = ? AND owner_user_id = ?")
    .bind(id, ownerUserId)
    .first<ChecklistItemRow>();
  if (!existing) return null;

  await env.DB.prepare(
    `UPDATE checklist_items SET
       title = ?, notes = ?, reminder_time = ?, deadline_time = ?,
       linked_workout_schema_id = ?, linked_food_item_id = ?,
       archived_at = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  )
    .bind(
      input.title ?? existing.title,
      input.notes !== undefined ? input.notes : existing.notes,
      input.reminderTime !== undefined ? input.reminderTime : existing.reminder_time,
      input.deadlineTime !== undefined ? input.deadlineTime : existing.deadline_time,
      input.linkedWorkoutSchemaId !== undefined ? input.linkedWorkoutSchemaId : existing.linked_workout_schema_id,
      input.linkedFoodItemId !== undefined ? input.linkedFoodItemId : existing.linked_food_item_id,
      input.archived ? new Date().toISOString() : existing.archived_at,
      id
    )
    .run();

  return getChecklistItemById(env, id);
}

export async function deleteChecklistItem(env: Env, ownerUserId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM checklist_items WHERE id = ? AND owner_user_id = ?").bind(id, ownerUserId).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function inviteCollaborator(env: Env, checklistItemId: number, userId: number): Promise<void> {
  await env.DB.prepare("INSERT INTO checklist_collaborators (checklist_item_id, user_id) VALUES (?, ?)")
    .bind(checklistItemId, userId)
    .run();
}

export async function listCollaborators(env: Env, checklistItemId: number): Promise<CollaboratorRow[]> {
  const { results } = await env.DB.prepare("SELECT * FROM checklist_collaborators WHERE checklist_item_id = ?")
    .bind(checklistItemId)
    .all<CollaboratorRow>();
  return results;
}

// Returns the collaborator row (post-update) so the route can look up the
// item owner to notify, or null if there was nothing pending to respond to.
export async function respondToCollabInvite(env: Env, userId: number, collaboratorId: number, accept: boolean): Promise<CollaboratorRow | null> {
  const result = await env.DB.prepare(
    "UPDATE checklist_collaborators SET status = ?, responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND user_id = ? AND status = 'pending'"
  )
    .bind(accept ? "accepted" : "declined", collaboratorId, userId)
    .run();
  if ((result.meta.changes ?? 0) === 0) return null;
  return env.DB.prepare("SELECT * FROM checklist_collaborators WHERE id = ?").bind(collaboratorId).first<CollaboratorRow>();
}

export async function listPendingInvitesForUser(env: Env, userId: number) {
  const { results } = await env.DB.prepare(
    `SELECT cc.id AS collaboratorId, cc.checklist_item_id AS checklistItemId, ci.title,
            ci.owner_user_id AS ownerUserId, u.display_name AS ownerDisplayName
     FROM checklist_collaborators cc
     JOIN checklist_items ci ON ci.id = cc.checklist_item_id
     JOIN users u ON u.id = ci.owner_user_id
     WHERE cc.user_id = ? AND cc.status = 'pending'
     ORDER BY cc.created_at DESC`
  )
    .bind(userId)
    .all<{ collaboratorId: number; checklistItemId: number; title: string; ownerUserId: number; ownerDisplayName: string }>();
  return results;
}

async function listCompletionsForItemAndDate(env: Env, checklistItemId: number, dateLocal: string): Promise<number[]> {
  const { results } = await env.DB.prepare(
    "SELECT user_id FROM checklist_completions WHERE checklist_item_id = ? AND completed_date_local = ?"
  )
    .bind(checklistItemId, dateLocal)
    .all<{ user_id: number }>();
  return results.map((r) => r.user_id);
}

// Returns the new state (true = now complete) for the given user/date.
export async function toggleCompletion(env: Env, checklistItemId: number, userId: number, dateLocal: string): Promise<boolean> {
  const existing = await env.DB.prepare(
    "SELECT id FROM checklist_completions WHERE checklist_item_id = ? AND user_id = ? AND completed_date_local = ?"
  )
    .bind(checklistItemId, userId, dateLocal)
    .first<{ id: number }>();

  if (existing) {
    await env.DB.prepare("DELETE FROM checklist_completions WHERE id = ?").bind(existing.id).run();
    return false;
  }
  await env.DB.prepare("INSERT INTO checklist_completions (checklist_item_id, user_id, completed_date_local) VALUES (?, ?, ?)")
    .bind(checklistItemId, userId, dateLocal)
    .run();
  return true;
}

async function markCompletion(env: Env, checklistItemId: number, userId: number, dateLocal: string): Promise<void> {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO checklist_completions (checklist_item_id, user_id, completed_date_local) VALUES (?, ?, ?)"
  )
    .bind(checklistItemId, userId, dateLocal)
    .run();
}

export interface ChecklistParticipant {
  userId: number;
  displayName: string;
  completed: boolean;
}

export interface ChecklistItemInstance {
  id: number;
  title: string;
  notes: string | null;
  ownerUserId: number;
  ownerDisplayName: string;
  reminderTime: string | null;
  deadlineTime: string | null;
  linkedWorkoutSchemaId: number | null;
  linkedWorkoutSchemaName: string | null;
  linkedFoodItemId: number | null;
  linkedFoodItemName: string | null;
  myCompleted: boolean;
  done: boolean;
  participants: ChecklistParticipant[];
  pendingCollaborators: { collaboratorId: number; userId: number; displayName: string }[];
}

interface ItemJoinRow extends ChecklistItemRow {
  owner_display_name: string;
  linked_workout_schema_name: string | null;
  linked_food_item_name: string | null;
}

const ITEM_JOIN_SELECT = `
  SELECT ci.*, u.display_name AS owner_display_name,
         ws.name AS linked_workout_schema_name, fi.name AS linked_food_item_name
  FROM checklist_items ci
  JOIN users u ON u.id = ci.owner_user_id
  LEFT JOIN workout_schemas ws ON ws.id = ci.linked_workout_schema_id
  LEFT JOIN food_items fi ON fi.id = ci.linked_food_item_id
`;

// Items the user owns, plus items where the user is an accepted
// collaborator — filtered to those active on `dateLocal`, with per-user
// completion state joined in. A collab item counts as "done" for a date
// only once every accepted participant (owner included) has ticked it.
export async function listItemInstancesForDate(env: Env, userId: number, dateLocal: string): Promise<ChecklistItemInstance[]> {
  const { results: ownedRows } = await env.DB.prepare(`${ITEM_JOIN_SELECT} WHERE ci.owner_user_id = ? AND ci.archived_at IS NULL`)
    .bind(userId)
    .all<ItemJoinRow>();

  const { results: collabRows } = await env.DB.prepare(
    `${ITEM_JOIN_SELECT}
     JOIN checklist_collaborators cc ON cc.checklist_item_id = ci.id
     WHERE cc.user_id = ? AND cc.status = 'accepted' AND ci.archived_at IS NULL`
  )
    .bind(userId)
    .all<ItemJoinRow>();

  const rows = [...ownedRows, ...collabRows];
  const instances: ChecklistItemInstance[] = [];

  for (const row of rows) {
    if (!isItemActiveOnDate(row, dateLocal)) continue;

    const collaborators = await listCollaborators(env, row.id);
    const accepted = collaborators.filter((c) => c.status === "accepted");
    const pending = collaborators.filter((c) => c.status === "pending");
    const completions = await listCompletionsForItemAndDate(env, row.id, dateLocal);

    const participants: ChecklistParticipant[] = [
      { userId: row.owner_user_id, displayName: row.owner_display_name, completed: completions.includes(row.owner_user_id) },
    ];
    for (const c of accepted) {
      const u = await getUserById(env, c.user_id);
      participants.push({ userId: c.user_id, displayName: u?.display_name ?? "Unknown", completed: completions.includes(c.user_id) });
    }

    const pendingCollaborators = [];
    for (const p of pending) {
      const u = await getUserById(env, p.user_id);
      pendingCollaborators.push({ collaboratorId: p.id, userId: p.user_id, displayName: u?.display_name ?? "Unknown" });
    }

    instances.push({
      id: row.id,
      title: row.title,
      notes: row.notes,
      ownerUserId: row.owner_user_id,
      ownerDisplayName: row.owner_display_name,
      reminderTime: row.reminder_time,
      deadlineTime: row.deadline_time,
      linkedWorkoutSchemaId: row.linked_workout_schema_id,
      linkedWorkoutSchemaName: row.linked_workout_schema_name,
      linkedFoodItemId: row.linked_food_item_id,
      linkedFoodItemName: row.linked_food_item_name,
      myCompleted: completions.includes(userId),
      done: participants.every((p) => p.completed),
      participants,
      pendingCollaborators,
    });
  }

  return instances.sort((a, b) => (a.reminderTime ?? "99:99").localeCompare(b.reminderTime ?? "99:99"));
}

// Fire-and-forget hook called after a workout finishes or a food item gets
// logged — auto-ticks any of the user's active checklist items linked to
// that same workout schema / food item for that day.
export async function autoCompleteLinkedChecklistItems(
  env: Env,
  userId: number,
  params: { workoutSchemaId?: number | null; foodItemId?: number | null; dateLocal: string }
): Promise<void> {
  if (params.workoutSchemaId == null && params.foodItemId == null) return;

  const { results } = await env.DB.prepare(
    `SELECT ci.* FROM checklist_items ci
     WHERE ci.archived_at IS NULL AND (
       ci.owner_user_id = ?
       OR ci.id IN (SELECT checklist_item_id FROM checklist_collaborators WHERE user_id = ? AND status = 'accepted')
     )`
  )
    .bind(userId, userId)
    .all<ChecklistItemRow>();

  for (const item of results) {
    if (!isItemActiveOnDate(item, params.dateLocal)) continue;
    const matchesWorkout = params.workoutSchemaId != null && item.linked_workout_schema_id === params.workoutSchemaId;
    const matchesFood = params.foodItemId != null && item.linked_food_item_id === params.foodItemId;
    if (matchesWorkout || matchesFood) await markCompletion(env, item.id, userId, params.dateLocal);
  }
}

export async function upsertChecklistSnapshot(env: Env, userId: number, dateLocal: string): Promise<{ doneCount: number; totalCount: number }> {
  const instances = await listItemInstancesForDate(env, userId, dateLocal);
  const done = instances.filter((i) => i.done);
  const doneTitles = JSON.stringify(done.map((i) => i.title));

  await env.DB.prepare(
    `INSERT INTO checklist_snapshots (user_id, snapshot_date_local, done_count, total_count, done_titles)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, snapshot_date_local) DO UPDATE SET
       done_count = excluded.done_count, total_count = excluded.total_count, done_titles = excluded.done_titles`
  )
    .bind(userId, dateLocal, done.length, instances.length, doneTitles)
    .run();

  return { doneCount: done.length, totalCount: instances.length };
}
