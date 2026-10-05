import type { Env } from "../types";
import { getUserById } from "./users";
import * as mollie from "./mollie";

// Single Pro price — change here if it ever changes; Mollie amounts must be
// exact strings with 2 decimals.
export const PRO_PRICE: mollie.MollieAmount = { currency: "EUR", value: "4.99" };
const PRO_DESCRIPTION = "NoBSLifestyle Pro — monthly subscription";
const SUBSCRIPTION_INTERVAL = "1 month";

export async function startSubscription(env: Env, userId: number): Promise<{ checkoutUrl: string }> {
  const user = await getUserById(env, userId);
  if (!user) throw new Error("User not found.");

  let customerId = user.mollie_customer_id;
  if (!customerId) {
    const customer = await mollie.createCustomer(env, user.display_name, user.email);
    customerId = customer.id;
    await env.DB.prepare("UPDATE users SET mollie_customer_id = ? WHERE id = ?").bind(customerId, userId).run();
  }

  const payment = await mollie.createFirstPayment(env, {
    customerId,
    amount: PRO_PRICE,
    description: PRO_DESCRIPTION,
    redirectUrl: `${env.APP_URL}/upgrade/complete`,
    webhookUrl: `${env.APP_URL}/api/billing/webhook`,
    metadata: { userId },
  });

  const checkoutUrl = payment._links.checkout?.href;
  if (!checkoutUrl) throw new Error("Mollie did not return a checkout URL.");
  return { checkoutUrl };
}

// Extends from the later of "now" or the current pro_until, so renewing
// early (or a webhook firing a little late) never shortens what's already
// been paid for.
function extendOneMonth(fromIso: string | null): string {
  const base = fromIso && fromIso > new Date().toISOString() ? new Date(fromIso) : new Date();
  base.setUTCMonth(base.getUTCMonth() + 1);
  return base.toISOString();
}

// Mollie's webhook body is just { id } — the payment is always re-fetched
// from Mollie's API (authenticated with our own secret key) rather than
// trusted from the request, since payment webhooks aren't HMAC-signed.
export async function handlePaymentWebhook(env: Env, paymentId: string): Promise<void> {
  const payment = await mollie.getPayment(env, paymentId);
  if (payment.status !== "paid") return;

  const metaUserId = Number((payment.metadata as { userId?: number } | null)?.userId);
  if (!Number.isInteger(metaUserId)) return;

  const user = await getUserById(env, metaUserId);
  if (!user) return;
  // Defense in depth: only act on a payment that matches what we actually
  // charge for, even though metadata.userId already scopes it to one account.
  if (payment.amount.value !== PRO_PRICE.value || payment.amount.currency !== PRO_PRICE.currency) return;

  if (payment.sequenceType === "first") {
    if (!payment.customerId) return;
    const subscription = await mollie.createSubscription(env, payment.customerId, {
      amount: PRO_PRICE,
      interval: SUBSCRIPTION_INTERVAL,
      description: PRO_DESCRIPTION,
      webhookUrl: `${env.APP_URL}/api/billing/webhook`,
    });
    await env.DB.prepare("UPDATE users SET mollie_subscription_id = ?, pro_until = ? WHERE id = ?")
      .bind(subscription.id, extendOneMonth(null), metaUserId)
      .run();
  } else if (payment.subscriptionId) {
    await env.DB.prepare("UPDATE users SET pro_until = ? WHERE id = ?")
      .bind(extendOneMonth(user.pro_until), metaUserId)
      .run();
  }
  // Failed/expired/canceled payments are a no-op — pro_until isn't touched,
  // so access simply lapses on its own once it runs out. No retry/grace-
  // period logic in v1.
}

export async function cancelSubscription(env: Env, userId: number): Promise<void> {
  const user = await getUserById(env, userId);
  if (!user?.mollie_customer_id || !user.mollie_subscription_id) return;
  await mollie.cancelSubscription(env, user.mollie_customer_id, user.mollie_subscription_id);
  // pro_until is left alone — access continues until the period already
  // paid for ends, standard cancellation UX.
  await env.DB.prepare("UPDATE users SET mollie_subscription_id = NULL WHERE id = ?").bind(userId).run();
}
