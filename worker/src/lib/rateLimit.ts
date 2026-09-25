import type { Env } from "../types";

// Generic fixed-window KV rate limiter shared across every auth-adjacent
// route via one RATE_LIMIT_KV namespace with prefixed keys — mirrors
// olavstotijn.nl-worker's adminRateLimit.ts, generalized beyond a single route.
interface Bucket {
  count: number;
  resetAt: number;
}

function keyFor(scope: string, ip: string): string {
  return `ratelimit:${scope}:${ip}`;
}

export async function tooManyAttempts(env: Env, scope: string, ip: string, maxAttempts: number): Promise<boolean> {
  const bucket = await env.RATE_LIMIT_KV.get<Bucket>(keyFor(scope, ip), "json");
  if (!bucket || Date.now() > bucket.resetAt) return false;
  return bucket.count >= maxAttempts;
}

export async function hit(env: Env, scope: string, ip: string, windowMs: number): Promise<void> {
  const key = keyFor(scope, ip);
  const existing = await env.RATE_LIMIT_KV.get<Bucket>(key, "json");
  const now = Date.now();

  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, resetAt }), {
      expirationTtl: Math.ceil(windowMs / 1000),
    });
    return;
  }

  const bucket: Bucket = { count: existing.count + 1, resetAt: existing.resetAt };
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(bucket), {
    expirationTtl: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  });
}

export async function clear(env: Env, scope: string, ip: string): Promise<void> {
  await env.RATE_LIMIT_KV.delete(keyFor(scope, ip));
}
