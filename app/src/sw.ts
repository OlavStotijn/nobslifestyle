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
