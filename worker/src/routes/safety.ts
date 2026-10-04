import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import {
  REPORT_REASONS,
  blockUser,
  createReport,
  deleteOwnAccount,
  listBlockedUsers,
  unblockUser,
  type ReportReason,
  type ReportTargetType,
} from "../lib/safety";
import { clearSessionCookie } from "../lib/session";

export const safetyRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

safetyRoute.use("/api/blocks*", requireAuth);
safetyRoute.use("/api/reports", requireAuth);
safetyRoute.use("/api/account", requireAuth);

safetyRoute.get("/api/blocks", async (c) => {
  return c.json({ users: await listBlockedUsers(c.env, c.get("userId")) });
});

safetyRoute.post("/api/blocks/:userId", async (c) => {
  const result = await blockUser(c.env, c.get("userId"), Number(c.req.param("userId")));
  if (result === "self") return c.json({ error: "You can't block yourself." }, 422);
  if (result === "not_found") return c.json({ error: "User not found." }, 404);
  return c.json({ ok: true });
});

safetyRoute.delete("/api/blocks/:userId", async (c) => {
  await unblockUser(c.env, c.get("userId"), Number(c.req.param("userId")));
  return c.json({ ok: true });
});

interface ReportBody {
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  details?: string;
}

safetyRoute.post("/api/reports", async (c) => {
  const body = await c.req.json<Partial<ReportBody>>().catch(() => null);
  if (
    !body ||
    !["post", "comment", "user"].includes(body.targetType ?? "") ||
    !Number.isInteger(body.targetId) ||
    !REPORT_REASONS.includes(body.reason as ReportReason)
  ) {
    return c.json({ error: "targetType, targetId and a valid reason are required." }, 422);
  }

  const details = body.details?.trim().slice(0, 500) || null;
  const result = await createReport(c.env, c.get("userId"), body.targetType!, body.targetId!, body.reason!, details);
  if (result === "not_found") return c.json({ error: "Not found." }, 404);
  if (result === "self") return c.json({ error: "You can't report your own content." }, 422);
  return c.json({ ok: true }, 201);
});

interface DeleteAccountBody {
  confirm: string;
}

// Self-service account deletion (App Store guideline 5.1.1(v)).
safetyRoute.delete("/api/account", async (c) => {
  if (c.get("impersonatedBy")) return c.json({ error: "Not available while impersonating." }, 403);

  const body = await c.req.json<Partial<DeleteAccountBody>>().catch(() => null);
  if (body?.confirm !== "DELETE") return c.json({ error: 'Type "DELETE" to confirm.' }, 422);

  await deleteOwnAccount(c.env, c.get("userId"));
  c.header("Set-Cookie", clearSessionCookie(c.env));
  return c.json({ ok: true });
});
