import type { Context, Next } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "./requireAuth";
import { isUserPro } from "../lib/proStatus";

// Register after requireAuth (needs c.get("userId") already set).
export async function requirePro(c: Context<{ Bindings: Env; Variables: AuthVariables }>, next: Next) {
  if (!(await isUserPro(c.env, c.get("userId")))) {
    return c.json({ error: "This feature requires Pro." }, 403);
  }
  await next();
}
