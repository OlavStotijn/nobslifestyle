import type { Env } from "../types";

export type ReportTargetType = "post" | "comment" | "user";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "other";
export const REPORT_REASONS: ReportReason[] = ["spam", "harassment", "inappropriate", "other"];

// SQL fragment: true when the viewer and the row's author column have a block
// between them in either direction. Blocking is mutual for visibility.
// The viewer id is interpolated as a coerced integer (never user text), so
// callers don't need extra bind parameters.
export function blockedEitherWay(viewerId: number, authorColumn: string): string {
  const v = Math.trunc(Number(viewerId));
  return `EXISTS (SELECT 1 FROM user_blocks ub WHERE (ub.blocker_id = ${v} AND ub.blocked_id = ${authorColumn}) OR (ub.blocker_id = ${authorColumn} AND ub.blocked_id = ${v}))`;
}

export async function isBlockedEitherWay(env: Env, userA: number, userB: number): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)"
  )
    .bind(userA, userB, userB, userA)
    .first();
  return row != null;
}

// Also severs any friendship or pending request between the pair.
export async function blockUser(env: Env, blockerId: number, blockedId: number): Promise<"blocked" | "self" | "not_found"> {
  if (blockerId === blockedId) return "self";
  const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(blockedId).first();
  if (!target) return "not_found";

  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)").bind(blockerId, blockedId),
    env.DB.prepare(
      "DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)"
    ).bind(blockerId, blockedId, blockedId, blockerId),
  ]);
  return "blocked";
}

export async function unblockUser(env: Env, blockerId: number, blockedId: number): Promise<void> {
  await env.DB.prepare("DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?").bind(blockerId, blockedId).run();
}

export async function listBlockedUsers(env: Env, blockerId: number) {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.display_name, u.username, u.avatar_r2_key
     FROM user_blocks ub JOIN users u ON u.id = ub.blocked_id
     WHERE ub.blocker_id = ? ORDER BY ub.created_at DESC`
  )
    .bind(blockerId)
    .all<{ id: number; display_name: string; username: string | null; avatar_r2_key: string | null }>();
  return results.map((u) => ({
    id: u.id,
    displayName: u.display_name,
    username: u.username,
    avatarUrl: u.avatar_r2_key ? `/api/media/${u.avatar_r2_key}` : null,
  }));
}

// Resolves who authored the reported content; null if it doesn't exist.
async function resolveTargetUserId(env: Env, type: ReportTargetType, id: number): Promise<number | null> {
  const sql =
    type === "post"
      ? "SELECT user_id AS uid FROM posts WHERE id = ?"
      : type === "comment"
        ? "SELECT user_id AS uid FROM post_comments WHERE id = ?"
        : "SELECT id AS uid FROM users WHERE id = ?";
  const row = await env.DB.prepare(sql).bind(id).first<{ uid: number }>();
  return row?.uid ?? null;
}

export async function createReport(
  env: Env,
  reporterId: number,
  type: ReportTargetType,
  targetId: number,
  reason: ReportReason,
  details: string | null
): Promise<"reported" | "not_found" | "self"> {
  const targetUserId = await resolveTargetUserId(env, type, targetId);
  if (targetUserId == null) return "not_found";
  if (targetUserId === reporterId) return "self";

  await env.DB.prepare(
    "INSERT INTO reports (reporter_id, target_type, target_id, target_user_id, reason, details) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(reporterId, type, targetId, targetUserId, reason, details)
    .run();
  return "reported";
}

export interface AdminReportRow {
  id: number;
  target_type: ReportTargetType;
  target_id: number;
  target_user_id: number;
  reason: ReportReason;
  details: string | null;
  created_at: string;
  reporter_name: string;
  target_name: string;
  content: string | null;
}

export async function listOpenReports(env: Env, limit = 100): Promise<AdminReportRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.target_type, r.target_id, r.target_user_id, r.reason, r.details, r.created_at,
            rep.display_name AS reporter_name, tu.display_name AS target_name,
            CASE r.target_type
              WHEN 'post' THEN (SELECT COALESCE(p.caption, '(no caption)') FROM posts p WHERE p.id = r.target_id)
              WHEN 'comment' THEN (SELECT pc.body FROM post_comments pc WHERE pc.id = r.target_id)
              ELSE NULL
            END AS content
     FROM reports r
     JOIN users rep ON rep.id = r.reporter_id
     JOIN users tu ON tu.id = r.target_user_id
     WHERE r.status = 'open' ORDER BY r.created_at ASC LIMIT ?`
  )
    .bind(limit)
    .all<AdminReportRow>();
  return results;
}

export async function resolveReport(env: Env, id: number, removeContent: boolean): Promise<boolean> {
  const report = await env.DB.prepare("SELECT target_type, target_id FROM reports WHERE id = ? AND status = 'open'")
    .bind(id)
    .first<{ target_type: ReportTargetType; target_id: number }>();
  if (!report) return false;

  const stmts = [];
  if (removeContent && report.target_type === "post") {
    stmts.push(env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(report.target_id));
  } else if (removeContent && report.target_type === "comment") {
    stmts.push(env.DB.prepare("DELETE FROM post_comments WHERE id = ?").bind(report.target_id));
  }
  // Every open report about the same content is settled together.
  stmts.push(
    env.DB.prepare(
      "UPDATE reports SET status = 'resolved', resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE status = 'open' AND target_type = ? AND target_id = ?"
    ).bind(report.target_type, report.target_id)
  );
  await env.DB.batch(stmts);
  return true;
}

// Deletes the account and everything it owns. Rows cascade via FKs; R2
// objects don't, so they're collected first and removed afterwards.
export async function deleteOwnAccount(env: Env, userId: number): Promise<void> {
  const [avatar, posts, photos] = await Promise.all([
    env.DB.prepare("SELECT avatar_r2_key AS k FROM users WHERE id = ?").bind(userId).all<{ k: string | null }>(),
    env.DB.prepare("SELECT photo_r2_key AS k FROM posts WHERE user_id = ? AND photo_r2_key IS NOT NULL").bind(userId).all<{ k: string }>(),
    env.DB.prepare("SELECT r2_key AS k FROM progress_photos WHERE user_id = ?").bind(userId).all<{ k: string }>(),
  ]);
  const keys = [...avatar.results, ...posts.results, ...photos.results].map((r) => r.k).filter((k): k is string => !!k);

  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
  if (keys.length > 0) await env.MEDIA.delete(keys);
}
