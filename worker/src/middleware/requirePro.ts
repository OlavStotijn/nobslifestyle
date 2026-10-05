import type { Context, Next } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "./requireAuth";

// Register after requireAuth (needs c.get("userId") already set).
export async function requirePro(c: Context<{ Bindings: Env; Variables: AuthVariables }>, next: Next) {
  const row = await c.env.DB.prepare("SELECT pro_until FROM users WHERE id = ?")
    .bind(c.get("userId"))
    .first<{ pro_until: string | null }>();

  const isPro = row?.pro_until != null && row.pro_until > new Date().toISOString();
  if (!isPro) return c.json({ error: "This feature requires Pro." }, 403);

  await next();
}
