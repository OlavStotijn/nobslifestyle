import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import { getUserById, publicUser } from "../lib/users";
import { makeSessionCookie } from "../lib/session";
import { listOpenReports, resolveReport } from "../lib/safety";
import {
  deleteUserAccount,
  getAdminMetrics,
  getAdminUserDetail,
  listAdminUsers,
  listAuditLogForUser,
  listOAuthIdentitiesForUser,
  listRecentPhotosForModeration,
  logAdminAction,
  reactivateUser,
  removeModeratedPhoto,
  suspendUser,
} from "../lib/admin";

export const adminRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

adminRoute.use("/api/admin/*", requireAuth);

function publicAdminUser(u: {
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
}) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    username: u.username,
    createdAt: u.created_at,
    lastSeenAt: u.last_seen_at,
    suspendedAt: u.suspended_at,
    emailVerified: u.email_verified_at !== null,
    usage: {
      foodLogs: u.food_log_count,
      workouts: u.workout_count,
      cardioSessions: u.cardio_count,
      checklistCompletions: u.checklist_completion_count,
    },
  };
}

// Only needs requireAuth, not requireAdmin — while impersonating, the
// current session's userId IS the target user, so requireAdmin would
// correctly (but unhelpfully) reject it. This route checks impersonatedBy
// itself instead.
adminRoute.post("/api/admin/return", async (c) => {
  const impersonatedBy = c.get("impersonatedBy");
  if (impersonatedBy == null) return c.json({ error: "Not currently impersonating." }, 422);

  const admin = await getUserById(c.env, impersonatedBy);
  if (!admin) return c.json({ error: "Not found." }, 404);

  const cookie = await makeSessionCookie(c.env, admin.id, admin.token_version);
  c.header("Set-Cookie", cookie);
  await logAdminAction(c.env, admin.id, "impersonate_end", c.get("userId"), `Ended impersonation of user #${c.get("userId")}`);

  return c.json({ ok: true });
});

adminRoute.get("/api/admin/metrics", requireAdmin, async (c) => {
  const metrics = await getAdminMetrics(c.env);
  return c.json(metrics);
});

adminRoute.get("/api/admin/users", requireAdmin, async (c) => {
  const q = c.req.query("q") ?? "";
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const { users, total } = await listAdminUsers(c.env, q, page);
  return c.json({ users: users.map(publicAdminUser), total, page });
});

adminRoute.get("/api/admin/users/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const user = await getAdminUserDetail(c.env, id);
  if (!user) return c.json({ error: "Not found." }, 404);

  const [oauthIdentities, auditLog] = await Promise.all([listOAuthIdentitiesForUser(c.env, id), listAuditLogForUser(c.env, id)]);

  return c.json({
    user: publicAdminUser(user),
    oauthIdentities: oauthIdentities.map((o) => ({ provider: o.provider, linkedAt: o.created_at })),
    auditLog: auditLog.map((a) => ({
      id: a.id,
      action: a.action,
      adminDisplayName: a.admin_display_name,
      details: a.details,
      createdAt: a.created_at,
    })),
  });
});

adminRoute.post("/api/admin/users/:id/suspend", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  if (id === c.get("userId")) return c.json({ error: "You can't suspend your own account." }, 422);

  await suspendUser(c.env, id);
  await logAdminAction(c.env, c.get("userId"), "suspend_user", id);
  return c.json({ ok: true });
});

adminRoute.post("/api/admin/users/:id/reactivate", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  await reactivateUser(c.env, id);
  await logAdminAction(c.env, c.get("userId"), "reactivate_user", id);
  return c.json({ ok: true });
});

adminRoute.delete("/api/admin/users/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  if (id === c.get("userId")) return c.json({ error: "You can't delete your own account." }, 422);

  const target = await getUserById(c.env, id);
  if (!target) return c.json({ error: "Not found." }, 404);

  // Written before the delete so it captures the email; the FK's
  // ON DELETE SET NULL then nulls target_user_id automatically once the
  // user row is gone, but this text survives in the log either way.
  await logAdminAction(c.env, c.get("userId"), "delete_user", id, `Deleted account ${target.email}`);
  const ok = await deleteUserAccount(c.env, id);
  if (!ok) return c.json({ error: "Not found." }, 404);
  return c.json({ ok: true });
});

adminRoute.post("/api/admin/users/:id/impersonate", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  if (id === c.get("userId")) return c.json({ error: "You can't impersonate yourself." }, 422);

  const target = await getUserById(c.env, id);
  if (!target) return c.json({ error: "Not found." }, 404);
  if (target.suspended_at) return c.json({ error: "This account is suspended." }, 422);

  const cookie = await makeSessionCookie(c.env, target.id, target.token_version, {
    impersonatedBy: c.get("userId"),
    ttlSeconds: 30 * 60,
  });
  c.header("Set-Cookie", cookie);
  await logAdminAction(c.env, c.get("userId"), "impersonate_start", id, `Impersonating ${target.email}`);

  return c.json({ ok: true, user: publicUser(target) });
});

adminRoute.get("/api/admin/moderation", requireAdmin, async (c) => {
  const photos = await listRecentPhotosForModeration(c.env);
  return c.json({
    photos: photos.map((p) => ({
      type: p.type,
      id: p.id,
      imageUrl: `/api/media/${p.r2Key}`,
      userId: p.userId,
      displayName: p.displayName,
      createdAt: p.createdAt,
    })),
  });
});

adminRoute.post("/api/admin/moderation/:type/:id/remove", requireAdmin, async (c) => {
  const type = c.req.param("type");
  if (type !== "post" && type !== "progress_photo") return c.json({ error: "Invalid type." }, 422);

  const id = Number(c.req.param("id"));
  const ok = await removeModeratedPhoto(c.env, type, id);
  if (!ok) return c.json({ error: "Not found." }, 404);
  await logAdminAction(c.env, c.get("userId"), "moderation_remove", null, `Removed ${type} #${id}`);
  return c.json({ ok: true });
});

adminRoute.get("/api/admin/reports", requireAdmin, async (c) => {
  const reports = await listOpenReports(c.env);
  return c.json({
    reports: reports.map((r) => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      targetUserId: r.target_user_id,
      targetName: r.target_name,
      reporterName: r.reporter_name,
      reason: r.reason,
      details: r.details,
      content: r.content,
      createdAt: r.created_at,
    })),
  });
});

adminRoute.post("/api/admin/reports/:id/resolve", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ removeContent?: boolean }>().catch(() => null);
  const removeContent = body?.removeContent === true;
  const ok = await resolveReport(c.env, id, removeContent);
  if (!ok) return c.json({ error: "Not found." }, 404);
  if (removeContent) await logAdminAction(c.env, c.get("userId"), "moderation_remove", null, `Removed content via report #${id}`);
  return c.json({ ok: true });
});
