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
import { getUserById } from "../lib/users";
import { hasOAuthIdentity } from "../lib/oauthIdentities";
import { verifyPassword } from "../lib/passwordHash";

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
  password: string;
  confirm: string;
}

// Self-service account deletion (App Store guideline 5.1.1(v)). Accounts
// with a real password re-confirm with it; Google/Apple sign-in accounts
// have no password the owner could ever type (it's set to a random
// placeholder — see completeOAuthSignIn), so they fall back to typing
// "DELETE" instead.
safetyRoute.delete("/api/account", async (c) => {
  if (c.get("impersonatedBy")) return c.json({ error: "Not available while impersonating." }, 403);

  const userId = c.get("userId");
  const user = await getUserById(c.env, userId);
  if (!user) return c.json({ error: "Not found." }, 404);

  const body = await c.req.json<Partial<DeleteAccountBody>>().catch(() => null);

  if (await hasOAuthIdentity(c.env, userId)) {
    if (body?.confirm !== "DELETE") return c.json({ error: 'Type "DELETE" to confirm.' }, 422);
  } else {
    if (!body?.password || !verifyPassword(body.password, user.password_hash)) {
      return c.json({ error: "Incorrect password." }, 422);
    }
  }

  await deleteOwnAccount(c.env, userId);
  c.header("Set-Cookie", clearSessionCookie(c.env));
  return c.json({ ok: true });
});
