import type { Env } from "../types";

export async function isUserPro(env: Env, userId: number): Promise<boolean> {
  const row = await env.DB.prepare("SELECT pro_until FROM users WHERE id = ?").bind(userId).first<{ pro_until: string | null }>();
  return row?.pro_until != null && row.pro_until > new Date().toISOString();
}

// Report trend windows: Basic sees a recent window, Pro sees full history.
// Enforced here (not just a client-side default) so the cap is real.
export async function maxTrendWeeks(env: Env, userId: number, basicWeeks: number): Promise<number> {
  return (await isUserPro(env, userId)) ? 52 : basicWeeks;
}
