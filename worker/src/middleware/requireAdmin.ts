import type { Context, Next } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "./requireAuth";

// Runs after requireAuth. Checked against the *current* session's user —
// since impersonation swaps userId to the target, this only ever passes
// pre-impersonation or after returning: you can't reach /api/admin/* while
// wearing someone else's session.
export async function requireAdmin(c: Context<{ Bindings: Env; Variables: AuthVariables }>, next: Next) {
  const row = await c.env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(c.get("userId")).first<{ email: string }>();
  if (!row || row.email.toLowerCase() !== c.env.ADMIN_EMAIL.toLowerCase()) {
    return c.json({ error: "Not authorized." }, 403);
  }
  await next();
}
