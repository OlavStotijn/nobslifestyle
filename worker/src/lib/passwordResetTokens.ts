import type { Env } from "../types";

// SHA-256(plaintext) === stored hash, same shape as sanctumTokens.ts's
// token-verification approach, applied to single-use reset links instead of
// long-lived bearer tokens.
const TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TTL_MS = 60 * 60 * 1000; // 1 hour

function randomPlainToken(length = 40): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createPasswordResetToken(env: Env, userId: number): Promise<string> {
  const plainText = randomPlainToken();
  const hash = await sha256Hex(plainText);
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  await env.DB.prepare("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)")
    .bind(userId, hash, expiresAt)
    .run();

  return plainText;
}

export async function consumePasswordResetToken(env: Env, plainText: string): Promise<number | null> {
  const hash = await sha256Hex(plainText);
  const row = await env.DB.prepare(
    "SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?"
  )
    .bind(hash)
    .first<{ id: number; user_id: number; expires_at: string; used_at: string | null }>();

  if (!row || row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await env.DB.prepare("UPDATE password_reset_tokens SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?")
    .bind(row.id)
    .run();

  return row.user_id;
}
