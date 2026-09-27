import type { Env } from "../types";

export type AdminAuditAction =
  | "impersonate_start"
  | "impersonate_end"
  | "suspend_user"
  | "reactivate_user"
  | "delete_user"
  | "moderation_remove";

export async function logAdminAction(
  env: Env,
  adminUserId: number,
  action: AdminAuditAction,
  targetUserId: number | null,
  details?: string
): Promise<void> {
  await env.DB.prepare("INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, details) VALUES (?, ?, ?, ?)")
    .bind(adminUserId, action, targetUserId, details ?? null)
    .run();
}

export interface AdminMetrics {
  totalUsers: number;
  signupsPerDay: { day: string; count: number }[];
  active24h: number;
  active7d: number;
  active30d: number;
}

// Point-in-time active counts (from users.last_seen_at) rather than a
// historical daily-actives trend — there's no dedicated event-log table, so
// "how many were active in the last 24h/7d/30d, right now" is what's
// reliably answerable. Signups-per-day is exact, since users.created_at is
// a real historical record.
export async function getAdminMetrics(env: Env): Promise<AdminMetrics> {
  const [totalRow, signupRows, activeRow] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>(),
    env.DB.prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS count
       FROM users
       WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')
       GROUP BY day ORDER BY day ASC`
    ).all<{ day: string; count: number }>(),
    env.DB.prepare(
      `SELECT
         SUM(CASE WHEN last_seen_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day') THEN 1 ELSE 0 END) AS active24h,
         SUM(CASE WHEN last_seen_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days') THEN 1 ELSE 0 END) AS active7d,
         SUM(CASE WHEN last_seen_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days') THEN 1 ELSE 0 END) AS active30d
       FROM users`
    ).first<{ active24h: number | null; active7d: number | null; active30d: number | null }>(),
  ]);

  return {
    totalUsers: totalRow?.n ?? 0,
    signupsPerDay: signupRows.results,
    active24h: activeRow?.active24h ?? 0,
    active7d: activeRow?.active7d ?? 0,
    active30d: activeRow?.active30d ?? 0,
  };
}

export interface AdminUserRow {
  id: number;
  email: string;
  display_name: string;
  username: string | null;
  created_at: string;
  last_seen_at: string | null;
  suspended_at: string | null;
  email_verified_at: string | null;
  food_log_count: number;
  workout_count: number;
  cardio_count: number;
  checklist_completion_count: number;
}

const USER_LIST_SELECT = `
  SELECT
    u.id, u.email, u.display_name, u.username, u.created_at, u.last_seen_at, u.suspended_at, u.email_verified_at,
    (SELECT COUNT(*) FROM food_logs fl WHERE fl.user_id = u.id) AS food_log_count,
    (SELECT COUNT(*) FROM training_sessions ts WHERE ts.user_id = u.id AND ts.finished_at IS NOT NULL) AS workout_count,
    (SELECT COUNT(*) FROM cardio_sessions cs WHERE cs.user_id = u.id) AS cardio_count,
    (SELECT COUNT(*) FROM checklist_completions cc WHERE cc.user_id = u.id) AS checklist_completion_count
  FROM users u
`;

const PAGE_SIZE = 25;

export async function listAdminUsers(env: Env, query: string, page: number): Promise<{ users: AdminUserRow[]; total: number }> {
  const trimmed = query.trim();
  const where = trimmed ? "WHERE u.email LIKE ?1 OR u.username LIKE ?1 OR u.display_name LIKE ?1" : "";
  const likeParam = `%${trimmed}%`;
  const offset = Math.max(0, page - 1) * PAGE_SIZE;

  const usersQuery = trimmed
    ? env.DB.prepare(`${USER_LIST_SELECT} ${where} ORDER BY u.created_at DESC LIMIT ?2 OFFSET ?3`).bind(likeParam, PAGE_SIZE, offset)
    : env.DB.prepare(`${USER_LIST_SELECT} ORDER BY u.created_at DESC LIMIT ?1 OFFSET ?2`).bind(PAGE_SIZE, offset);

  const countQuery = trimmed
    ? env.DB.prepare(`SELECT COUNT(*) AS n FROM users u ${where}`).bind(likeParam)
    : env.DB.prepare("SELECT COUNT(*) AS n FROM users");

  const [{ results }, countRow] = await Promise.all([usersQuery.all<AdminUserRow>(), countQuery.first<{ n: number }>()]);
  return { users: results, total: countRow?.n ?? 0 };
}

export async function getAdminUserDetail(env: Env, id: number): Promise<AdminUserRow | null> {
  return env.DB.prepare(`${USER_LIST_SELECT} WHERE u.id = ?`).bind(id).first<AdminUserRow>();
}

export interface OAuthIdentityRow {
  provider: "google" | "apple";
  provider_user_id: string;
  created_at: string;
}

export async function listOAuthIdentitiesForUser(env: Env, userId: number): Promise<OAuthIdentityRow[]> {
  const { results } = await env.DB.prepare("SELECT provider, provider_user_id, created_at FROM oauth_identities WHERE user_id = ?")
    .bind(userId)
    .all<OAuthIdentityRow>();
  return results;
}

export interface AdminAuditLogRow {
  id: number;
  admin_user_id: number;
  admin_display_name: string;
  action: AdminAuditAction;
  target_user_id: number | null;
  details: string | null;
  created_at: string;
}

export async function listAuditLogForUser(env: Env, targetUserId: number, limit = 20): Promise<AdminAuditLogRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT aal.*, a.display_name AS admin_display_name
     FROM admin_audit_log aal
     JOIN users a ON a.id = aal.admin_user_id
     WHERE aal.target_user_id = ?
     ORDER BY aal.created_at DESC LIMIT ?`
  )
    .bind(targetUserId, limit)
    .all<AdminAuditLogRow>();
  return results;
}

export async function suspendUser(env: Env, id: number): Promise<void> {
  await env.DB.prepare(
    "UPDATE users SET suspended_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  )
    .bind(id)
    .run();
}

export async function reactivateUser(env: Env, id: number): Promise<void> {
  await env.DB.prepare("UPDATE users SET suspended_at = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
    .bind(id)
    .run();
}

export async function deleteUserAccount(env: Env, id: number): Promise<boolean> {
  const result = await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

export interface ModerationPhotoRow {
  type: "post" | "progress_photo";
  id: number;
  r2Key: string;
  userId: number;
  displayName: string;
  createdAt: string;
}

// Recent post/progress photos for manual spot-review, on top of the
// automatic AI moderation already applied at upload time.
export async function listRecentPhotosForModeration(env: Env, limit = 100): Promise<ModerationPhotoRow[]> {
  const [postRows, photoRows] = await Promise.all([
    env.DB.prepare(
      `SELECT p.id, p.photo_r2_key, p.user_id, u.display_name, p.created_at
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.photo_r2_key IS NOT NULL
       ORDER BY p.created_at DESC LIMIT ?`
    )
      .bind(limit)
      .all<{ id: number; photo_r2_key: string; user_id: number; display_name: string; created_at: string }>(),
    env.DB.prepare(
      `SELECT pp.id, pp.r2_key, pp.user_id, u.display_name, pp.created_at
       FROM progress_photos pp JOIN users u ON u.id = pp.user_id
       ORDER BY pp.created_at DESC LIMIT ?`
    )
      .bind(limit)
      .all<{ id: number; r2_key: string; user_id: number; display_name: string; created_at: string }>(),
  ]);

  const items: ModerationPhotoRow[] = [
    ...postRows.results.map((r) => ({
      type: "post" as const,
      id: r.id,
      r2Key: r.photo_r2_key,
      userId: r.user_id,
      displayName: r.display_name,
      createdAt: r.created_at,
    })),
    ...photoRows.results.map((r) => ({
      type: "progress_photo" as const,
      id: r.id,
      r2Key: r.r2_key,
      userId: r.user_id,
      displayName: r.display_name,
      createdAt: r.created_at,
    })),
  ];
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items.slice(0, limit);
}

export async function removeModeratedPhoto(env: Env, type: "post" | "progress_photo", id: number): Promise<boolean> {
  if (type === "post") {
    const result = await env.DB.prepare("UPDATE posts SET photo_r2_key = NULL WHERE id = ? AND photo_r2_key IS NOT NULL").bind(id).run();
    return (result.meta.changes ?? 0) > 0;
  }
  const result = await env.DB.prepare("DELETE FROM progress_photos WHERE id = ?").bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}
