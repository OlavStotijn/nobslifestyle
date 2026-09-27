import type { Env } from "../types";
import { isItemActiveOnDate, listCollaborators, type ChecklistItemRow } from "./checklist";
import { notifyUser } from "./notifications";
import { localDateInTz, localTimeInTz } from "./time";

interface ReminderCandidateRow extends ChecklistItemRow {
  timezone: string | null;
}

// Adds minutes-since-midnight so "is now within [reminder_time, +5min)" is a
// plain numeric comparison, wrapping cleanly for the rare item whose window
// straddles midnight.
function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function isWithinReminderWindow(nowHHMM: string, reminderHHMM: string, windowMinutes: number): boolean {
  const now = minutesSinceMidnight(nowHHMM);
  const start = minutesSinceMidnight(reminderHHMM);
  const diff = (now - start + 24 * 60) % (24 * 60);
  return diff < windowMinutes;
}

// Runs every 5 minutes (wrangler.jsonc triggers.crons). Loads every
// non-archived item with a reminder set, resolves each owner's timezone in
// JS rather than in SQL (the table is small, and "is it reminder_time for
// this user" genuinely needs a per-row timezone lookup), and pushes to the
// owner plus every accepted collaborator once per item per day.
export async function sendDueChecklistReminders(env: Env): Promise<void> {
  const now = new Date();

  const { results: candidates } = await env.DB.prepare(
    `SELECT ci.*, unp.timezone AS timezone
     FROM checklist_items ci
     LEFT JOIN user_nutrition_profile unp ON unp.user_id = ci.owner_user_id
     WHERE ci.reminder_time IS NOT NULL AND ci.archived_at IS NULL`
  ).all<ReminderCandidateRow>();

  for (const item of candidates) {
    const timezone = item.timezone ?? "Europe/Amsterdam";
    const dateLocal = localDateInTz(now, timezone);
    const nowHHMM = localTimeInTz(now, timezone);

    if (item.last_reminder_sent_date === dateLocal) continue;
    if (!isItemActiveOnDate(item, dateLocal)) continue;
    if (!item.reminder_time || !isWithinReminderWindow(nowHHMM, item.reminder_time, 5)) continue;

    const alreadyDone = await env.DB.prepare(
      "SELECT 1 FROM checklist_completions WHERE checklist_item_id = ? AND user_id = ? AND completed_date_local = ?"
    )
      .bind(item.id, item.owner_user_id, dateLocal)
      .first();
    if (alreadyDone) continue;

    const recipients = [item.owner_user_id];
    const collaborators = await listCollaborators(env, item.id);
    for (const c of collaborators) {
      if (c.status === "accepted") recipients.push(c.user_id);
    }

    // notifyUser (not the bare push helper): this app's push payloads are
    // empty by design — the service worker fetches /api/notifications/latest
    // for the actual text — so the reminder needs a real notifications row
    // or the push would show whatever the recipient's last unrelated
    // notification happened to be.
    await Promise.all(
      recipients.map((userId) =>
        notifyUser(env, userId, {
          type: "checklist_reminder",
          title: "Checklist reminder",
          body: item.title,
          link: "/checklist",
        })
      )
    );

    await env.DB.prepare("UPDATE checklist_items SET last_reminder_sent_date = ? WHERE id = ?").bind(dateLocal, item.id).run();
  }
}
