import type { Context, Next } from "hono";
import type { Env } from "../types";
import { verifySession } from "../lib/session";

export interface AuthVariables {
  userId: number;
  impersonatedBy: number | null;
}

// Avoid a write on every single request: only refresh last_seen_at once per
// window per user. Module-scope, so it's a best-effort per-isolate cache,
// not a correctness guarantee — a cold isolate just writes once more.
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;
const lastSeenWrites = new Map<number, number>();

function touchLastSeen(env: Env, userId: number): void {
  const now = Date.now();
  const last = lastSeenWrites.get(userId);
  if (last != null && now - last < LAST_SEEN_THROTTLE_MS) return;
  lastSeenWrites.set(userId, now);
  env.DB.prepare("UPDATE users SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
    .bind(userId)
    .run()
    .catch((err) => console.error("touchLastSeen failed", err));
}

export async function requireAuth(c: Context<{ Bindings: Env; Variables: AuthVariables }>, next: Next) {
  const session = await verifySession(c.env, c.req.header("Cookie") ?? null);
  if (!session) return c.json({ error: "Not authenticated." }, 401);

  const row = await c.env.DB.prepare("SELECT token_version, suspended_at FROM users WHERE id = ?").bind(session.userId).first<{
    token_version: number;
    suspended_at: string | null;
  }>();
  if (!row || row.token_version !== session.tokenVersion) {
    return c.json({ error: "Session expired, please log in again." }, 401);
  }
  if (row.suspended_at) {
    return c.json({ error: "This account has been suspended." }, 401);
  }

  c.set("userId", session.userId);
  c.set("impersonatedBy", session.impersonatedBy ?? null);
  c.executionCtx.waitUntil(Promise.resolve(touchLastSeen(c.env, session.userId)));
  await next();
}
