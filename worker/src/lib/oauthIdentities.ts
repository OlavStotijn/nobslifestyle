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
