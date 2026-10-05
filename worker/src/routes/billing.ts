import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { createCheckoutToken, consumeCheckoutToken } from "../lib/checkoutTokens";
import { startSubscription, handlePaymentWebhook, cancelSubscription } from "../lib/billing";
import { makeSessionCookie } from "../lib/session";
import { getUserById } from "../lib/users";

export const billingRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

billingRoute.use("/api/billing/checkout-token", requireAuth);
billingRoute.use("/api/billing/subscribe", requireAuth);
billingRoute.use("/api/billing/cancel", requireAuth);

// Called from the native app: issues a short-lived token the website can
// redeem for a logged-in session, so the user never has to re-enter
// credentials in the external browser Mollie's checkout needs.
billingRoute.post("/api/billing/checkout-token", async (c) => {
  const token = await createCheckoutToken(c.env, c.get("userId"));
  // Points at the bridge route (sets the session cookie), not /upgrade
  // directly — by the time the SPA loads, the cookie is already set and
  // /upgrade is just a normal logged-in page, no token-handling of its own.
  return c.json({ url: `${c.env.APP_URL}/api/billing/bridge?token=${token}` });
});

// Consumed by the website's /upgrade page on load (public — the token
// itself is the credential). Sets the normal session cookie and redirects
// into the SPA, same as a successful login would.
billingRoute.get("/api/billing/bridge", async (c) => {
  const token = c.req.query("token");
  const userId = token ? await consumeCheckoutToken(c.env, token) : null;
  if (!userId) return c.redirect("/upgrade?error=invalid_token");

  const user = await getUserById(c.env, userId);
  if (!user) return c.redirect("/upgrade?error=invalid_token");

  const cookie = await makeSessionCookie(c.env, user.id, user.token_version);
  c.header("Set-Cookie", cookie);
  return c.redirect("/upgrade");
});

billingRoute.post("/api/billing/subscribe", async (c) => {
  try {
    const result = await startSubscription(c.env, c.get("userId"));
    return c.json(result);
  } catch (err) {
    console.error("startSubscription failed", err);
    return c.json({ error: "Couldn't start checkout. Please try again." }, 502);
  }
});

billingRoute.post("/api/billing/cancel", async (c) => {
  await cancelSubscription(c.env, c.get("userId"));
  return c.json({ ok: true });
});

// Public — this is Mollie's server calling us, not a logged-in user. The
// payment is always re-fetched from Mollie's API before acting on it (see
// handlePaymentWebhook), since this body is unauthenticated.
billingRoute.post("/api/billing/webhook", async (c) => {
  const body = await c.req.parseBody().catch(() => null);
  const paymentId = body?.id;
  if (typeof paymentId !== "string") return c.json({ error: "Missing payment id." }, 422);

  try {
    await handlePaymentWebhook(c.env, paymentId);
  } catch (err) {
    console.error("handlePaymentWebhook failed", err);
    // Still 200 — Mollie retries on non-2xx, and a transient failure here
    // (e.g. Mollie API hiccup) will resolve on the next retry.
  }
  return c.text("ok");
});
