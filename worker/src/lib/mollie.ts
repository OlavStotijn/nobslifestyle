import type { Env } from "../types";

const BASE_URL = "https://api.mollie.com/v2";

async function mollieFetch<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MOLLIE_API_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = (data as { detail?: string } | null)?.detail ?? `HTTP ${res.status}`;
    throw new Error(`Mollie API error: ${detail}`);
  }
  return data as T;
}

export interface MollieAmount {
  currency: string;
  value: string;
}

export interface MollieCustomer {
  id: string;
}

export interface MolliePayment {
  id: string;
  status: "open" | "canceled" | "pending" | "authorized" | "expired" | "failed" | "paid";
  sequenceType: "oneoff" | "first" | "recurring";
  customerId: string | null;
  subscriptionId: string | null;
  amount: MollieAmount;
  metadata: Record<string, unknown> | null;
  _links: { checkout?: { href: string } };
}

export interface MollieSubscription {
  id: string;
  status: string;
}

export function createCustomer(env: Env, name: string, email: string): Promise<MollieCustomer> {
  return mollieFetch(env, "/customers", { method: "POST", body: JSON.stringify({ name, email }) });
}

export function createFirstPayment(
  env: Env,
  opts: {
    customerId: string;
    amount: MollieAmount;
    description: string;
    redirectUrl: string;
    webhookUrl: string;
    metadata: Record<string, unknown>;
  }
): Promise<MolliePayment> {
  return mollieFetch(env, "/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: opts.amount,
      description: opts.description,
      redirectUrl: opts.redirectUrl,
      webhookUrl: opts.webhookUrl,
      customerId: opts.customerId,
      sequenceType: "first",
      metadata: opts.metadata,
    }),
  });
}

export function getPayment(env: Env, paymentId: string): Promise<MolliePayment> {
  return mollieFetch(env, `/payments/${paymentId}`);
}

export function createSubscription(
  env: Env,
  customerId: string,
  opts: { amount: MollieAmount; interval: string; description: string; webhookUrl: string }
): Promise<MollieSubscription> {
  return mollieFetch(env, `/customers/${customerId}/subscriptions`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function cancelSubscription(env: Env, customerId: string, subscriptionId: string): Promise<void> {
  await mollieFetch(env, `/customers/${customerId}/subscriptions/${subscriptionId}`, { method: "DELETE" });
}
