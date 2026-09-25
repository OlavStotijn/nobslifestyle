import type { Env } from "../types";
import { listSubscriptionsForUser, deleteSubscriptionByEndpoint } from "./pushSubscriptions";
import { sendWebPush } from "./webPush";

export type NotificationType = "friend_request" | "friend_accepted" | "post_comment" | "post_like";

export interface NotificationRow {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function publicNotification(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    read: row.read_at != null,
    createdAt: row.created_at,
  };
}

export async function createNotification(
  env: Env,
  userId: number,
  params: { type: NotificationType; title: string; body: string; link?: string }
): Promise<NotificationRow> {
  const result = await env.DB.prepare(
    "INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(userId, params.type, params.title, params.body, params.link ?? null)
    .run();
  const id = result.meta.last_row_id as number;
  const row = await env.DB.prepare("SELECT * FROM notifications WHERE id = ?").bind(id).first<NotificationRow>();
  if (!row) throw new Error("Failed to load newly created notification.");
  return row;
}

// Fire-and-forget: intended to be wrapped in c.executionCtx.waitUntil() by
// the caller so it never blocks the response that triggered it.
export async function pushToUser(env: Env, userId: number): Promise<void> {
  const subs = await listSubscriptionsForUser(env, userId);
  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendWebPush(env, sub);
      if (result === "expired") await deleteSubscriptionByEndpoint(env, sub.endpoint);
    })
  );
}

export async function notifyUser(
  env: Env,
  userId: number,
  params: { type: NotificationType; title: string; body: string; link?: string }
): Promise<void> {
  await createNotification(env, userId, params);
  await pushToUser(env, userId);
}

export async function listNotifications(env: Env, userId: number, limit = 30): Promise<NotificationRow[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
  )
    .bind(userId, limit)
    .all<NotificationRow>();
  return results;
}

export async function getLatestNotification(env: Env, userId: number): Promise<NotificationRow | null> {
  return env.DB.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").bind(userId).first<NotificationRow>();
}

export async function countUnread(env: Env, userId: number): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function markAllRead(env: Env, userId: number): Promise<void> {
  await env.DB.prepare("UPDATE notifications SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ? AND read_at IS NULL")
    .bind(userId)
    .run();
}
