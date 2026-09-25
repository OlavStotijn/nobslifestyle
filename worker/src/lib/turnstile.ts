import type { Env } from "../types";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(env: Env, token: string | undefined, ip: string): Promise<boolean> {
  if (env.ENVIRONMENT === "development") return true; // no real Turnstile widget in local dev
  if (!token) return false;

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip });
  const res = await fetch(VERIFY_URL, { method: "POST", body });
  if (!res.ok) return false;

  const data = await res.json<{ success: boolean }>();
  return data.success === true;
}
