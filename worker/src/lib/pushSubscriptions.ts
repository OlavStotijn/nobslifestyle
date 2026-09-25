import type { Env } from "../types";

export interface PushSubscriptionRow {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function saveSubscription(
  env: Env,
  userId: number,
  params: { endpoint: string; p256dh: string; auth: string }
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`
  )
    .bind(userId, params.endpoint, params.p256dh, params.auth)
    .run();
}

export async function removeSubscription(env: Env, userId: number, endpoint: string): Promise<void> {
  await env.DB.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?").bind(userId, endpoint).run();
}

export async function listSubscriptionsForUser(env: Env, userId: number): Promise<PushSubscriptionRow[]> {
  const { results } = await env.DB.prepare("SELECT * FROM push_subscriptions WHERE user_id = ?").bind(userId).all<PushSubscriptionRow>();
  return results;
}

export async function deleteSubscriptionByEndpoint(env: Env, endpoint: string): Promise<void> {
  await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).run();
}
