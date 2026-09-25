/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { Queue } from "workbox-background-sync";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
self.addEventListener("activate", () => self.clients.claim());

precacheAndRoute(self.__WB_MANIFEST);

// Offline food logging: a failed POST /api/food/logs gets queued to IndexedDB
// and replayed automatically once the connection returns (via the Background
// Sync API where supported, with Workbox's own retry-on-next-fetch fallback
// elsewhere). The page never sees a rejected fetch for this — it gets a 202
// "queued" response immediately and picks the real data up later via the
// "food-log-synced" postMessage below once the queued request actually lands.
const foodLogQueue = new Queue("food-log-queue", {
  onSync: async ({ queue }) => {
    let entry = await queue.shiftRequest();
    while (entry) {
      try {
        await fetch(entry.request.clone());
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) client.postMessage({ type: "food-log-synced" });
      } catch (err) {
        await queue.unshiftRequest(entry);
        throw err;
      }
      entry = await queue.shiftRequest();
    }
  },
});

registerRoute(
  ({ url, request }) => request.method === "POST" && url.pathname === "/api/food/logs",
  async ({ request }) => {
    try {
      return await fetch(request.clone());
    } catch {
      await foodLogQueue.pushRequest({ request });
      return new Response(JSON.stringify({ queued: true }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  "POST"
);

// Push messages carry no payload (see worker/src/lib/webPush.ts) — they're
// just a wake-up signal. The real title/body/link comes from a same-origin
// fetch here, which carries the session cookie automatically.
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let title = "NoBSLifestyle";
      let body = "You have new activity.";
      let link = "/";
      try {
        const res = await fetch("/api/notifications/latest", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          title = data.title ?? title;
          body = data.body ?? body;
          link = data.link ?? link;
        }
      } catch {
        // fall back to the generic text above
      }
      await self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { link },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data as { link?: string } | undefined)?.link ?? "/";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window" });
      const existing = clients.find((c) => "focus" in c);
      if (existing) {
        existing.focus();
        existing.postMessage({ type: "navigate", link });
      } else {
        await self.clients.openWindow(link);
      }
    })()
  );
});
