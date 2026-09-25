import { Hono } from "hono";
import type { Env } from "../types";
import type { AuthVariables } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";
import { countUnread, getLatestNotification, listNotifications, markAllRead, publicNotification } from "../lib/notifications";
import { removeSubscription, saveSubscription } from "../lib/pushSubscriptions";

export const notificationsRoute = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

notificationsRoute.use("/api/notifications*", requireAuth);
notificationsRoute.use("/api/push/*", requireAuth);

notificationsRoute.get("/api/notifications", async (c) => {
  const [notifications, unreadCount] = await Promise.all([
    listNotifications(c.env, c.get("userId")),
    countUnread(c.env, c.get("userId")),
  ]);
  return c.json({ notifications: notifications.map(publicNotification), unreadCount });
});

// Fetched by the service worker's `push` event handler (payload-less push,
// see lib/webPush.ts) to build the actual notification text.
notificationsRoute.get("/api/notifications/latest", async (c) => {
  const row = await getLatestNotification(c.env, c.get("userId"));
  if (!row) return c.json({ title: "NoBSLifestyle", body: "You have new activity.", link: "/" });
  return c.json(publicNotification(row));
});

notificationsRoute.post("/api/notifications/read", async (c) => {
  await markAllRead(c.env, c.get("userId"));
  return c.json({ ok: true });
});

interface SubscribeBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

notificationsRoute.get("/api/push/vapid-public-key", async (c) => c.json({ publicKey: c.env.VAPID_PUBLIC_KEY }));

notificationsRoute.post("/api/push/subscribe", async (c) => {
  const body = await c.req.json<Partial<SubscribeBody>>().catch(() => null);
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: "endpoint and keys are required." }, 422);
  }
  await saveSubscription(c.env, c.get("userId"), { endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth });
  return c.json({ ok: true });
});

notificationsRoute.post("/api/push/unsubscribe", async (c) => {
  const body = await c.req.json<{ endpoint?: string }>().catch(() => null);
  if (!body?.endpoint) return c.json({ error: "endpoint is required." }, 422);
  await removeSubscription(c.env, c.get("userId"), body.endpoint);
  return c.json({ ok: true });
});
