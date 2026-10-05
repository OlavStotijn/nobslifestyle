import type { Env } from "../types";

export type OAuthProvider = "google" | "apple";

export async function findUserIdByOAuthIdentity(
  env: Env,
  provider: OAuthProvider,
  providerUserId: string
): Promise<number | null> {
  const row = await env.DB.prepare("SELECT user_id FROM oauth_identities WHERE provider = ? AND provider_user_id = ?")
    .bind(provider, providerUserId)
    .first<{ user_id: number }>();
  return row?.user_id ?? null;
}

// Google/Apple sign-in sets the user's password_hash to a random,
// never-typeable placeholder (see completeOAuthSignIn in routes/auth.ts), so
// those accounts can't use a "re-type your password" confirmation for
// destructive actions — they need the text-confirmation fallback instead.
export async function hasOAuthIdentity(env: Env, userId: number): Promise<boolean> {
  const row = await env.DB.prepare("SELECT 1 FROM oauth_identities WHERE user_id = ? LIMIT 1").bind(userId).first();
  return row != null;
}

export async function linkOAuthIdentity(
  env: Env,
  userId: number,
  provider: OAuthProvider,
  providerUserId: string
): Promise<void> {
  await env.DB.prepare("INSERT INTO oauth_identities (user_id, provider, provider_user_id) VALUES (?, ?, ?)")
    .bind(userId, provider, providerUserId)
    .run();
}
