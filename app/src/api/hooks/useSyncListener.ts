import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Listens for the "food-log-synced" postMessage the service worker sends
// (see src/sw.ts) once a queued offline food log successfully replays —
// invalidating here is what makes the diary/summary pick up the real synced
// entry without the user having to do anything once they're back online.
export function useSyncListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "food-log-synced") {
        queryClient.invalidateQueries({ queryKey: ["food-logs"] });
        queryClient.invalidateQueries({ queryKey: ["food-summary"] });
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [queryClient]);
}
