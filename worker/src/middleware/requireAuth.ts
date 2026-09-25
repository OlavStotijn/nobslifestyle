import type { Context, Next } from "hono";
import type { Env } from "../types";
import { verifySession } from "../lib/session";

export interface AuthVariables {
  userId: number;
}

export async function requireAuth(c: Context<{ Bindings: Env; Variables: AuthVariables }>, next: Next) {
  const session = await verifySession(c.env, c.req.header("Cookie") ?? null);
  if (!session) return c.json({ error: "Not authenticated." }, 401);

  const row = await c.env.DB.prepare("SELECT token_version FROM users WHERE id = ?").bind(session.userId).first<{
    token_version: number;
  }>();
  if (!row || row.token_version !== session.tokenVersion) {
    return c.json({ error: "Session expired, please log in again." }, 401);
  }

  c.set("userId", session.userId);
  await next();
}
